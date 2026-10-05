/**
 * Mapa esquemático del territorio (AD-23): zonas como celdas con calor de demanda y los nodos que
 * operan en cada una. No es un mapa real ni hay vehículos animados.
 */
import { params, placeNodes, type LmState } from "../src/index.ts";

const KIND: Record<string, string> = { urban: "Urbana", suburban: "Periferia", city2: "Ciudad foránea", rural: "Rural" };
/** Código de color por tipo de zona (etiqueta y borde izquierdo de cada celda). */
const KIND_COLOR: Record<string, string> = { urban: "#1d5fbf", suburban: "#2e7d32", city2: "#7b3fa0", rural: "#8a6100" };

export function TerritoryMap({ state }: { state: LmState }) {
  const t = params.territories[state.territory];
  const place = placeNodes(state, params, state.dec);
  const maxShare = Math.max(...t.zones.map((z) => z.share));
  const d = state.dec;
  return (
    <figure style={{ margin: 0 }} class="stack">
      <p class="small">
        <strong>CD</strong> {d.sfd.active ? `activo · capacidad de ${params.nodes.cd.capacity[d.sfd.capacity].toLocaleString("es-MX")} pedidos/día` : "apagado"}
        {d.bopis ? " · recoger en tienda activo" : ""}
      </p>
      <div class="zone-grid" role="list" aria-label={`Zonas de ${t.label}`}>
        {t.zones.map((z) => {
          const zs = state.zones[z.id]!;
          const sfs = z.stores > 0 && d.sfs.share > 0 ? Math.ceil(z.stores * d.sfs.share - 1e-9) : 0;
          const mfc = place.mfcCover.get(z.id);
          const dark = place.darkCover.get(z.id);
          const icons = [
            ...(mfc ? [mfc.distKm <= 2 ? "⚙ MFC" : "⚙ cubierta por MFC"] : []),
            ...(dark ? [dark.distKm <= 2 ? "■ dark store" : "□ cubierta por dark store"] : []),
            ...(place.hubs.has(z.id) ? ["⇄ micro-hub"] : []),
            ...(place.lockersByZone[z.id]! > 0 ? [`▣ ${place.lockersByZone[z.id]} lockers`] : []),
            ...(sfs > 0 ? [`🏬 ${sfs} tiendas SFS`] : []),
          ];
          return (
            <div role="listitem" class="zone" key={z.id} style={{ background: `color-mix(in srgb, var(--accent) ${Math.round(6 + 34 * (z.share / maxShare))}%, transparent)`, borderLeft: `5px solid ${KIND_COLOR[z.kind]}` }}>
              <div class="row" style={{ justifyContent: "space-between", gap: "0.25rem" }}>
                <strong>{z.name}</strong>
                <span class="zone-kind" style={{ background: KIND_COLOR[z.kind] }}>
                  {KIND[z.kind]}
                </span>
              </div>
              <div>
                <span class="zone-stores">{z.stores}</span> <span class="muted">tiendas</span>
              </div>
              <div class="muted">
                {Math.round(z.share * 100)}% de la demanda · {z.distCd} km del CD
              </div>
              <div class="icons">{icons.length ? icons.join(" · ") : <span class="muted">Solo desde el CD</span>}</div>
              <div class="muted">
                Confianza {Math.round(zs.trust * 100)}%{zs.competition < 1 ? ` · competencia −${Math.round((1 - zs.competition) * 100)}%` : ""}
              </div>
            </div>
          );
        })}
      </div>
      <p class="row small" style={{ margin: 0 }} aria-label="Tipos de zona">
        {[...new Set(t.zones.map((z) => z.kind))].map((k) => (
          <span class="zone-kind" style={{ background: KIND_COLOR[k] }} key={k}>
            {KIND[k]}
          </span>
        ))}
      </p>
      <figcaption class="small muted">Etiqueta y borde = tipo de zona · número grande = tiendas en la zona · intensidad del fondo = participación en la demanda · ⚙ MFC · ■ dark store · ⇄ micro-hub · ▣ lockers · 🏬 tiendas que surten (SFS)</figcaption>
    </figure>
  );
}
