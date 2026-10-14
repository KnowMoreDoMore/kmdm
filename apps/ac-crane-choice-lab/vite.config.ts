import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import config from "./cloudflare-worker.json";
import tailwindcss from "@tailwindcss/postcss";

export default defineConfig({
css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [vinext(), cloudflare({
    viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    inspectorPort: false,
    config,
  })],
});
