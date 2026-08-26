import { GameApp } from "@app/GameApp";
import { registerServiceWorker } from "@infrastructure/pwa/registerServiceWorker";
import { showUpdateBanner } from "@presentation/pwa/updateBanner";

registerServiceWorker({
  onNeedRefresh: (reload) => {
    showUpdateBanner(reload);
  },
});

const parent = document.getElementById("app");
if (!parent) {
  throw new Error("Root #app element is missing from index.html");
}

const app = new GameApp();
app.start(parent);
