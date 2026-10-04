import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { createRng, hashString } from "../src/rng.ts";
import { mean, std } from "../src/math.ts";

describe("rng: PRNG con contador (AD-06)", () => {
  it("es determinista: misma semilla y clave ⇒ misma secuencia", () => {
    const a = createRng(7).stream("demand", 3, 2, "tienda-1");
    const b = createRng(7).stream("demand", 3, 2, "tienda-1");
    expect(Array.from({ length: 50 }, () => a.next())).toEqual(Array.from({ length: 50 }, () => b.next()));
  });

  it("cambia con la semilla, el subsistema, la época, el tick y la entidad", () => {
    const first = (seed: number, sub: string, e: number, t: number, ent: string | number) => createRng(seed).stream(sub, e, t, ent).next();
    const base = first(7, "demand", 3, 2, "x");
    expect(first(8, "demand", 3, 2, "x")).not.toBe(base);
    expect(first(7, "traffic", 3, 2, "x")).not.toBe(base);
    expect(first(7, "demand", 4, 2, "x")).not.toBe(base);
    expect(first(7, "demand", 3, 1, "x")).not.toBe(base);
    expect(first(7, "demand", 3, 2, "y")).not.toBe(base);
  });

  it("números aleatorios comunes: consumir sorteos en un flujo no altera otro flujo", () => {
    const rng = createRng(99);
    const reference = rng.stream("events", 1, 1, "X-01").next();
    const noisy = createRng(99);
    const other = noisy.stream("demand", 1, 1);
    for (let i = 0; i < 1000; i++) other.next(); // una decisión que consume más sorteos de demanda
    expect(noisy.stream("events", 1, 1, "X-01").next()).toBe(reference);
  });

  it("propiedad: next() ∈ [0, 1) para cualquier semilla y clave", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), fc.string(), fc.nat(100), fc.nat(400), (seed, sub, e, t) => {
        const s = createRng(seed).stream(sub, e, t);
        for (let i = 0; i < 20; i++) {
          const x = s.next();
          if (!(x >= 0 && x < 1)) return false;
        }
        return true;
      }),
    );
  });

  it("uniforme: media ≈ 0.5 y varianza ≈ 1/12 en 200k sorteos", () => {
    const s = createRng(1).stream("u", 0, 0);
    const xs = Array.from({ length: 200_000 }, () => s.next());
    expect(mean(xs)).toBeCloseTo(0.5, 2);
    expect(std(xs) ** 2).toBeCloseTo(1 / 12, 3);
  });

  it("flujos de ticks consecutivos no están correlacionados", () => {
    const rng = createRng(5);
    const a = Array.from({ length: 20_000 }, (_, t) => rng.stream("demand", 0, t).next());
    const b = Array.from({ length: 20_000 }, (_, t) => rng.stream("demand", 0, t + 1).next());
    const ma = mean(a);
    const mb = mean(b);
    const cov = a.reduce((acc, x, i) => acc + (x - ma) * (b[i]! - mb), 0) / a.length;
    expect(Math.abs(cov / (std(a) * std(b)))).toBeLessThan(0.03);
  });

  it("normal: media y desviación correctas", () => {
    const s = createRng(3).stream("n", 0, 0);
    const xs = Array.from({ length: 100_000 }, () => s.normal(10, 2));
    expect(mean(xs)).toBeCloseTo(10, 1);
    expect(std(xs)).toBeCloseTo(2, 1);
  });

  it("poisson: media ≈ λ en régimen exacto y aproximado", () => {
    const s = createRng(4).stream("p", 0, 0);
    expect(mean(Array.from({ length: 50_000 }, () => s.poisson(3)))).toBeCloseTo(3, 1);
    expect(mean(Array.from({ length: 20_000 }, () => s.poisson(80)))).toBeCloseTo(80, 0);
    expect(s.poisson(0)).toBe(0);
  });

  it("int, bernoulli y weightedIndex respetan rangos y proporciones", () => {
    const s = createRng(6).stream("misc", 0, 0);
    const ints = Array.from({ length: 10_000 }, () => s.int(1, 3));
    expect(Math.min(...ints)).toBe(1);
    expect(Math.max(...ints)).toBe(3);
    const hits = Array.from({ length: 50_000 }, () => s.bernoulli(0.2)).filter(Boolean).length;
    expect(hits / 50_000).toBeCloseTo(0.2, 2);
    const counts = [0, 0, 0];
    for (let i = 0; i < 30_000; i++) counts[s.weightedIndex([1, 2, 0])]!++;
    expect(counts[2]).toBe(0);
    expect(counts[1]! / counts[0]!).toBeCloseTo(2, 0);
    expect(() => s.weightedIndex([0, 0])).toThrow();
  });

  it("hashString es estable", () => {
    expect(hashString("demand")).toBe(hashString("demand"));
    expect(hashString("demand")).not.toBe(hashString("traffic"));
  });
});
