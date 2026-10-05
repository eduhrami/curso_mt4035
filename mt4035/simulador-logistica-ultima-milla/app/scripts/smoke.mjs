// Corrida de humo de la UI con capturas (uso local de desarrollo): node scripts/smoke.mjs <carpeta>
import { chromium } from "@playwright/test";
const out = process.argv[2] ?? ".";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`file://${process.cwd()}/dist/index.html`);
await page.screenshot({ path: `${out}/1-setup.png`, fullPage: true });
await page.getByRole("radio", { name: /^Megalópolis/ }).click();
await page.getByTestId("start").click();
await page.screenshot({ path: `${out}/2-inicio.png` });
await page.getByRole("tab", { name: "Promesa" }).click();
await page.locator(".col-decisions, [data-decision]").first().screenshot({ path: `${out}/3-promesa.png` }).catch(() => {});
await page.getByRole("tab", { name: "Datos y seguridad" }).click();
await page.getByRole("radiogroup", { name: /reporte/i }).getByRole("radio", { name: /p95/ }).click().catch((e) => errors.push("D-61: " + e.message));
await page.getByTestId("review").click();
await page.screenshot({ path: `${out}/4-confirm.png` });
await page.getByTestId("confirm-run").click();
for (let i = 0; i < 10; i++) { await page.getByTestId("review").click(); await page.getByTestId("confirm-run").click(); await page.waitForTimeout(30); }
await page.screenshot({ path: `${out}/5-dashboard.png`, fullPage: true });
for (let i = 0; i < 25; i++) { await page.getByTestId("review").click(); await page.getByTestId("confirm-run").click(); await page.waitForTimeout(30); }
await page.screenshot({ path: `${out}/6-final.png`, fullPage: true });
console.log("errores:", JSON.stringify(errors));
await browser.close();
