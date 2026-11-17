import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    cloudflare({ viteEnvironment: { name: "worker" } }),
  ],
  environments: {
    worker: { build: { sourcemap: true } },
  },
  server: {
    host: "0.0.0.0",
    port: 4471,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4471,
    strictPort: true,
  },
});
