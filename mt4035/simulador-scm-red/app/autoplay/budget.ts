/**
 * Tope de gasto anual en decisiones (AD-43) en el auto-juego: el bot invierte como un equipo. Lo que cabe en el año se
 * ejecuta de inmediato; lo que no, se difiere y se reintenta en el primer trimestre (T1) de cada año, cuando el tope se
 * renueva. Prioridad por plazo de impacto, porque lo que tarda más en rendir debe decidirse antes para recuperarse
 * dentro de la partida: red de CD (cada cambio por separado), POS, escaneo, cierres de tiendas y aperturas. Lo que
 * depende de algo diferido (p. ej. flujos por un CD que aún no se construye) también se difiere.
 */
import type { DecisionChanges, GameState } from "@mt4035/sim-core";
import type { Policy } from "@mt4035/sim-core/testing";
import { capexBudget, createScmEngine, type DcSpec, type ScmState } from "../src/index.ts";

const engine = createScmEngine();
const specs = new Map(engine.model.decisions.map((d) => [d.id, d]));
const PRIORITY = ["D-01", "D-30", "D-23", "D-09", "D-08"];
const SIZES = ["large", "medium", "small"] as const;

/** Costo inmediato de la decisión (todas las decisiones con costo consumen el tope). */
const costOf = (s: GameState<ScmState>, id: string, v: unknown) => specs.get(id)?.cost?.(v as never, s.model, engine.params) ?? 0;
const specsOf = (dcs: readonly DcSpec[]): DcSpec[] => dcs.map(({ id, zone, type, size }) => ({ id, zone, type, size }));

export function withBudget(pol: Policy<ScmState>): Policy<ScmState> {
  let deferred: DecisionChanges = {};
  return (s, e) => {
    const b = capexBudget(s);
    // Lo diferido se reintenta en T1, cuando el tope se renueva; lo nuevo de la política se intenta ya.
    const retry = e % 4 === 0 ? deferred : {};
    if (e % 4 === 0) deferred = {};
    const wanted: DecisionChanges = { ...retry, ...pol(s, e) };
    if (!b) return wanted;
    let remaining = b.remaining;
    const out: DecisionChanges = {};
    for (const [id, v] of Object.entries(wanted)) if (!PRIORITY.includes(id) && costOf(s, id, v) <= 0) out[id] = v;
    for (const id of PRIORITY) {
      if (!(id in wanted)) continue;
      const v = wanted[id];
      if (id === "D-01") {
        // Red objetivo por pasos (conversiones o ampliaciones, cierres y CD nuevos, en ese orden) mientras quepan.
        const now = specsOf(s.model.dcs);
        const current = new Set(now.map((d) => d.id));
        // Un CD nuevo que no cabe ni con el tope completo baja al tamaño más grande que sí cabe.
        const fit = (d: DcSpec): DcSpec => {
          if (current.has(d.id)) return d;
          const ok = SIZES.slice(SIZES.indexOf(d.size)).find((size) => costOf(s, id, [...now, { ...d, size }]) - costOf(s, id, now) <= b.budget);
          return ok ? { ...d, size: ok } : d;
        };
        const target = (v as DcSpec[]).map(fit);
        const steps: ((n: DcSpec[]) => DcSpec[])[] = [
          ...target.filter((d) => current.has(d.id)).map((d) => (n: DcSpec[]) => n.map((x) => (x.id === d.id ? d : x))),
          ...now.filter((d) => !target.some((t) => t.id === d.id)).map((d) => (n: DcSpec[]) => n.filter((x) => x.id !== d.id)),
          ...target.filter((d) => !current.has(d.id)).map((d) => (n: DcSpec[]) => [...n, d]),
        ];
        let partial = now;
        let pending = false;
        for (const step of steps) {
          const next = step(partial);
          if (JSON.stringify(next) === JSON.stringify(partial)) continue;
          if (costOf(s, id, next) <= remaining) partial = next;
          else pending = true;
        }
        if (JSON.stringify(partial) !== JSON.stringify(now)) {
          out[id] = partial;
          remaining -= costOf(s, id, partial);
        }
        if (pending) deferred[id] = target;
        continue;
      }
      const c = costOf(s, id, v);
      if (c <= remaining) {
        out[id] = v;
        remaining -= c;
      } else deferred[id] = v;
    }
    // Lo que depende de algo diferido no valida todavía: se difiere también.
    for (let i = 0; i < 10; i++) {
      const errs = engine.validate(s, out).errors;
      if (!errs.length) break;
      for (const er of errs) {
        if (er.id in out) {
          if (!(er.id in deferred)) deferred[er.id] = wanted[er.id];
          delete out[er.id];
        }
      }
    }
    return out;
  };
}
