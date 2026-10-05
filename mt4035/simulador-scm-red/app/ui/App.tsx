/** Raíz de la app SCM: barra superior, configuración, partida (3 columnas) y corridas. */
import { useState } from "preact/hooks";
import { ConfirmDialog, DecisionPanel, download, MessageInbox, StorageBanner, ThreeColumns, fmtMoney } from "@mt4035/ui-kit";
import { DcEditor } from "./DcEditor.tsx";
import { Dashboard } from "./Dashboard.tsx";
import { FinalReport } from "./FinalReport.tsx";
import { Runs } from "./Runs.tsx";
import { Setup } from "./Setup.tsx";
import { engine, professor, projectsInProgress, regionOf, screen, store } from "./game.ts";
import { describeValue, KPI_NAMES, LABELS, OPTIONS, REGION_TEXT, scenarioLabel, TABS } from "./labels.ts";
import { params, type DcSpec, type ScmState } from "../src/index.ts";
import type { GameState } from "@mt4035/sim-core";

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
  const exportJson = async () => {
    if (!s) return;
    download(`hoshi-mart-${regionOf(s)}-${s.config.seed}-${s.history.length}de20.json`, JSON.stringify(await store.exportRun(), null, 2));
  };
  return (
    <header class="topbar">
      <span class="brand">★ Hoshi Mart</span>
      {inGame && (
        <>
          <span>{REGION_TEXT[regionOf(s)].title}</span>
          <span class="chip" data-testid="epoch-label">
            {s.phase === "FINAL" ? "Partida terminada" : `Trimestre ${engine.epochLabel(s.epoch)} · ${s.epoch + 1}/20`}
          </span>
          <span class="chip">Estrategia: {OPTIONS[s.model.strategy]}</span>
          <span class="chip" data-testid="scenario-label">{scenarioLabel(s.config.scenario)}</span>
          <span class="chip" title="Inversión acumulada (capex y penalizaciones)">
            Inversión: {fmtMoney(capex)}
          </span>
          {projectsInProgress(s).length > 0 && (
            <span class="chip badge-info" title={projectsInProgress(s).join("\n")}>
              Proyectos en curso: {projectsInProgress(s).length}
            </span>
          )}
          {professor && <span class="chip badge-warn">Modo profesor</span>}
        </>
      )}
      <span class="spacer" />
      {/* Al terminar, la exportación pasa por el debrief del reporte final (AD-31). */}
      {inGame && s.phase !== "FINAL" && (
        <button type="button" onClick={exportJson} title="Guarda la partida en curso para continuarla en otro equipo">
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

/** Cuándo surte efecto cada cambio de la red: los CD nuevos tardan según su tamaño; conversiones y ampliaciones también. */
function networkEffect(s: GameState<ScmState>, to: DcSpec[]): string {
  const cur = new Map(s.model.dcs.map((d) => [d.id, d]));
  const notes = to.flatMap((d) => {
    const c = cur.get(d.id);
    if (!c) return [`${d.id} opera en ${engine.epochLabel(s.epoch + params.dc.buildLagEpochs[d.size])}`];
    return [...(c.type !== d.type ? [`${d.id} convertido en ${engine.epochLabel(s.epoch + params.dc.convertLagEpochs)}`] : []), ...(c.size !== d.size ? [`${d.id} ampliado en ${engine.epochLabel(s.epoch + params.dc.expandLagEpochs)}`] : [])];
  });
  const closed = s.model.dcs.filter((d) => !to.some((x) => x.id === d.id)).map((d) => `${d.id} cierra este trimestre`);
  return [...notes, ...closed].join(" · ") || "este trimestre";
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
        left={<DecisionPanel store={store} tabs={TABS} labels={LABELS} globalOptions={OPTIONS} kpiNames={KPI_NAMES} custom={{ "D-01": DcEditor }} footer={footer} />}
        center={final ? <FinalReport state={s} /> : <Dashboard state={s} />}
        right={<MessageInbox reports={s.history} epochLabel={(e) => engine.epochLabel(e)} kpiNames={KPI_NAMES} />}
      />
      <ConfirmDialog store={store} open={open} onClose={() => setOpen(false)} onConfirmed={() => window.scrollTo({ top: 0, behavior: "smooth" })} describe={describeValue} epochName={engine.epochLabel(s.epoch)} effect={(id, to) => (id === "D-01" ? networkEffect(s, to as DcSpec[]) : undefined)} />
    </>
  );
}
