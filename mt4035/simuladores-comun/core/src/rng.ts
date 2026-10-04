/**
 * PRNG basado en contador con números aleatorios comunes (AD-06).
 *
 * Cada número depende solo de (semilla, subsistema, época, tick, entidad, índice de sorteo),
 * nunca del orden global en que se piden. Cambiar una decisión que consume más sorteos en un
 * subsistema no desplaza los sorteos de los demás, lo que hace válidas las pruebas pareadas.
 */

const C1 = 0xcc9e2d51;
const C2 = 0x1b873593;

/** Paso de mezcla de MurmurHash3 (32 bits). */
function mix(h: number, k: number): number {
  k = Math.imul(k, C1);
  k = (k << 15) | (k >>> 17);
  k = Math.imul(k, C2);
  h ^= k;
  h = (h << 13) | (h >>> 19);
  return (Math.imul(h, 5) + 0xe6546b64) | 0;
}

/** Finalizador de MurmurHash3: avalancha completa de los 32 bits. */
function fmix(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** FNV-1a de 32 bits para convertir nombres de subsistema y entidad en enteros. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function hashInts(...values: number[]): number {
  let h = 0x9747b28c;
  for (const v of values) h = mix(h, v | 0);
  return fmix(h ^ values.length);
}

export type EntityKey = string | number;

/** Flujo de números aleatorios para una combinación (subsistema, época, tick, entidad). */
export interface Stream {
  /** Uniforme en [0, 1) con 53 bits de resolución. */
  next(): number;
  uniform(min: number, max: number): number;
  /** Entero uniforme en [min, max] (ambos inclusive). */
  int(min: number, max: number): number;
  bernoulli(p: number): boolean;
  /** Normal por Box–Muller; consume exactamente dos sorteos. */
  normal(mean?: number, sd?: number): number;
  /** Poisson: Knuth para λ ≤ 30 y aproximación normal redondeada para λ mayor. */
  poisson(lambda: number): number;
  /** Elige un índice según pesos no negativos. */
  weightedIndex(weights: readonly number[]): number;
}

class CounterStream implements Stream {
  private counter = 0;
  constructor(private readonly key: number) {}

  private u32(): number {
    const i = this.counter++;
    return fmix(mix(mix(this.key, i), 0x2545f491));
  }

  next(): number {
    const a = this.u32() >>> 5; // 27 bits
    const b = this.u32() >>> 6; // 26 bits
    return (a * 67108864 + b) / 9007199254740992;
  }

  uniform(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  bernoulli(p: number): boolean {
    return this.next() < p;
  }

  normal(mean = 0, sd = 1): number {
    const u1 = 1 - this.next(); // (0, 1]: evita log(0)
    const u2 = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    if (lambda > 30) return Math.max(0, Math.round(this.normal(lambda, Math.sqrt(lambda))));
    const limit = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.next();
    } while (p > limit);
    return k - 1;
  }

  weightedIndex(weights: readonly number[]): number {
    const total = weights.reduce((a, w) => a + Math.max(0, w), 0);
    if (total <= 0) throw new Error("weightedIndex: los pesos suman cero");
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= Math.max(0, weights[i] ?? 0);
      if (r < 0) return i;
    }
    return weights.length - 1;
  }
}

export interface Rng {
  readonly seed: number;
  /**
   * Devuelve un flujo nuevo para la combinación dada. Pedir el mismo flujo dos veces devuelve
   * la misma secuencia: el modelo debe crear el flujo una vez por uso lógico.
   */
  stream(subsystem: string, epoch: number, tick: number, entity?: EntityKey): Stream;
}

export function createRng(seed: number): Rng {
  const s = seed >>> 0;
  return {
    seed: s,
    stream(subsystem, epoch, tick, entity = 0) {
      const e = typeof entity === "number" ? entity | 0 : hashString(entity);
      return new CounterStream(hashInts(s, hashString(subsystem), epoch, tick, e));
    },
  };
}
