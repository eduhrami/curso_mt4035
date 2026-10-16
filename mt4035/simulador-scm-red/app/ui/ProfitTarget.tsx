/** Meta de utilidad de referencia para que el equipo se autoevalúe (región × propuesta × escenario de mercado). */
import { fmtMoney } from "@mt4035/ui-kit";
import type { GameState } from "@mt4035/sim-core";
import { EPOCHS, profitOf, profitTarget, type Scenario, type ScmState, type Strategy } from "../src/index.ts";
import { OPTIONS, REGION_TEXT, scenarioLabel } from "./labels.ts";
import { regionOf } from "./game.ts";

export function ProfitTargetCard({ state, final = false }: { state: GameState<ScmState>; final?: boolean }) {
  const scenario = state.config.scenario as Scenario;
  const t = profitTarget(scenario, state.model.strategy as Strategy, state.config.seed);
  if (!t) return null;
  const profit = profitOf(state.history);
  const played = state.history.length;
  const share = t.value > 0 ? profit / t.value : NaN;
  return (
    <div class="card stack" data-testid="profit-target">
      <h2 style={{ margin: 0 }}>Meta de referencia</h2>
      <p style={{ margin: 0 }}>
        Utilidad acumulada en 3 años: <strong data-testid="profit-target-value">{fmtMoney(t.value)}</strong> · {REGION_TEXT[regionOf(state)].title} ·{" "}
        {OPTIONS[state.model.strategy]} · {t.preset ? scenarioLabel(scenario) : "mercado base"}
      </p>
      {played > 0 && (
        <p style={{ margin: 0 }}>
          {final ? "Lograste" : `Llevas (${played} de ${EPOCHS} trimestres)`}: <strong>{fmtMoney(profit)}</strong>
          {Number.isFinite(share) ? ` · ${Math.round(share * 100)}% de la meta` : ""}
        </p>
      )}
      <p class="small muted" style={{ margin: 0 }}>
        Sirve para autoevaluarte. Es la mejor utilidad que obtuvimos en jugadas de prueba del simulador con decisiones bien alineadas a la región y a la propuesta, y con un pronóstico
        con ±10% de error. No es necesariamente el máximo posible: un equipo puede superarla.
        {!t.preset || !t.sameSeed ? " Tu partida no usa un escenario predefinido con su semilla, así que tómala solo como orientación." : ""}
      </p>
    </div>
  );
}
