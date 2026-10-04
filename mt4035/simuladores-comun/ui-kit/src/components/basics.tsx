/** Piezas básicas: pestañas, layout de tres columnas, aviso de almacenamiento. */
import type { ComponentChildren, JSX } from "preact";
import { useState } from "preact/hooks";

export interface TabDef {
  id: string;
  label: string;
}

export function Tabs({ tabs, active, onChange, label }: { tabs: TabDef[]; active: string; onChange: (id: string) => void; label: string }) {
  return (
    <div class="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button type="button" role="tab" id={`tab-${t.id}`} aria-selected={active === t.id} onClick={() => onChange(t.id)} key={t.id}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Tres columnas en escritorio; en pantallas angostas, pestañas Decisiones / Dashboard / Mensajes (AD-22). */
export function ThreeColumns({ left, center, right, labels = ["Decisiones", "Dashboard", "Mensajes"] }: { left: ComponentChildren; center: ComponentChildren; right: ComponentChildren; labels?: [string, string, string] }) {
  const [view, setView] = useState(1);
  const cols: [string, ComponentChildren][] = [
    ["col-decisions", left],
    ["col-dashboard", center],
    ["col-messages", right],
  ];
  return (
    <>
      <div class="mobile-tabs no-print" role="tablist" aria-label="Vista">
        {labels.map((l, i) => (
          <button type="button" role="tab" aria-selected={view === i} onClick={() => setView(i)} key={l}>
            {l}
          </button>
        ))}
      </div>
      <main class="layout">
        {cols.map(([cls, content], i) => (
          <section class={`col ${cls}`} data-hidden={view !== i} aria-label={labels[i]} key={cls}>
            {content}
          </section>
        ))}
      </main>
    </>
  );
}

export function StorageBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div class="banner banner-warn" role="status">
      ⚠ {error}. Tu partida sigue en memoria: <strong>exporta tu corrida antes de cerrar</strong> la página.
    </div>
  );
}

export function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "info"; children: ComponentChildren }) {
  return <span class={`chip badge-${tone}`}>{children}</span>;
}

export function Section({ title, children, actions, ...rest }: { title: string; children: ComponentChildren; actions?: ComponentChildren } & JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div class="card stack" {...rest}>
      <div class="row" style={{ justifyContent: "space-between" }}>
        <h2>{title}</h2>
        {actions}
      </div>
      {children}
    </div>
  );
}
