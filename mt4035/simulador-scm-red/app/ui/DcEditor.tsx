/** Editor de la red de CD (D-01: zona D-02, tipo D-03, tamaño D-04 por CD). */
import { useState } from "preact/hooks";
import type { CustomControlProps } from "@mt4035/ui-kit";
import { params, type DcSpec, type ScmState } from "../src/index.ts";
import { engine } from "./game.ts";
import { OPTIONS } from "./labels.ts";
import { NetworkMap } from "./NetworkMap.tsx";

const TYPES = ["stocking", "crossdock", "combined"] as const;
const SIZES = ["small", "medium", "large"] as const;
const ORDER = { small: 0, medium: 1, large: 2 };

export function DcEditor({ value, onChange, state, disabled }: CustomControlProps<ScmState>) {
  const dcs = (value as DcSpec[]) ?? [];
  const existing = new Map(state.model.dcs.map((d) => [d.id, d]));
  const [selected, setSelected] = useState<number | undefined>(undefined);
  const zones = state.model.zones;
  const e = state.epoch;
  const status = (d: DcSpec, old: (typeof state.model.dcs)[number] | undefined) => {
    if (!old) return `Nuevo: operaría en ${engine.epochLabel(e + params.dc.buildLagEpochs[d.size])}`;
    if (old.activeFrom > e) return `En obra: opera en ${engine.epochLabel(old.activeFrom)}`;
    if (d.type !== old.type || d.size !== old.size) return "Cambio pendiente de confirmar";
    if (old.typeFrom > e || old.sizeFrom > e) return `En cambio hasta ${engine.epochLabel(Math.max(old.typeFrom, old.sizeFrom))}`;
    return "Operando";
  };
  const update = (i: number, patch: Partial<DcSpec>) => onChange(dcs.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const add = () => {
    const used = new Set(dcs.map((d) => d.zone));
    const zone = selected ?? [...zones].filter((z) => !used.has(z.id)).sort((a, b) => b.stores - a.stores)[0]?.id ?? 0;
    let n = dcs.length + 1;
    while (dcs.some((d) => d.id === `CD-${n}`) || existing.has(`CD-${n}`)) n++;
    onChange([...dcs, { id: `CD-${n}`, zone, type: "stocking", size: "medium" }]);
  };
  return (
    <div class="stack" style={{ gap: "0.5rem" }}>
      <NetworkMap state={{ ...state.model, dcs: dcs.map((d) => existing.get(d.id) ?? { ...d, activeFrom: 999, prevType: d.type, prevSize: d.size, typeFrom: -1, sizeFrom: -1, downUntil: -1 }) }} epoch={state.epoch} selectedZone={selected} onSelectZone={disabled ? undefined : setSelected} />
      <p class="small muted">Toca una zona del mapa para elegir dónde agregar el próximo CD.</p>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>CD</th>
              <th>Zona</th>
              <th>Tipo</th>
              <th>Tamaño</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {dcs.map((d, i) => {
              const old = existing.get(d.id);
              return (
                <tr key={d.id}>
                  <td class="mono small">{d.id}</td>
                  <td>
                    <select aria-label={`Zona de ${d.id}`} value={d.zone} disabled={disabled || !!old} onChange={(e) => update(i, { zone: Number((e.target as HTMLSelectElement).value) })}>
                      {zones.map((z) => (
                        <option value={z.id} key={z.id}>
                          {z.id} ({z.stores} tiendas)
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select aria-label={`Tipo de ${d.id}`} value={d.type} disabled={disabled} onChange={(e) => update(i, { type: (e.target as HTMLSelectElement).value as DcSpec["type"] })}>
                      {TYPES.map((t) => (
                        <option value={t} key={t}>
                          {OPTIONS[t]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select aria-label={`Tamaño de ${d.id}`} value={d.size} disabled={disabled} onChange={(e) => update(i, { size: (e.target as HTMLSelectElement).value as DcSpec["size"] })}>
                      {SIZES.map((s) => (
                        <option value={s} key={s} disabled={!!old && ORDER[s] < ORDER[old.size]}>
                          {OPTIONS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td class="small">{status(d, old)}</td>
                  <td>
                    <button type="button" class="btn-ghost" aria-label={`Cerrar ${d.id}`} disabled={disabled} onClick={() => onChange(dcs.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div class="row">
        <button type="button" onClick={add} disabled={disabled || dcs.length >= 20}>
          + Agregar CD{selected !== undefined ? ` en la zona ${selected}` : ""}
        </button>
        <span class="small muted">{dcs.length}/20 CD</span>
      </div>
    </div>
  );
}
