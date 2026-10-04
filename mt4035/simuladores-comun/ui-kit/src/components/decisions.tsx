/**
 * Panel de decisiones generado desde los esquemas zod de cada DecisionSpec (AD-21). Las listas
 * (como la red de CD) usan un editor propio del simulador vía `custom`.
 */
import type { ComponentChildren, VNode } from "preact";
import { useState } from "preact/hooks";
import type { DecisionSpec, GameState } from "@mt4035/sim-core";
import type { GameStore } from "../store.ts";
import { fmt, fmtMoney, type KpiFormat } from "../format.ts";
import { Tabs, type TabDef } from "./basics.tsx";

export interface DecisionLabels {
  /** Texto de ayuda breve bajo el título de la decisión. */
  help?: string;
  /** Etiqueta de cada campo de un objeto (p. ej. "fresh" → "Frescos"). */
  fields?: Record<string, string>;
  /** Etiqueta de cada opción de un enum. */
  options?: Record<string, string>;
  /** Formato de los números (p. ej. CSL como porcentaje). */
  format?: KpiFormat;
  /** Paso del deslizador para números no enteros. */
  step?: number;
  /** Unidad que se muestra junto al número. */
  unit?: string;
}

export type LabelMap = Record<string, DecisionLabels>;

type AnySchema = { type?: string; options?: readonly unknown[]; minValue?: number | null; maxValue?: number | null; isInt?: boolean; shape?: Record<string, AnySchema>; element?: AnySchema };

export interface ControlProps {
  schema: AnySchema;
  value: unknown;
  onChange: (v: unknown) => void;
  labels: DecisionLabels;
  globalOptions: Record<string, string>;
  name: string;
  disabled?: boolean;
}

/** Control genérico según el tipo del esquema: enum, número, booleano u objeto. */
export function SchemaControl({ schema, value, onChange, labels, globalOptions, name, disabled }: ControlProps): VNode {
  const optLabel = (v: unknown) => labels.options?.[String(v)] ?? globalOptions[String(v)] ?? String(v);
  switch (schema.type) {
    case "enum": {
      const opts = (schema.options ?? []) as string[];
      if (opts.length <= 4) {
        return (
          <div class="row" role="radiogroup" aria-label={name}>
            {opts.map((o) => (
              <button type="button" role="radio" aria-checked={value === o} class={value === o ? "btn-primary" : ""} onClick={() => onChange(o)} disabled={disabled} key={o}>
                {optLabel(o)}
              </button>
            ))}
          </div>
        );
      }
      return (
        <select aria-label={name} value={String(value)} onChange={(e) => onChange((e.target as HTMLSelectElement).value)} disabled={disabled}>
          {opts.map((o) => (
            <option value={o} key={o}>
              {optLabel(o)}
            </option>
          ))}
        </select>
      );
    }
    case "number": {
      const min = schema.minValue ?? 0;
      const max = schema.maxValue ?? 100;
      const step = schema.isInt ? 1 : (labels.step ?? (max - min) / 100);
      const n = Number(value);
      return (
        <div class="row" style={{ flexWrap: "nowrap" }}>
          <input type="range" aria-label={name} min={min} max={max} step={step} value={n} disabled={disabled} onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))} />
          <output class="mono" style={{ minWidth: "4.5rem", textAlign: "right" }}>
            {labels.format ? fmt(n, labels.format) : schema.isInt ? String(n) : n.toFixed(2)}
            {labels.unit ? ` ${labels.unit}` : ""}
          </output>
        </div>
      );
    }
    case "boolean":
      return (
        <label class="row">
          <input type="checkbox" checked={Boolean(value)} disabled={disabled} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} />
          <span>{value ? "Sí" : "No"}</span>
        </label>
      );
    case "object": {
      const shape = schema.shape ?? {};
      const obj = (value ?? {}) as Record<string, unknown>;
      return (
        <div class="field-grid">
          {Object.entries(shape).map(([k, child]) => {
            const control = <SchemaControl schema={child} value={obj[k]} onChange={(v) => onChange({ ...obj, [k]: v })} labels={labels} globalOptions={globalOptions} name={`${name}: ${labels.fields?.[k] ?? k}`} disabled={disabled} />;
            const caption = <span class="small muted">{labels.fields?.[k] ?? k}</span>;
            // Un <label> se asocia a su primer control: para grupos de botones se usa un <div> (el grupo ya tiene aria-label).
            const isButtonGroup = child.type === "enum" && (child.options?.length ?? 0) <= 4;
            return isButtonGroup ? (
              <div key={k}>
                {caption}
                {control}
              </div>
            ) : (
              <label key={k}>
                {caption}
                {control}
              </label>
            );
          })}
        </div>
      );
    }
    default:
      return <pre class="small mono">{JSON.stringify(value)}</pre>;
  }
}

export interface CustomControlProps<S> {
  value: unknown;
  onChange: (v: unknown) => void;
  state: GameState<S>;
  disabled: boolean;
}

export interface DecisionPanelProps<S, P> {
  store: GameStore<S, P>;
  tabs: TabDef[];
  labels: LabelMap;
  globalOptions: Record<string, string>;
  kpiNames: Record<string, string>;
  /** Editores propios por decisión (p. ej. D-01 red de CD). */
  custom?: Record<string, (p: CustomControlProps<S>) => VNode>;
  /** Contenido extra al pie del panel (botón de confirmar, etc.). */
  footer?: ComponentChildren;
}

export function DecisionPanel<S, P>({ store, tabs, labels, globalOptions, kpiNames, custom = {}, footer }: DecisionPanelProps<S, P>) {
  const [tab, setTab] = useState(tabs[0]?.id ?? "");
  const state = store.state.value;
  if (!state) return null;
  const final = state.phase === "FINAL";
  const specs = store.engine.model.decisions.filter((d) => (d.tab ?? tabs[0]?.id) === tab);
  return (
    <div class="card">
      <h2>Decisiones · {store.engine.epochLabel(Math.min(state.epoch, store.engine.model.calendar.epochs - 1))}</h2>
      <Tabs tabs={tabs} active={tab} onChange={setTab} label="Grupos de decisiones" />
      <div>
        {specs.map((spec) => (
          <DecisionItem key={spec.id} spec={spec} store={store} labels={labels[spec.id] ?? {}} globalOptions={globalOptions} kpiNames={kpiNames} custom={custom[spec.id]} disabled={final || store.busy.value} />
        ))}
      </div>
      {footer}
    </div>
  );
}

function DecisionItem<S, P>({ spec, store, labels, globalOptions, kpiNames, custom, disabled }: { spec: DecisionSpec<S, P, any>; store: GameStore<S, P>; labels: DecisionLabels; globalOptions: Record<string, string>; kpiNames: Record<string, string>; custom?: (p: CustomControlProps<S>) => VNode; disabled: boolean }) {
  const state = store.state.value!;
  const params = store.engine.params;
  const value = store.valueOf(spec.id);
  const changed = store.changedIds.value.includes(spec.id);
  const error = store.errors.value[spec.id];
  const pending = state.pending.filter((p) => p.decisionId === spec.id);
  const lag = changed ? (spec.lag?.(value, state.model, params) ?? 0) : 0;
  const cost = changed ? (spec.cost?.(value, state.model, params) ?? 0) : 0;
  const onChange = (v: unknown) => store.setDecision(spec.id, v);
  return (
    <div class={`decision${changed ? " changed" : ""}`} data-decision={spec.id}>
      <h4>
        <span>
          {spec.label} <span class="muted small mono">{spec.id}</span>
        </span>
        {changed && (
          <button type="button" class="btn-ghost small" onClick={() => store.resetDecision(spec.id)} aria-label={`Deshacer ${spec.label}`}>
            ↺ deshacer
          </button>
        )}
      </h4>
      {(labels.help ?? spec.help) && <p class="small muted">{labels.help ?? spec.help}</p>}
      {custom ? custom({ value, onChange, state, disabled }) : <SchemaControl schema={spec.schema as unknown as AnySchema} value={value} onChange={onChange} labels={labels} globalOptions={globalOptions} name={spec.label} disabled={disabled} />}
      <div class="meta row">
        {spec.maxChanges !== undefined && <span>Cambios permitidos en la partida: {spec.maxChanges}</span>}
        {changed && cost !== 0 && <span>Costo inmediato: {fmtMoney(cost)}</span>}
        {changed && lag > 0 && <span>Surte efecto en {store.engine.epochLabel(state.epoch + lag)}</span>}
        {spec.irreversible && <span>⚠ Difícil de revertir</span>}
        {pending.map((p) => (
          <span key={p.activateAt}>En obra desde {store.engine.epochLabel(p.decidedAt)}: opera en {store.engine.epochLabel(p.activateAt)}</span>
        ))}
      </div>
      {spec.kpis && spec.kpis.length > 0 && (
        <div class="row small" aria-label="KPIs que mueve">
          <span class="muted">Mueve:</span>
          {spec.kpis.slice(0, 6).map((k) => (
            <span class="chip" key={k}>
              {kpiNames[k] ?? k}
            </span>
          ))}
        </div>
      )}
      {error && (
        <p class="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
