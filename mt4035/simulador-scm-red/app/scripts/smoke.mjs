// Corrida de humo de la UI con capturas (uso local de desarrollo): node scripts/smoke.mjs <carpeta>
import { chromium } from "@playwright/test";
const out = process.argv[2] ?? ".";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`file://${process.cwd()}/dist/index.html`);
await page.getByRole("radio", { name: /^Red River/ }).click();
await page.getByTestId("start").click();
await page.getByRole("tab", { name: "Red" }).click();
await page.getByRole("button", { name: /Agregar CD/ }).click();
await page.locator('[data-decision="D-01"]').screenshot({ path: `${out}/5-dc-editor.png` });
await page.getByTestId("review").click();
await page.screenshot({ path: `${out}/6-confirm.png` });
await page.getByRole("dialog").getByRole("checkbox").check();
await page.getByTestId("confirm-run").click();
for (let i = 0; i < 19; i++) { await page.getByTestId("review").click(); await page.getByTestId("confirm-run").click(); await page.waitForTimeout(50); }
await page.locator(".col-dashboard").screenshot({ path: `${out}/7-final.png` });
console.log("errores:", JSON.stringify(errors));
await browser.close();
