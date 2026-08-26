import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Mobile packaging (ADR-0001/0003): wraps the same web build served by
 * `pnpm build` in a native WebView shell. No native-only code paths exist
 * yet — `webDir` points at the identical `dist/` output used for web/PWA,
 * so gameplay, save, and content loading behave identically on every
 * platform.
 *
 * `appId` is a placeholder reverse-DNS identifier, not a store-ready one:
 * an actual package/bundle id is a product decision (matches a Play
 * Console/App Store Connect listing) that needs to be made before any
 * store submission, not invented here.
 */
const config: CapacitorConfig = {
  appId: "com.mergelab.app",
  appName: "Merge Lab",
  webDir: "dist",
};

export default config;
