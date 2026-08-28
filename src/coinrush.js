// Coin Rush - Minecraft Emerald & Gold Rush
// Collect floating 3D voxel Emeralds in a Minecraft arena.

import * as THREE from "three";
import { createScene3d } from "./scene3d.js";
import { getBlockMaterial, createVoxelBlock, markBloom } from "./gfx.js";
import { sfx } from "./audio.js";
import { createProgress } from "./progress.js";
import * as profile from "./profile.js";

const TIME = 45;

export function startCoinRush() {
  const rig = createScene3d({ x: 0, y: 1.5, z: 0 }, { bounds: 26 });
  const progress = createProgress();
  rig.addGround(30, "grass");

  // Minecraft Oak Trees around the arena
  function makeOakTree(x, z) {
    const tg = new THREE.Group();
    for (let y = 0; y < 3; y++) {
      const log = createVoxelBlock("log", 0.8, 0.8, 0.8);
      log.position.y = y * 0.8 + 0.4;
      tg.add(log);
    }
    const leaves = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.8, 2.8),
      getBlockMaterial("oak_leaves")
    );
    leaves.position.y = 3.0;
    leaves.castShadow = true;
    tg.add(leaves);

    tg.position.set(x, 0, z);
    rig.scene.add(tg);
  }

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, r = 23;
    makeOakTree(Math.cos(a) * r, Math.sin(a) * r);
  }

  // Scatter 3D Voxel Emeralds
  const emeraldMat = new THREE.MeshLambertMaterial({
    color: 0x17dd62,
    emissive: new THREE.Color(0x0a6b2c),
    emissiveIntensity: 0.4
  });
  const emeraldGeo = new THREE.OctahedronGeometry(0.4, 0);

  const coins = [];
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 21;
    const c = new THREE.Mesh(emeraldGeo, emeraldMat);
    c.scale.set(1.0, 1.4, 0.7);
    c.position.set(Math.cos(a) * r, 1.1, Math.sin(a) * r);
    c.userData.spin = Math.random() * Math.PI;
    markBloom(c);
    rig.scene.add(c);
    coins.push(c);
  }
  if (import.meta.env.DEV) window.__bbCoins = coins;

  // overlay HUD
  const hud = document.getElementById("mode-hud");
  hud.classList.remove("hidden");
  let collected = 0, timeLeft = TIME, over = false;
  function paint() {
    hud.innerHTML = `<span class="mh-pill">💎 ${collected}</span><span class="mh-pill ${timeLeft <= 10 ? "low" : ""}">⏱ ${Math.ceil(timeLeft)}</span>`;
  }
  paint();

  rig.run((dt) => {
    for (const c of coins) {
      if (!c.visible) continue;
      c.rotation.y += dt * 3.2;
      c.position.y = 1.1 + Math.sin((c.userData.spin += dt * 2.5)) * 0.18;
      if (
        !over &&
        Math.hypot(rig.player.pos.x - c.position.x, rig.player.pos.z - c.position.z) < 1.3 &&
        Math.abs(rig.player.pos.y - c.position.y) < 2
      ) {
        c.visible = false;
        collected++;
        profile.addCoins(1);
        sfx.coin();
        paint();
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
      <div class="win-emoji">${collected >= 18 ? "🏆" : collected >= 8 ? "🎉" : "💎"}</div>
      <h2>¡Se acabó el tiempo!</h2>
      <p class="win-stars">¡Conseguiste <b>${collected}</b> esmeraldas!<br>Nivel ${progress.info().level}</p>
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
