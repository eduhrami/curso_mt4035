/** Mapa esquemático de la red (SVG propio, AD-23): zonas, densidad de tiendas, CD y asignación zona→CD. */
import { activeDcs, params, type ScmState } from "../src/index.ts";
import { OPTIONS } from "./labels.ts";

const SIZE = 300;

export function NetworkMap({ state, epoch, selectedZone, onSelectZone }: { state: ScmState; epoch: number; selectedZone?: number; onSelectZone?: (z: number) => void }) {
  const g = params.grid;
  const cell = SIZE / g;
  const side = params.regions[state.region].sideKm;
  const maxStores = Math.max(1, ...state.zones.map((z) => z.stores));
  const active = activeDcs(state, epoch);
  const activeIds = new Set(active.map((a) => a.dc.id));
  const centerOf = (zone: number) => ({ x: (zone % g) * cell + cell / 2, y: Math.floor(zone / g) * cell + cell / 2 });
  const nearest = (zid: number) => {
    const z = state.zones[zid]!;
    let best: { zone: number; d: number } | null = null;
    for (const a of active) {
      const h = state.zones[a.dc.zone]!;
      const d = Math.hypot(h.x - z.x, h.y - z.y);
      if (!best || d < best.d) best = { zone: a.dc.zone, d };
    }
    return best?.zone;
  };
  const shape = (type: string, x: number, y: number, built: boolean, label: string) => {
    const common = { fill: built ? "var(--accent)" : "var(--surface)", stroke: "var(--accent)", "stroke-width": 2, "stroke-dasharray": built ? undefined : "3 2" };
    const r = cell * 0.18;
    const el =
      type === "stocking" ? <circle cx={x} cy={y} r={r} {...common} /> : type === "crossdock" ? <polygon points={`${x},${y - r} ${x + r},${y + r} ${x - r},${y + r}`} {...common} /> : <rect x={x - r} y={y - r} width={2 * r} height={2 * r} {...common} />;
    return (
      <g>
        <title>{label}</title>
        {el}
      </g>
    );
  };
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" style={{ maxWidth: 420, display: "block", margin: "0 auto" }} role="img" aria-label={`Mapa esquemático de ${side} × ${side} km con ${state.dcs.length} CD`}>
        {state.zones.map((z) => {
          const { x, y } = centerOf(z.id);
          const n = nearest(z.id);
          return (
            <g key={z.id} onClick={() => onSelectZone?.(z.id)} style={{ cursor: onSelectZone ? "pointer" : "default" }}>
              <rect x={x - cell / 2 + 1} y={y - cell / 2 + 1} width={cell - 2} height={cell - 2} rx={3} fill="var(--info)" fill-opacity={z.stores ? 0.08 + 0.62 * (z.stores / maxStores) : 0.03} stroke={selectedZone === z.id ? "var(--accent)" : "var(--border)"} stroke-width={selectedZone === z.id ? 2.5 : 1}>
                <title>{`Zona ${z.id}: ${z.stores} tiendas, confianza ${(z.trust * 100).toFixed(0)}%`}</title>
              </rect>
              <text x={x - cell / 2 + 4} y={y - cell / 2 + 11} font-size="8" fill="var(--text-muted)">
                {z.id}
              </text>
              {z.stores > 0 && (
                <text x={x} y={y + cell / 2 - 5} font-size="8" text-anchor="middle" fill="var(--text)">
                  {z.stores}
                </text>
              )}
              {z.stores > 0 && n !== undefined && n !== z.id && <line x1={x} y1={y} x2={centerOf(n).x} y2={centerOf(n).y} stroke="var(--accent)" stroke-opacity={0.25} />}
            </g>
          );
        })}
        {state.dcs.map((d) => {
          const { x, y } = centerOf(d.zone);
          const built = activeIds.has(d.id);
          return <g key={d.id}>{shape(d.type, x, y, built, `${d.id}: ${OPTIONS[d.type]}, ${OPTIONS[d.size]}${built ? "" : ` (opera desde la época ${d.activeFrom + 1})`}`)}</g>;
        })}
      </svg>
      <figcaption class="small muted" style={{ textAlign: "center" }}>
        Zonas de {Math.round(side / g)} km por lado · intensidad = tiendas · ● con inventario ▲ cross-dock ■ combinado · contorno punteado = en obra
      </figcaption>
    </figure>
  );
}
