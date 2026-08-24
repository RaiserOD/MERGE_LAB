import { GameApp } from "@app/GameApp";

const parent = document.getElementById("app");
if (!parent) {
  throw new Error("Root #app element is missing from index.html");
}

const app = new GameApp();
app.start(parent);
