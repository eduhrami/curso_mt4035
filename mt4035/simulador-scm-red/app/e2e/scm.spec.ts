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

async function playEpoch(page: Page) {
  const before = await page.getByTestId("epoch-label").textContent();
  await page.getByTestId("review").click();
  await page.getByTestId("confirm-run").click();
  await expect(page.getByTestId("epoch-label")).not.toHaveText(before ?? "");
}

test("partida completa de 20 trimestres en Kaigan y exportación verificable con replay", async ({ page }) => {
  const errors = await begin(page, "Kaigan");
  for (let i = 0; i < 20; i++) await playEpoch(page);
  await expect(page.getByTestId("epoch-label")).toHaveText("Partida terminada");
  await expect(page.getByTestId("final-report")).toBeVisible();
  const score = Number(await page.getByTestId("final-score").textContent());
  expect(score).toBeGreaterThan(0);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-json").click()]);
  const parsed = parseExport(readFileSync((await dl.path())!, "utf8"), "mt4035-scm");
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.epochsPlayed).toBe(20);
  expect(parsed.value.finalScore).toBeCloseTo(score, 1);
  const r = await replay(createScmEngine(), parsed.value, { simVersion: SIM_VERSION, paramsVersion: PARAMS_VERSION });
  expect(r.ok).toBe(true);
  expect(errors).toEqual([]);
});

test("agregar un CD pide confirmar lo irreversible y queda como proyecto en curso", async ({ page }) => {
  await begin(page, "Red River");
  await page.getByRole("tab", { name: "Red" }).click();
  await page.getByRole("button", { name: /Agregar CD/ }).click();
  await page.getByTestId("review").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("D-01")).toBeVisible();
  await expect(page.getByTestId("confirm-run")).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await page.getByTestId("confirm-run").click();
  await expect(page.getByText(/Proyectos en curso: 1/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Mensajes/ })).toBeVisible();
});

test("una decisión inválida muestra el error y bloquea la confirmación", async ({ page }) => {
  await begin(page, "Red River");
  await page.getByRole("tab", { name: "Flujo" }).click();
  await page.getByRole("radiogroup", { name: /Ambiente/ }).getByRole("radio", { name: "Por CD" }).click();
  await expect(page.getByRole("alert").first()).toContainText("al menos un CD");
  await expect(page.getByTestId("review")).toBeDisabled();
});

test("al recargar, la corrida guardada se puede continuar", async ({ page }) => {
  await begin(page, "Valle Metropolitano");
  await playEpoch(page);
  await playEpoch(page);
  await page.reload();
  await page.getByRole("button", { name: /Corridas guardadas/ }).click();
  await page.getByRole("button", { name: "Continuar" }).first().click();
  await expect(page.getByTestId("epoch-label")).toContainText("3/20");
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
  await expect(page.getByTestId("epoch-label")).toContainText("2/20");
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
  await expect(page.getByTestId("scenario-label")).toContainText("EM-03");
});
