/**
 * Minimal DOM banner for the PWA update prompt. Plain DOM, not Phaser — it
 * sits above the canvas as part of the app shell, not gameplay UI, so it
 * has no business going through a Scene.
 */
export function showUpdateBanner(onReload: () => void): void {
  const banner = document.createElement("div");
  banner.textContent = "A new version is available. ";
  banner.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:1000;display:flex;" +
    "align-items:center;justify-content:center;gap:12px;padding:10px;" +
    "background:#16202a;color:#e8eef4;font:14px system-ui,sans-serif;";

  const button = document.createElement("button");
  button.textContent = "Reload";
  button.style.cssText =
    "padding:6px 14px;border-radius:6px;border:none;background:#3d8bfd;" +
    "color:#fff;font:inherit;cursor:pointer;";
  button.addEventListener("click", onReload);

  banner.appendChild(button);
  document.body.appendChild(banner);
}
