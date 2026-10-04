/**
 * Modelo de juguete para probar sim-core sin depender de los modelos reales.
 * Una tienda con reposición, inventario, merma, un evento de spoilage, un pico de demanda
 * y una regla de pérdida de confianza. Tiene decisiones con retraso, costo, dependencias,
 * irreversibilidad y límite de cambios para cubrir todo el contrato del motor.
 */
import { z } from "zod";
import type { ModelDef } from "../../src/types.ts";

export interface ToyState {
  stock: number;
  trust: number;
  freq: number;
  capacity: number;
  fridge: boolean;
  pos: boolean;
  strategy: "a" | "b";
}

export interface ToyParams {
  baseDemand: number;
  demandSd: number;
  unitsPerDelivery: number;
  wasteThreshold: number;
  lostThreshold: number;
}

export const toyParams: ToyParams = { baseDemand: 100, demandSd: 20, unitsPerDelivery: 40, wasteThreshold: 150, lostThreshold: 20 };

export const TOY_TICKS = [5, 6, 5, 6];

export function makeToyModel(epochs = 4): ModelDef<ToyState, ToyParams> {
  return {
    id: "toy",
    version: "0.0.1",
    calendar: {
      epochs,
      ticksPerEpoch: (e) => TOY_TICKS[e % TOY_TICKS.length]!,
      label: (e) => `E${e + 1}`,
    },
    decisions: [
      {
        id: "D-01",
        label: "Frecuencia de reposición",
        schema: z.number().int().min(1).max(3),
        current: (s) => s.freq,
        apply: (s, v) => {
          s.freq = v;
        },
        kpis: ["OSA", "WASTE"],
      },
      {
        id: "D-02",
        label: "Refrigerador",
        schema: z.boolean(),
        current: (s) => s.fridge,
        lag: () => 1,
        cost: (v) => (v ? 100 : 0),
        irreversible: true,
        validate: (v, view) => (!v && view.previous("D-02") === true ? "No se puede quitar el refrigerador" : null),
        apply: (s, v) => {
          s.fridge = v;
        },
        kpis: ["WASTE"],
      },
      {
        id: "D-03",
        label: "Capacidad",
        schema: z.number().int().min(100).max(500),
        current: (s) => s.capacity,
        lag: () => 2,
        cost: (v, s) => Math.max(0, v - s.capacity),
        validate: (v, view) => (v < (view.previous("D-03") as number) ? "Solo se permite ampliar la capacidad" : null),
        apply: (s, v) => {
          s.capacity = v;
        },
        kpis: ["OSA"],
      },
      {
        id: "D-04",
        label: "Estrategia",
        schema: z.enum(["a", "b"]),
        current: (s) => s.strategy,
        maxChanges: 1,
        cost: () => 10,
        costKind: "penalty",
        apply: (s, v) => {
          s.strategy = v;
        },
      },
      {
        id: "D-05",
        label: "POS compartido",
        schema: z.boolean(),
        current: (s) => s.pos,
        validate: (v, view) => (v && view.effective("D-02") !== true ? "Requiere refrigerador (D-02)" : null),
        apply: (s, v) => {
          s.pos = v;
        },
      },
    ],
    init: (config) => ({
      stock: 100,
      trust: 1,
      freq: 2,
      capacity: 200,
      fridge: false,
      pos: false,
      strategy: ((config.scenario as { strategy?: "a" | "b" }).strategy ?? "a"),
    }),
    tick: (ctx) => {
      const s = ctx.state;
      const p = ctx.params;
      const surge = ctx.isActive("X-02") ? 1.5 : 1;
      const demand = Math.max(0, ctx.stream("demand", ctx.tick).normal(p.baseDemand * s.trust * surge, p.demandSd * ctx.noise));
      const stockIni = s.stock + (ctx.metrics.spoiled ?? 0); // antes del spoilage de este tick
      const received = Math.max(0, Math.min(s.freq * p.unitsPerDelivery, s.capacity - s.stock));
      s.stock += received;
      const sold = Math.min(s.stock, demand);
      s.stock -= sold;
      const waste = s.stock > p.wasteThreshold ? 0.1 * (s.stock - p.wasteThreshold) : 0;
      s.stock -= waste;
      Object.assign(ctx.metrics, { stockIni, received, demand, sold, lost: demand - sold, waste, spoiled: ctx.metrics.spoiled ?? 0, stockEnd: s.stock });
      ctx.trace("received", received);
    },
    rules: [
      {
        id: "R-01",
        kpis: ["OSA", "DEMAND"],
        when: (ctx) => (ctx.metrics.lost ?? 0) > ctx.params.lostThreshold,
        explain: (ctx) => [{ label: "venta perdida en el tick", value: Math.round(ctx.metrics.lost ?? 0) }],
        apply: (ctx) => {
          ctx.state.trust = Math.max(0.5, ctx.state.trust - 0.02);
        },
        message: () => ({ title: "Clientes molestos", body: "Hubo faltantes y la confianza baja.", severity: "alerta" }),
      },
    ],
    events: [
      {
        id: "X-01",
        kpis: ["WASTE", "OSA"],
        pBase: () => 0.4,
        modifiers: [
          { label: "sin refrigerador", ref: "D-02", factor: 2, when: (ctx) => !ctx.state.fridge },
          { label: "con refrigerador", ref: "D-02", factor: 0.5, when: (ctx) => ctx.state.fridge },
        ],
        onStart: (ctx, ev) => {
          const spoiled = ctx.state.stock * 0.5 * ev.severity;
          ctx.state.stock -= spoiled;
          ctx.metrics.spoiled = spoiled;
        },
        message: (_ctx, ev) => ({ title: "Spoilage", body: `Se perdió mercancía (severidad ${ev.severity.toFixed(2)})`, severity: "critico" }),
      },
      {
        id: "X-02",
        kpis: ["DEMAND", "OSA"],
        pBase: () => 0.2,
        duration: () => 2,
        message: () => ({ title: "Pico de demanda", body: "La demanda sube 50% por dos ticks", severity: "info" }),
      },
    ],
    aggregate: (ctx) => {
      const tot = (k: string) => ctx.tickMetrics.reduce((a, m) => a + (m[k] ?? 0), 0);
      const demand = tot("demand");
      const received = tot("received");
      return {
        DEMAND: demand,
        OSA: demand > 0 ? tot("sold") / demand : 1,
        WASTE: received > 0 ? (tot("waste") + tot("spoiled")) / received : 0,
        LOST: demand > 0 ? tot("lost") / demand : 0,
        STOCK: ctx.state.stock,
        TRUST: ctx.state.trust,
      };
    },
  };
}

export const toyConfig = (seed = 42, extra: Partial<{ events: "on" | "off"; noise: number; trace: boolean }> = {}) => ({
  simId: "toy",
  simVersion: "0.0.1",
  paramsVersion: "p1",
  seed,
  scenario: { strategy: "a" },
  test: { events: extra.events ?? "on", noise: extra.noise ?? 1, trace: extra.trace ?? false },
});
