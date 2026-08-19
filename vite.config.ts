import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

function spaFallback(): Plugin {
  return {
    name: "dana-spa-404",
    closeBundle() {
      const index = resolve(root, "dist/index.html");
      if (existsSync(index)) {
        copyFileSync(index, resolve(root, "dist/404.html"));
      }
    },
  };
}

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react(), spaFallback()],
  resolve: {
    alias: { "@": resolve(root, "src") },
  },
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
