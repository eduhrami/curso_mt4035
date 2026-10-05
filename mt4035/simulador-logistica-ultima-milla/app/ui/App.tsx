/** Raíz de la app de última milla: barra superior, configuración, partida (3 columnas) y corridas. */
import { useState } from "preact/hooks";
import { ConfirmDialog, DecisionPanel, download, MessageInbox, StorageBanner, ThreeColumns, fmtMoney } from "@mt4035/ui-kit";
import { Dashboard } from "./Dashboard.tsx";
import { FinalReport } from "./FinalReport.tsx";
import { Runs } from "./Runs.tsx";
import { Setup } from "./Setup.tsx";
import { engine, EPOCHS, professor, projectsInProgress, screen, store, territoryOf } from "./game.ts";
import { describeValue, KPI_NAMES, LABELS, MONTHS, OPTIONS, scenarioLabel, TABS, TERRITORY_TEXT } from "./labels.ts";

export function App() {
  const state = store.state.value;
  return (
    <div class="app">
      <TopBar />
      <StorageBanner error={store.storageError.value} />
      {screen.value === "runs" ? <Runs /> : screen.value === "game" && state ? <Game /> : <Setup />}
    </div>
  );
}

function TopBar() {
  const s = store.state.value;
  const inGame = screen.value === "game" && s;
  const capex = s ? s.ledger.reduce((a, l) => a + (l.kind === "capex" || l.kind === "penalty" ? l.amount : 0), 0) : 0;
  const projects = s ? projectsInProgress(s) : [];
  const exportJson = async () => {
    if (!s) return;
    download(`mercado-alba-${territoryOf(s)}-${s.config.seed}-${s.history.length}de${EPOCHS}.json`, JSON.stringify(await store.exportRun(), null, 2));
  };
  return (
    <header class="topbar">
      <span class="brand">☀ Mercado Alba</span>
      {inGame && (
        <>
          <span>{TERRITORY_TEXT[territoryOf(s)].title}</span>
          <span class="chip" data-testid="epoch-label">
            {s.phase === "FINAL" ? "Partida terminada" : `Mes ${engine.epochLabel(s.epoch)} (${MONTHS[s.epoch % 12]}) · ${s.epoch + 1}/${EPOCHS}`}
          </span>
          <span class="chip">Estrategia: {OPTIONS[s.model.strategy]}</span>
          <span class="chip" data-testid="scenario-label">{scenarioLabel(s.config.scenario)}</span>
          <span class="chip" title="Inversión acumulada (capex y penalizaciones)">
            Inversión: {fmtMoney(capex)}
          </span>
          {projects.length > 0 && (
            <span class="chip badge-info" title={projects.join("\n")}>
              Proyectos en curso: {projects.length}
            </span>
          )}
          {professor && <span class="chip badge-warn">Modo profesor</span>}
        </>
      )}
      <span class="spacer" />
      {inGame && (
        <button type="button" onClick={exportJson}>
          Exportar JSON
        </button>
      )}
      <button type="button" onClick={() => (screen.value = "runs")}>
        Corridas
      </button>
      {inGame && (
        <button type="button" onClick={() => confirm("¿Salir a una nueva partida? La actual queda guardada en «Corridas».") && (screen.value = "setup")}>
          Nueva partida
        </button>
      )}
    </header>
  );
}

function Game() {
  const s = store.state.value!;
  const [open, setOpen] = useState(false);
  const final = s.phase === "FINAL";
  const pendingChanges = store.changedIds.value.length;
  const hasErrors = Object.keys(store.errors.value).length > 0;
  const footer = !final && (
    <div class="stack" style={{ marginTop: "0.75rem" }}>
      {hasErrors && (
        <p class="error small" role="alert">
          Corrige las decisiones marcadas antes de confirmar.
        </p>
      )}
      <button type="button" class="btn-primary" disabled={hasErrors || store.busy.value} onClick={() => setOpen(true)} data-testid="review">
        Revisar y confirmar {engine.epochLabel(s.epoch)} {pendingChanges ? `(${pendingChanges} cambios)` : "(sin cambios)"}
      </button>
      {pendingChanges > 0 && (
        <button type="button" class="btn-ghost small" onClick={() => store.clearDraft()}>
          Descartar todos los cambios
        </button>
      )}
    </div>
  );
  return (
    <>
      <ThreeColumns
        left={<DecisionPanel store={store} tabs={TABS} labels={LABELS} globalOptions={OPTIONS} kpiNames={KPI_NAMES} footer={footer} />}
        center={final ? <FinalReport state={s} /> : <Dashboard state={s} />}
        right={<MessageInbox reports={s.history} epochLabel={(e) => engine.epochLabel(e)} kpiNames={KPI_NAMES} unit="día" period="mes" />}
      />
      <ConfirmDialog store={store} open={open} onClose={() => setOpen(false)} onConfirmed={() => window.scrollTo({ top: 0, behavior: "smooth" })} describe={describeValue} epochName={engine.epochLabel(s.epoch)} period="mes" />
    </>
  );
}
