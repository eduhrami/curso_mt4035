import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { fileURLToPath } from "node:url";

const nm = (p: string) => fileURLToPath(new URL(`./node_modules/${p}`, import.meta.url));

/** Build de un solo HTML autocontenido (AD-01). Una sola copia de Preact/Chart.js aunque el ui-kit viva fuera. */
export default defineConfig({
  plugins: [preact(), viteSingleFile()],
  resolve: {
    dedupe: ["preact", "@preact/signals", "chart.js", "zod"],
    alias: [
      { find: /^@mt4035\/sim-core$/, replacement: nm("@mt4035/sim-core/src/index.ts") },
    ],
  },
  build: { outDir: "dist", target: "es2022", assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 2000 },
  server: { fs: { allow: [".."] } },
});
