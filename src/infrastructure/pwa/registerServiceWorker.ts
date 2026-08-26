import { registerSW } from "virtual:pwa-register";

export interface ServiceWorkerCallbacks {
  /** Called when a new version is waiting; `reload()` activates it and reloads the page. */
  onNeedRefresh?: (reload: () => void) => void;
  onOfflineReady?: () => void;
}

/**
 * Registers the PWA service worker. `registerType: "prompt"` in
 * vite.config.ts means nothing installs, updates, or serves offline unless
 * this is called — the app shell (main.ts) is the only caller, so no
 * gameplay code needs to know a service worker exists.
 */
export function registerServiceWorker(callbacks: ServiceWorkerCallbacks = {}): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      callbacks.onNeedRefresh?.(() => {
        void updateSW(true);
      });
    },
    onOfflineReady() {
      callbacks.onOfflineReady?.();
    },
  });
}
