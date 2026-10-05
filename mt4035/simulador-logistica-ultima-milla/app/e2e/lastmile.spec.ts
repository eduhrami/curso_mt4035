/** Prueba de punta a punta del simulador de última milla sobre dist/index.html (AD-15). */
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseExport, replay } from "@mt4035/sim-core";
import { createLastMileEngine, PARAMS_VERSION, SIM_VERSION } from "../src/index.ts";

const url = (q = "") => `file://${fileURLToPath(new URL("../dist/index.html", import.meta.url))}${q}`;

async function begin(page: Page, territory: "Megalópolis Centro" | "Ciudad Bajío" | "Región Norte", q = "") {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(url(q));
  await page.getByRole("radio", { name: new RegExp(`^${territory}`) }).click();
  await page.getByTestId("start").click();
  return errors;
}

async function playEpoch(page: Page) {
  const before = await page.getByTestId("epoch-label").textContent();
  await page.getByTestId("review").click();
  await page.getByTestId("confirm-run").click();
  await expect(page.getByTestId("epoch-label")).not.toHaveText(before ?? "");
}

test("partida completa de 36 meses en Ciudad Bajío y exportación verificable con replay", async ({ page }) => {
  const errors = await begin(page, "Ciudad Bajío");
  for (let i = 0; i < 36; i++) await playEpoch(page);
  await expect(page.getByTestId("epoch-label")).toHaveText("Partida terminada");
  await expect(page.getByTestId("final-report")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Picos enfrentados" })).toBeVisible();
  const score = Number(await page.getByTestId("final-score").textContent());
  expect(score).toBeGreaterThan(0);
  // El JSON solo se exporta con el debrief completo (AD-31).
  await expect(page.getByTestId("export-json")).toBeDisabled();
  const boxes = page.getByTestId("debrief").locator("textarea");
  await expect(boxes).toHaveCount(6);
  for (let i = 0; i < 6; i++) await boxes.nth(i).fill(`Respuesta ${i + 1}: decisión, mecanismo y KPI observados en la corrida con datos concretos.`);
  await expect(page.getByTestId("export-json")).toBeEnabled();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-json").click()]);
  const parsed = parseExport(readFileSync((await dl.path())!, "utf8"), "mt4035-lastmile");
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.epochsPlayed).toBe(36);
  expect(parsed.value.finalScore).toBeCloseTo(score, 1);
  expect(parsed.value.debrief?.complete).toBe(true);
  expect(parsed.value.debrief?.answers.map((a) => a.id)).toEqual(["DB-01", "DB-02", "DB-03", "DB-04", "DB-05", "DB-06"]);
  const r = await replay(createLastMileEngine(), parsed.value, { simVersion: SIM_VERSION, paramsVersion: PARAMS_VERSION });
  expect(r.ok).toBe(true);
  expect(errors).toEqual([]);
});

test("abrir una dark store pide confirmar lo irreversible y queda como proyecto en curso", async ({ page }) => {
  await begin(page, "Megalópolis Centro");
  await page.getByRole("tab", { name: "Red" }).click();
  await page.getByRole("slider", { name: /Dark stores/ }).fill("1");
  await page.getByTestId("review").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("D-04")).toBeVisible();
  await expect(dialog.getByText("A1-M04")).toBeVisible();
  await expect(page.getByTestId("confirm-run")).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await page.getByTestId("confirm-run").click();
  await expect(page.getByText(/Proyectos en curso: 1/)).toBeVisible();
  await expect(page.getByText(/Inversión: US\$ 600,000/)).toBeVisible();
});

test("una decisión incompatible muestra el error y bloquea la confirmación", async ({ page }) => {
  await begin(page, "Megalópolis Centro");
  await page.getByRole("tab", { name: "Zonas y ruteo" }).click();
  await page.getByRole("radiogroup", { name: /Función de costo/ }).getByRole("radio", { name: "Tiempo según la hora" }).click();
  await expect(page.getByRole("alert").first()).toContainText("telemetría");
  await expect(page.getByTestId("review")).toBeDisabled();
});

test("con el reporte en p95 las tarjetas muestran los días críticos y la serie diaria", async ({ page }) => {
  await begin(page, "Megalópolis Centro");
  await page.getByRole("tab", { name: "Datos y seguridad" }).click();
  await page.getByRole("radiogroup", { name: /reporte/ }).getByRole("radio", { name: /p95/ }).click();
  await playEpoch(page);
  await expect(page.getByRole("list", { name: "Indicadores del mes" }).getByText("OTD p95", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Días de A1-M01/ })).toBeVisible();
});

test("al recargar, la corrida guardada se puede continuar", async ({ page }) => {
  await begin(page, "Región Norte");
  await playEpoch(page);
  await playEpoch(page);
  await page.reload();
  await page.getByRole("button", { name: /Corridas guardadas/ }).click();
  await page.getByRole("button", { name: "Continuar" }).first().click();
  await expect(page.getByTestId("epoch-label")).toContainText("3/36");
});

test("si el navegador bloquea localStorage, avisa y el juego sigue en memoria", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("SecurityError");
      },
    });
  });
  await begin(page, "Ciudad Bajío");
  await expect(page.getByRole("status").first()).toContainText("exporta tu corrida");
  await playEpoch(page);
  await expect(page.getByTestId("epoch-label")).toContainText("2/36");
});

test("en móvil (360 px) no hay scroll horizontal y las vistas se cambian con pestañas", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await begin(page, "Megalópolis Centro");
  await page.getByRole("tab", { name: "Decisiones" }).click();
  await playEpoch(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.getByRole("tab", { name: "Mensajes" }).click();
  await expect(page.getByRole("heading", { name: /^Mensajes/ })).toBeVisible();
});

test("el modo profesor muestra el puntaje parcial durante el juego", async ({ page }) => {
  await begin(page, "Región Norte", "?profesor=1");
  await playEpoch(page);
  await expect(page.getByText("Modo profesor · puntaje parcial:")).toBeVisible();
});

test("los escenarios predefinidos fijan perfil y semilla; «Crear mi propio escenario» abre el perfil avanzado", async ({ page }) => {
  await page.goto(url());
  await page.getByTestId("preset-EM-02").click();
  await expect(page.locator('input[type="number"]')).toHaveValue("5202");
  await page.getByTestId("preset-custom").click();
  await page.locator("details label", { hasText: "Gasolina" }).locator("select").selectOption("volatile");
  await page.getByRole("radio", { name: /^Ciudad Bajío/ }).click();
  await page.getByTestId("start").click();
  await expect(page.getByTestId("scenario-label")).toHaveText("Escenario propio");
});

test("una corrida con escenario predefinido lo muestra en la barra superior", async ({ page }) => {
  await page.goto(url());
  await page.getByTestId("preset-EM-03").click();
  await page.getByRole("radio", { name: /^Ciudad Bajío/ }).click();
  await page.getByTestId("start").click();
  await expect(page.getByTestId("scenario-label")).toHaveText("Margen apretado");
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
