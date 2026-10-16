/** Prueba de punta a punta del simulador SCM sobre dist/index.html (AD-15). */
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseExport, replay } from "@mt4035/sim-core";
import { createScmEngine, PARAMS_VERSION, SIM_VERSION } from "../src/index.ts";

const url = (q = "") => `file://${fileURLToPath(new URL("../dist/index.html", import.meta.url))}${q}`;

async function begin(page: Page, region: "Kaigan" | "Red River" | "Valle Metropolitano", q = "") {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(url(q));
  await page.getByRole("radio", { name: new RegExp(`^${region}`) }).click();
  await page.getByTestId("start").click();
  return errors;
}

/** Captura un pronóstico plausible (A1: formulario en blanco; A2 y A3: parte del anterior). */
async function captureForecast(page: Page) {
  await page.getByRole("tab", { name: "Pronóstico" }).click();
  const editor = page.getByTestId("forecast-editor");
  const inputs = editor.locator("input");
  if (!(await inputs.first().inputValue())) {
    const values = ["2000", "3", "0.95", "1.02", "1.08", "0.95", "5", "2300"];
    for (let i = 0; i < values.length; i++) await inputs.nth(i).fill(values[i]!);
  } else await editor.getByTestId("capture-forecast").click();
  await expect(page.getByTestId("review")).toBeEnabled();
}

async function playEpoch(page: Page) {
  const before = await page.getByTestId("epoch-label").textContent();
  if (await page.getByTestId("review").isDisabled()) await captureForecast(page);
  await page.getByTestId("review").click();
  await page.getByTestId("confirm-run").click();
  await expect(page.getByTestId("epoch-label")).not.toHaveText(before ?? "");
}

test("partida completa de 12 trimestres en Kaigan y exportación verificable con replay", async ({ page }) => {
  const errors = await begin(page, "Kaigan");
  for (let i = 0; i < 12; i++) await playEpoch(page);
  await expect(page.getByTestId("epoch-label")).toHaveText("Partida terminada");
  await expect(page.getByTestId("final-report")).toBeVisible();
  const score = Number(await page.getByTestId("final-score").getAttribute("data-value"));
  expect(Number.isFinite(score)).toBe(true);
  // El JSON solo se exporta con el debrief completo (AD-31).
  await expect(page.getByTestId("export-json")).toBeDisabled();
  const boxes = page.getByTestId("debrief").locator("textarea");
  await expect(boxes).toHaveCount(7);
  for (let i = 0; i < 7; i++) await boxes.nth(i).fill(`Respuesta ${i + 1}: decisión, mecanismo y KPI observados en la corrida con datos concretos.`);
  await expect(page.getByTestId("export-json")).toBeEnabled();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-json").click()]);
  const parsed = parseExport(readFileSync((await dl.path())!, "utf8"), "mt4035-scm");
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.epochsPlayed).toBe(12);
  expect(parsed.value.finalScore).toBeCloseTo(score, 1);
  expect(parsed.value.debrief?.complete).toBe(true);
  expect(parsed.value.debrief?.answers.map((a) => a.id)).toEqual(["DB-01", "DB-02", "DB-03", "DB-04", "DB-05", "DB-06", "DB-07"]);
  const r = await replay(createScmEngine(), parsed.value, { simVersion: SIM_VERSION, paramsVersion: PARAMS_VERSION });
  expect(r.ok).toBe(true);
  expect(errors).toEqual([]);
});

test("agregar un CEDIS pide confirmar lo irreversible y queda como proyecto en curso", async ({ page }) => {
  await begin(page, "Red River");
  await captureForecast(page);
  await page.getByRole("tab", { name: "Red" }).click();
  await page.getByRole("button", { name: /Agregar CEDIS/ }).click();
  await page.getByTestId("review").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Red de CEDIS/).first()).toBeVisible();
  await expect(page.getByTestId("confirm-run")).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await page.getByTestId("confirm-run").click();
  await expect(page.getByText(/Proyectos en curso: 1/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Mensajes/ })).toBeVisible();
});

test("un turno que excede el tope de inversión anual muestra el aviso y no se puede confirmar", async ({ page }) => {
  await begin(page, "Red River");
  await captureForecast(page);
  await page.getByRole("tab", { name: "Red" }).click();
  // Tres CEDIS medianos con inventario en Red River: ~US$ 17.9 M contra un tope de US$ 12 M.
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /Agregar CEDIS/ }).click();
  await expect(page.getByRole("alert").first()).toContainText("Tope de inversión de A1");
  await expect(page.getByTestId("review")).toBeDisabled();
});

test("una decisión inválida muestra el error y bloquea la confirmación", async ({ page }) => {
  await begin(page, "Red River");
  await page.getByRole("tab", { name: "Flujo" }).click();
  await page.getByRole("radio", { name: "Combinada por temperatura" }).click();
  await expect(page.getByRole("alert").first()).toContainText("requiere un CEDIS combinado");
  await expect(page.getByTestId("review")).toBeDisabled();
});

test("al recargar, la corrida guardada se puede continuar", async ({ page }) => {
  await begin(page, "Valle Metropolitano");
  await playEpoch(page);
  await playEpoch(page);
  await page.reload();
  await page.getByRole("button", { name: /Corridas guardadas/ }).click();
  await page.getByRole("button", { name: "Continuar" }).first().click();
  await expect(page.getByTestId("epoch-label")).toContainText("3/12");
});

test("si el navegador bloquea localStorage, avisa y el juego sigue en memoria", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("SecurityError");
      },
    });
  });
  await begin(page, "Kaigan");
  await expect(page.getByRole("status").first()).toContainText("exporta tu corrida");
  await playEpoch(page);
  await expect(page.getByTestId("epoch-label")).toContainText("2/12");
});

test("en móvil (360 px) no hay scroll horizontal y las vistas se cambian con pestañas", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await begin(page, "Red River");
  await page.getByRole("tab", { name: "Decisiones" }).click();
  await playEpoch(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.getByRole("tab", { name: "Mensajes" }).click();
  await expect(page.getByRole("heading", { name: /^Mensajes/ })).toBeVisible();
});

test("el modo profesor muestra el puntaje parcial durante el juego", async ({ page }) => {
  await begin(page, "Kaigan", "?profesor=1");
  await playEpoch(page);
  await expect(page.getByText("Modo profesor · puntaje parcial:")).toBeVisible();
});

test("los escenarios predefinidos fijan perfil y semilla; «Crear mi propio escenario» abre el perfil avanzado", async ({ page }) => {
  await page.goto(url());
  await page.getByTestId("preset-EM-02").click();
  await expect(page.locator('input[type="number"]')).toHaveValue("4202");
  await page.getByTestId("preset-custom").click();
  await page.locator("details label", { hasText: "Combustible" }).locator("select").selectOption("rising");
  await page.getByRole("radio", { name: /^Kaigan/ }).click();
  await page.getByTestId("start").click();
  await expect(page.getByTestId("scenario-label")).toHaveText("Escenario propio");
});

test("una corrida con escenario predefinido lo muestra en la barra superior", async ({ page }) => {
  await page.goto(url());
  await page.getByTestId("preset-EM-03").click();
  await page.getByRole("radio", { name: /^Kaigan/ }).click();
  await page.getByTestId("start").click();
  await expect(page.getByTestId("scenario-label")).toHaveText("Presión de costos");
  // Meta de utilidad de referencia para autoevaluarse (región × propuesta × escenario).
  await expect(page.getByTestId("profit-target")).toContainText("jugadas de prueba");
  await expect(page.getByTestId("profit-target-value")).toContainText("US$");
});

test("el glosario se abre desde el inicio y los términos muestran su definición al pasar el mouse", async ({ page }) => {
  await page.goto(url());
  await page.getByTestId("setup-glossary").click();
  const dialog = page.getByTestId("glossary");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox").fill("OTIF");
  await expect(dialog.locator("dt")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Cerrar glosario" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("abbr.gloss").first()).toHaveAttribute("title", /.+: .+/);
});

test("el pronóstico es obligatorio en T1 de cada año y los datos de demanda se descargan", async ({ page }) => {
  await begin(page, "Valle Metropolitano");
  await expect(page.getByTestId("review")).toBeDisabled();
  await page.getByRole("tab", { name: "Pronóstico" }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("download-demand").click()]);
  const lines = readFileSync((await dl.path())!, "utf8").trim().split("\n");
  expect(lines[0]).toBe("semana,anio,trimestre,semana_del_anio,frescos,refrigerado,ambiente,congelado,total");
  expect(lines).toHaveLength(1 + 104);
  await captureForecast(page);
  for (let i = 0; i < 4; i++) await playEpoch(page);
  await expect(page.getByTestId("epoch-label")).toContainText("5/12");
  await expect(page.getByTestId("review")).toBeDisabled();
  await page.getByRole("tab", { name: "Pronóstico" }).click();
  const [dl2] = await Promise.all([page.waitForEvent("download"), page.getByTestId("download-demand").click()]);
  expect(readFileSync((await dl2.path())!, "utf8").trim().split("\n")).toHaveLength(1 + 104 + 52);
  await captureForecast(page);
  await expect(page.getByText("Pronóstico contra demanda")).toBeVisible();
});

test("«¿Cómo impacta?» explica cada decisión y el mapa ubica las plantas de proveedores", async ({ page }) => {
  await begin(page, "Kaigan");
  await page.getByRole("tab", { name: "Red" }).click();
  const d01 = page.locator('[data-decision="D-01"]');
  await expect(d01.getByText("Mueve:")).toHaveCount(0);
  await d01.getByRole("button", { name: /¿Cómo impacta/ }).hover();
  await expect(d01.getByRole("tooltip")).toContainText("Más CEDIS acercan la mercancía");
  await expect(page.getByTestId("site-P-FR").first()).toBeVisible();
  await expect(page.locator("figcaption").first()).toContainText("Planta dedicada de alimentos preparados — zona 12");
  await expect(page.getByTestId("budget-chip")).toContainText("Inversión A1");
  // Los códigos internos (D-xx, R-xx, X-xx, E-xx) no aparecen en ninguna pestaña ni tras jugar un trimestre.
  const noCodes = async () => expect(await page.locator("body").innerText()).not.toMatch(/\b(AD|DB|EM|D|R|X|E|K|F)-\d{2}\b/);
  for (const tab of ["Pronóstico", "Estrategia", "Red", "Flujo", "Inventario", "Información"]) {
    const t = page.getByRole("tab", { name: tab, exact: true });
    if (await t.count()) {
      await t.first().click();
      await noCodes();
    }
  }
  await playEpoch(page);
  await noCodes();
});
