/** Consultas estadísticas sobre los registros de auto-juego (para propiedades y reporte). */
import { mean, percentile, std } from "@mt4035/sim-core";
import type { RunRecord, SearchOutcome } from "./types.ts";

export interface ScoreSummary {
  n: number;
  mean: number;
  sd: number;
  p5: number;
  p95: number;
  cv: number;
}

export class Results {
  private readonly index = new Map<string, RunRecord>();

  constructor(
    readonly records: readonly RunRecord[],
    readonly strategies: readonly string[],
    /** Óptimos del bot buscador, si se corrió con --search. */
    readonly search: readonly SearchOutcome[] = [],
  ) {
    for (const r of records) this.index.set(`${r.bot}|${r.scenario}|${r.seed}`, r);
  }

  get bots(): string[] {
    return [...new Set(this.records.map((r) => r.bot))];
  }
  get scenarios(): string[] {
    return [...new Set(this.records.map((r) => r.scenario))];
  }
  seeds(scenario?: string): number[] {
    return [...new Set(this.records.filter((r) => !scenario || r.scenario === scenario).map((r) => r.seed))].sort((a, b) => a - b);
  }
  has(bot: string): boolean {
    return this.records.some((r) => r.bot === bot);
  }
  get(bot: string, scenario: string, seed: number): RunRecord | undefined {
    return this.index.get(`${bot}|${scenario}|${seed}`);
  }
  of(bot: string, scenario?: string): RunRecord[] {
    return this.records.filter((r) => r.bot === bot && (!scenario || r.scenario === scenario));
  }

  scores(bot: string, scenario: string, strategy: string): number[] {
    return this.of(bot, scenario)
      .filter((r) => r.ok)
      .map((r) => r.scores[strategy]!);
  }

  summary(bot: string, scenario: string, strategy: string): ScoreSummary {
    const xs = this.scores(bot, scenario, strategy);
    const m = mean(xs);
    const sd = std(xs);
    return { n: xs.length, mean: m, sd, p5: percentile(xs, 0.05), p95: percentile(xs, 0.95), cv: m !== 0 ? sd / Math.abs(m) : sd === 0 ? 0 : Infinity };
  }

  /** Fracción de semillas en que el predicado se cumple (sobre las semillas con todos los bots). */
  shareOfSeeds(scenario: string, bots: readonly string[], pred: (score: (bot: string) => RunRecord) => boolean): number {
    let n = 0;
    let hit = 0;
    for (const seed of this.seeds(scenario)) {
      const recs = bots.map((b) => this.get(b, scenario, seed));
      if (recs.some((r) => !r || !r.ok)) continue;
      n++;
      const byBot = new Map(bots.map((b, i) => [b, recs[i]!]));
      if (pred((b) => byBot.get(b)!)) hit++;
    }
    return n ? hit / n : NaN;
  }

  /** Posición (1 = mejor) de un bot entre `bots` por puntaje en una semilla. Empates: posición media. */
  static rank(scores: Record<string, number>, bot: string): number {
    const mine = scores[bot]!;
    const better = Object.values(scores).filter((s) => s > mine + 1e-9).length;
    const ties = Object.values(scores).filter((s) => Math.abs(s - mine) <= 1e-9).length;
    return better + (ties + 1) / 2;
  }

  /** Diferencia pareada por semilla entre dos bots (mismo escenario y estrategia). */
  pairedDiff(a: string, b: string, scenario: string, strategy: string): number[] {
    return this.seeds(scenario).flatMap((seed) => {
      const ra = this.get(a, scenario, seed);
      const rb = this.get(b, scenario, seed);
      return ra?.ok && rb?.ok ? [ra.scores[strategy]! - rb.scores[strategy]!] : [];
    });
  }
}
