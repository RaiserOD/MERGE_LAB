import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

// Security note: keep CSP-relevant third-party origins (ads/analytics/billing
// SDKs) out of this config's default allowlist — infrastructure adapters load
// them explicitly, never the app shell.
export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Merge Lab",
        short_name: "MergeLab",
        description: "Restore an abandoned laboratory by merging and discovering materials.",
        theme_color: "#101820",
        background_color: "#101820",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        // Scope the service worker narrowly; never cache save data or
        // anything under /api (no backend in MVP, but keep the boundary
        // explicit for when one is added).
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: {
      "@app": "/src/app",
      "@domain": "/src/domain",
      "@systems": "/src/systems",
      "@application": "/src/application",
      "@presentation": "/src/presentation",
      "@infrastructure": "/src/infrastructure",
      "@config": "/src/config",
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/domain/**", "src/systems/**", "src/application/**"],
    },
  },
});
