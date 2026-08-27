import { defineConfig } from "vite";

/**
 * Build config for the standalone demo artifact — a single HTML file that
 * runs from `file://` with no server.
 *
 * This is NOT the shipped build. `vite.config.ts` is, and it stays as it is:
 * absolute asset paths, a service worker, and the strict CSP in index.html.
 * Those are correct for a hosted page and are exactly what makes the hosted
 * bundle unopenable as a local file — absolute `/assets/...` paths resolve
 * to the filesystem root, module scripts are blocked by CORS under file://,
 * and `script-src 'self'` matches nothing when the origin is null.
 *
 * So the demo differs deliberately:
 *   - relative base, so paths resolve next to the file
 *   - no PWA plugin: a service worker cannot register from file://
 *   - one chunk, later inlined into the HTML by tools/demo-build
 */
export default defineConfig({
  base: "./",
  build: {
    outDir: "demo-dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // One file to inline. The production split (engine vs game) is a
        // caching optimisation that means nothing for a local artifact.
        manualChunks: undefined,
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      // A service worker cannot register from file://, and without the PWA
      // plugin the virtual module does not exist to import at all.
      "virtual:pwa-register": "/tools/demo-build/pwa-register-stub.ts",
      "@app": "/src/app",
      "@domain": "/src/domain",
      "@systems": "/src/systems",
      "@application": "/src/application",
      "@presentation": "/src/presentation",
      "@infrastructure": "/src/infrastructure",
      "@config": "/src/config",
    },
  },
});
