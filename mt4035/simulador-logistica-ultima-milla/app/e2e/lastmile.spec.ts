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
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-json").click()]);
  const parsed = parseExport(readFileSync((await dl.path())!, "utf8"), "mt4035-lastmile");
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.epochsPlayed).toBe(36);
  expect(parsed.value.finalScore).toBeCloseTo(score, 1);
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
