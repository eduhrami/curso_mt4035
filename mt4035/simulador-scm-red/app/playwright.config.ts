import { defineConfig } from "@playwright/test";

/** Pruebas de punta a punta sobre el HTML compilado (dist/index.html), como lo abre el alumno. */
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { browserName: "chromium", headless: true, viewport: { width: 1366, height: 900 } },
});
