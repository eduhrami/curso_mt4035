/** Diálogo de confirmación de época: diff de decisiones, costo inmediato, retrasos e irreversibles (AD-20). */
import { useEffect, useRef, useState } from "preact/hooks";
import type { DecisionSpec } from "@mt4035/sim-core";
import type { GameStore } from "../store.ts";
import { fmtMoney } from "../format.ts";

export interface ChangeSummary {
  id: string;
  label: string;
  from: string;
  to: string;
  cost: number;
  lag: number;
  irreversible: boolean;
}

export function summarizeChanges<S, P>(store: GameStore<S, P>, describe: (id: string, v: unknown) => string): ChangeSummary[] {
  const s = store.state.value;
  if (!s) return [];
  const params = store.engine.params;
  return store.engine.model.decisions
    .filter((d) => Object.prototype.hasOwnProperty.call(store.draft.value, d.id))
    .map((d: DecisionSpec<S, P, any>) => {
      const to = store.draft.value[d.id];
      const from = store.engine.effectiveValue(s, d.id);
      const irr = typeof d.irreversible === "function" ? d.irreversible(from, to) : Boolean(d.irreversible);
      return { id: d.id, label: d.label, from: describe(d.id, from), to: describe(d.id, to), cost: d.cost?.(to, s.model, params) ?? 0, lag: d.lag?.(to, s.model, params) ?? 0, irreversible: irr };
    });
}

export function ConfirmDialog<S, P>({ store, open, onClose, onConfirmed, describe, epochName, effect, period = "trimestre" }: { store: GameStore<S, P>; /** Nombre de la época ("trimestre", "mes"). */ period?: string; open: boolean; onClose: () => void; onConfirmed: () => void; describe: (id: string, v: unknown) => string; epochName: string; /** Nota propia del simulador sobre cuándo surte efecto (p. ej. CD que tardan en construirse). */ effect?: (id: string, to: unknown) => string | undefined }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [ack, setAck] = useState(false);
  const changes = open ? summarizeChanges(store, describe) : [];
  const irreversible = changes.filter((c) => c.irreversible);
  const total = changes.reduce((a, c) => a + c.cost, 0);
  const s = store.state.value;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setAck(false);
      d.showModal?.();
    }
    if (!open && d.open) d.close?.();
  }, [open]);
  const confirm = async () => {
    const r = await store.confirm();
    if (r) onConfirmed();
    onClose();
  };
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="confirm-title">
      <h2 id="confirm-title">Confirmar {epochName}</h2>
      {changes.length === 0 ? (
        <p>No cambiaste ninguna decisión: el {period} correrá con la configuración vigente.</p>
      ) : (
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Decisión</th>
                <th>Antes</th>
                <th>Después</th>
                <th>Costo inmediato</th>
                <th>Surte efecto</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.label} <span class="muted mono small">{c.id}</span>
                  </td>
                  <td class="small">{c.from}</td>
                  <td class="small">
                    <strong>{c.to}</strong>
                  </td>
                  <td>{c.cost ? fmtMoney(c.cost) : "—"}</td>
                  <td class="small">{effect?.(c.id, store.draft.value[c.id]) ?? (c.lag > 0 && s ? store.engine.epochLabel(s.epoch + c.lag) : `este ${period}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total !== 0 && (
        <p>
          <strong>Costo inmediato total: {fmtMoney(total)}</strong>
        </p>
      )}
      {irreversible.length > 0 && (
        <label class="row" style={{ background: "var(--warn-bg)", padding: "0.5rem", borderRadius: 8, margin: "0.5rem 0" }}>
          <input type="checkbox" checked={ack} onChange={(e) => setAck((e.target as HTMLInputElement).checked)} />
          <span>
            Entiendo que <strong>{irreversible.map((c) => c.label).join(", ")}</strong> es difícil de revertir (cuesta o tarda deshacerlo).
          </span>
        </label>
      )}
      <div class="row" style={{ justifyContent: "flex-end", marginTop: "0.75rem" }}>
        <button type="button" onClick={onClose}>
          Seguir decidiendo
        </button>
        <button type="button" class="btn-primary" disabled={store.busy.value || (irreversible.length > 0 && !ack)} onClick={confirm} data-testid="confirm-run">
          Confirmar y correr el {period}
        </button>
      </div>
    </dialog>
  );
}
