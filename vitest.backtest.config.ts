import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": resolve(root, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/backtest/**/*.test.ts"],
    testTimeout: 900_000,
    hookTimeout: 90_000,
    retry: 0,
    silent: false,
  },
});
