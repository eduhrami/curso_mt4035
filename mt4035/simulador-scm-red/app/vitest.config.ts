import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
      testTimeout: 120_000,
    },
  }),
);
