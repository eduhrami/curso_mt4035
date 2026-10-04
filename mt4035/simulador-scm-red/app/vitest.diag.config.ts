import { defineConfig } from "vitest/config";

/** Scripts de diagnóstico y calibración (no forman parte de la suite). */
export default defineConfig({
  test: {
    include: ["scripts/**/*.diag.ts"],
    testTimeout: 600_000,
  },
});
