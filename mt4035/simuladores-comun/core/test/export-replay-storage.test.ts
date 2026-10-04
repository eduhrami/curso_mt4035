/** Exportación, checksum, replay y persistencia (SCM-PER / LOG-PER genéricos). */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { createEngine } from "../src/engine.ts";
import { buildExport, canonicalJson, kpiRows, parseExport, toCSV, verifyChecksum } from "../src/export.ts";
import { replay } from "../src/replay.ts";
import { MemoryStorage, openStorage, RunRepository, type KeyValueStorage } from "../src/storage.ts";
import { playGame } from "../src/testing.ts";
import { makeToyModel, toyConfig, toyParams, type ToyState } from "./fixtures/toy-model.ts";
import type { GameState } from "../src/types.ts";

const engine = createEngine(makeToyModel(), toyParams);
const versions = { simVersion: "0.0.1", paramsVersion: "p1" };
const policy = (_s: GameState<ToyState>, e: number) => (e === 0 ? { "D-02": true } : e === 2 ? { "D-01": 3, "D-05": true } : {});
const opts = { runId: "run-1", createdAt: "2026-10-03T00:00:00.000Z" };

describe("exportación y checksum", () => {
  it("el JSON cumple el esquema y el checksum verifica", async () => {
    const { state } = playGame(engine, toyConfig(21), policy);
    const exp = await buildExport(state, opts);
    expect(parseExport(JSON.stringify(exp), "toy")).toEqual({ ok: true, value: exp });
    expect(await verifyChecksum(exp)).toBe(true);
    expect(exp.decisions).toEqual([
      { epoch: 0, changes: { "D-02": true } },
      { epoch: 2, changes: { "D-01": 3, "D-05": true } },
    ]);
  });

  it("canonicalJson no depende del orden de llaves", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { f: 1, e: 0 }] } })).toBe(canonicalJson({ a: { c: [3, { e: 0, f: 1 }], d: 2 }, b: 1 }));
  });

  it("una alteración manual se detecta por checksum y por replay (PER-04)", async () => {
    const { state } = playGame(engine, toyConfig(21), policy);
    const exp = await buildExport(state, opts);
    const tampered = structuredClone(exp);
    tampered.kpis[1]!.values.OSA = 0.999;
    expect(await verifyChecksum(tampered)).toBe(false);
    const r = await replay(engine, tampered, versions);
    expect(r.ok).toBe(false);
    expect(r.checksumOk).toBe(false);
    expect(r.kpiDiffs).toEqual([expect.objectContaining({ epoch: 1, kpi: "OSA", expected: 0.999 })]);
  });

  it("rechaza JSON inválido o de otro simulador (PER-06)", () => {
    expect(parseExport("{no json").ok).toBe(false);
    expect(parseExport({ format: "otro" }).ok).toBe(false);
  });

  it("CSV: una fila por época, valores iguales al JSON y escape correcto (PER-05)", async () => {
    const { state } = playGame(engine, toyConfig(21), policy);
    const exp = await buildExport(state, opts);
    const csv = toCSV(kpiRows(exp));
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(1 + 4);
    const header = lines[0]!.split(",");
    expect(Number(lines[2]!.split(",")[header.indexOf("OSA")])).toBe(exp.kpis[1]!.values.OSA);
    expect(toCSV([{ a: 'x,"y"', b: null }])).toBe('a,b\n"x,""y""",\n');
  });
});

describe("replay (PER-03)", () => {
  it("repetir una corrida exportada reproduce KPIs y eventos exactamente", async () => {
    const { state } = playGame(engine, toyConfig(33), policy);
    const r = await replay(engine, await buildExport(state, opts), versions);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r.state!.history)).toBe(JSON.stringify(state.history));
  });

  it("propiedad: cualquier semilla y política válida aleatoria se repite sin diferencias", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 0xffffffff }), fc.array(fc.record({ freq: fc.integer({ min: 1, max: 3 }), fridge: fc.boolean() }), { minLength: 4, maxLength: 4 }), async (seed, plan) => {
        const pol = (s: GameState<ToyState>, e: number) => {
          const step = plan[e]!;
          const changes: Record<string, unknown> = { "D-01": step.freq };
          if (step.fridge && engine.effectiveValue(s, "D-02") !== true) changes["D-02"] = true;
          return changes;
        };
        const { state } = playGame(engine, toyConfig(seed), pol);
        const r = await replay(engine, await buildExport(state, opts), versions);
        return r.ok;
      }),
      { numRuns: 40 },
    );
  });

  it("detecta versión distinta y simulador distinto", async () => {
    const { state } = playGame(engine, toyConfig(1));
    const exp = await buildExport(state, opts);
    const v = await replay(engine, exp, { simVersion: "9.9.9", paramsVersion: "p1" });
    expect(v.versionOk).toBe(false);
    expect(v.ok).toBe(false);
    const other = await replay(engine, { ...exp, sim: "otro" }, versions);
    expect(other.simOk).toBe(false);
  });

  it("una partida incompleta también se puede exportar y repetir", async () => {
    const { state } = playGame(engine, toyConfig(8), policy, 2);
    const exp = await buildExport(state, opts);
    expect(exp.epochsPlayed).toBe(2);
    expect((await replay(engine, exp, versions)).ok).toBe(true);
  });
});

describe("persistencia (PER-01/02/07)", () => {
  const handle = () => openStorage(() => new MemoryStorage());

  it("guardar y recargar devuelve el mismo objeto", async () => {
    const repo = new RunRepository<unknown>(handle(), "mt4035.toy.runs.v1", 1);
    const { state } = playGame(engine, toyConfig(3), policy);
    const exp = await buildExport(state, opts);
    expect(repo.save({ id: "a", savedAt: opts.createdAt, title: "Corrida A", data: exp })).toBe(true);
    expect(repo.get("a")?.data).toEqual(exp);
  });

  it("borrar una corrida deja intactas las demás", () => {
    const repo = new RunRepository<number>(handle(), "k", 1);
    repo.save({ id: "a", savedAt: "", title: "A", data: 1 });
    repo.save({ id: "b", savedAt: "", title: "B", data: 2 });
    repo.save({ id: "a", savedAt: "", title: "A2", data: 3 }); // sobrescribe "a"
    repo.remove("a");
    expect(repo.list().map((r) => [r.id, r.data])).toEqual([["b", 2]]);
  });

  it("localStorage que lanza error ⇒ respaldo en memoria, persistent=false y el juego sigue", () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
      removeItem: () => {},
    };
    const h = openStorage(() => broken);
    expect(h.persistent).toBe(false);
    expect(h.reason).toMatch(/SecurityError/);
    const repo = new RunRepository<number>(h, "k", 1);
    expect(repo.save({ id: "a", savedAt: "", title: "A", data: 1 })).toBe(true);
    expect(repo.list()).toHaveLength(1);
    expect(openStorage(() => undefined).persistent).toBe(false);
  });

  it("almacenamiento que falla al escribir (cuota llena): save devuelve false con lastError", () => {
    const full: KeyValueStorage = Object.assign(new MemoryStorage(), {});
    const h = openStorage(() => full);
    full.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    const repo = new RunRepository<number>(h, "k", 1);
    expect(repo.save({ id: "a", savedAt: "", title: "A", data: 1 })).toBe(false);
    expect(repo.lastError).toMatch(/QuotaExceeded/);
  });

  it("JSON corrupto en almacenamiento: list() devuelve [] con lastError; migración de versiones", () => {
    const mem = new MemoryStorage();
    mem.setItem("k", "{corrupto");
    const repo = new RunRepository<number>(openStorage(() => mem), "k", 2);
    expect(repo.list()).toEqual([]);
    expect(repo.lastError).toMatch(/leer/);
    mem.setItem("k", JSON.stringify({ schemaVersion: 1, runs: [{ id: "v1", schemaVersion: 1, savedAt: "", title: "vieja", data: 5 }] }));
    const migrated = new RunRepository<number>(openStorage(() => mem), "k", 2, (r) => ({ ...r, schemaVersion: 2, data: (r.data as number) * 10 }));
    expect(migrated.list()).toEqual([{ id: "v1", schemaVersion: 2, savedAt: "", title: "vieja", data: 50 }]);
    expect(new RunRepository<number>(openStorage(() => mem), "k", 2).list()).toEqual([]); // sin migración: se omite
  });
});
