/** Formato numérico es-MX con moneda única USD (AD-28). */
export type KpiFormat = "pct" | "pct1" | "num0" | "num1" | "num2" | "usd" | "usdM" | "days" | "ratio";

const nf = (min: number, max: number) => new Intl.NumberFormat("es-MX", { minimumFractionDigits: min, maximumFractionDigits: max });
const N0 = nf(0, 0);
const N1 = nf(1, 1);
const N2 = nf(2, 2);

export function fmt(value: number | undefined, format: KpiFormat): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  switch (format) {
    case "pct":
      return `${N1.format(value * 100)}%`;
    case "pct1":
      return `${N2.format(value * 100)}%`;
    case "num0":
      return N0.format(value);
    case "num1":
      return N1.format(value);
    case "num2":
    case "ratio":
      return N2.format(value);
    case "usd":
      return `US$ ${N0.format(value)}`;
    case "usdM":
      return `US$ ${N1.format(value / 1e6)} M`;
    case "days":
      return `${N1.format(value)} d`;
  }
}

/** Diferencia contra la época anterior: puntos porcentuales para proporciones, relativa para el resto. */
export function fmtDelta(cur: number | undefined, prev: number | undefined, format: KpiFormat): string {
  if (cur === undefined || prev === undefined || !Number.isFinite(cur) || !Number.isFinite(prev)) return "";
  const d = cur - prev;
  if (Math.abs(d) < 1e-12) return "= sin cambio";
  const sign = d > 0 ? "▲" : "▼";
  if (format === "pct" || format === "pct1") return `${sign} ${N1.format(Math.abs(d) * 100)} pp`;
  const rel = prev !== 0 ? Math.abs(d / prev) : 0;
  return `${sign} ${N1.format(rel * 100)}%`;
}

export const fmtMoney = (v: number) => fmt(v, Math.abs(v) >= 1e6 ? "usdM" : "usd");
