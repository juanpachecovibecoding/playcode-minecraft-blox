// Coin Rush - a timed collect-a-thon. Run around a sunny arena grabbing as many
// glowing coins as you can before the clock runs out. Every coin = points + XP.

import * as THREE from "three";
import { createScene3d } from "./scene3d.js";
import { toonMat, markBloom } from "./gfx.js";
import { sfx } from "./audio.js";
import { createProgress } from "./progress.js";
import * as profile from "./profile.js";

const TIME = 45;

export function startCoinRush() {
  const rig = createScene3d({ x: 0, y: 1.5, z: 0 }, { bounds: 26 });
  const progress = createProgress();
  rig.addGround(30, 0x86d98a);

  // a few trees for scenery
  const trunkMat = toonMat(0x9a6b4f), leafMat = toonMat(0x57b85c, { flatShading: true });
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 1.4, 7), leafGeo = new THREE.IcosahedronGeometry(1.1, 0);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, r = 23;
    const g = new THREE.Group();
    const t = new THREE.Mesh(trunkGeo, trunkMat); t.position.y = 0.7;
    const l = new THREE.Mesh(leafGeo, leafMat); l.position.y = 1.9;
    g.add(t, l); g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); rig.scene.add(g);
  }

  // scatter coins
  const coinGeo = new THREE.TorusGeometry(0.34, 0.13, 8, 18);
  const coinMat = new THREE.MeshBasicMaterial({ color: 0xffcf3a });
  const coins = [];
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 21;
    const c = new THREE.Mesh(coinGeo, coinMat);
    c.position.set(Math.cos(a) * r, 1.1, Math.sin(a) * r);
    c.userData.spin = Math.random() * Math.PI;
    markBloom(c); rig.scene.add(c); coins.push(c);
  }
  if (import.meta.env.DEV) window.__bbCoins = coins;

  // overlay HUD
  const hud = document.getElementById("mode-hud");
  hud.classList.remove("hidden");
  let collected = 0, timeLeft = TIME, over = false;
  function paint() { hud.innerHTML = `<span class="mh-pill">🪙 ${collected}</span><span class="mh-pill ${timeLeft <= 10 ? "low" : ""}">⏱ ${Math.ceil(timeLeft)}</span>`; }
  paint();

  rig.run((dt) => {
    for (const c of coins) {
      if (!c.visible) continue;
      c.rotation.y += dt * 3;
      c.position.y = 1.1 + Math.sin((c.userData.spin += dt * 2)) * 0.15;
      if (!over && Math.hypot(rig.player.pos.x - c.position.x, rig.player.pos.z - c.position.z) < 1.3 && Math.abs(rig.player.pos.y - c.position.y) < 2) {
        c.visible = false; collected++; profile.addCoins(1); sfx.coin(); paint();
      }
    }
    if (over) return;
    timeLeft -= dt;
    if (Math.ceil(timeLeft) !== Math.ceil(timeLeft + dt)) paint();
    if (timeLeft <= 0) end();
  });

  function end() {
    over = true;
    hud.classList.add("hidden");
    sfx.win();
    progress.addXp(collected * 3);
    const res = document.getElementById("mode-result");
    res.innerHTML = `<div class="result-card">
      <div class="win-emoji">${collected >= 18 ? "🏆" : collected >= 8 ? "🎉" : "🪙"}</div>
      <h2>¡Se acabó el tiempo!</h2>
      <p class="win-stars">Agarraste <b>${collected}</b> monedas!<br>Nivel ${progress.info().level}</p>
      <button class="btn btn-big btn-accent" id="cr-again">Jugar de nuevo</button>
    </div>`;
    res.classList.remove("hidden");
    res.querySelector("#cr-again").addEventListener("click", () => location.reload());
  }

  function destroy() {
    hud.classList.add("hidden");
    document.getElementById("mode-result").classList.add("hidden");
    document.getElementById("mode-result").innerHTML = "";
    rig.destroy();
  }
  return { destroy };
}
