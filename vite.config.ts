import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src/pwa",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"]
      },
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "mask-icon.svg"],
      manifest: {
        name: "Cubism",
        short_name: "Cubism",
        description: "Offlinefähiger 3x3- und 4x4-Rubik's-Cube-Solver mit visuellem Playback.",
        theme_color: "#f1eee2",
        background_color: "#11110f",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "/pwa-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "/mask-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src")
    }
  },
  worker: {
    format: "es"
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    exclude: ["tests/**", "**/node_modules/**", "**/dist/**"]
  }
});
