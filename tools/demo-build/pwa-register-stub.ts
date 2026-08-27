/**
 * Stand-in for `virtual:pwa-register` in the standalone demo build.
 *
 * The demo runs from `file://`, where a service worker cannot register at
 * all, so the real module has nothing to do there — and without the PWA
 * plugin the virtual module does not exist to import. This keeps
 * `main.ts` unchanged: the app shell still calls registerServiceWorker,
 * and in the demo that call is simply inert.
 */
export function registerSW(): (reloadPage?: boolean) => Promise<void> {
  return () => Promise.resolve();
}
