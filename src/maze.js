// Maze - Minecraft Voxel Hedge & Stone Brick Labyrinth
// Find your way to the glowing Beacon / Nether Star in the corner.

import * as THREE from "three";
import { createScene3d } from "./scene3d.js";
import { getBlockMaterial, markBloom } from "./gfx.js";
import { sfx } from "./audio.js";
import { createProgress } from "./progress.js";

const N = 6;
const S = 4;
const O = ((N - 1) * S) / 2;

export function startMaze(goHome, restart) {
  const progress = createProgress();
  const spawn = { x: -O, y: 1.5, z: -O };
  const rig = createScene3d(spawn, { camDist: 4, camHeight: 13 });
  rig.addGroundPlane((N + 1) * S, (N + 1) * S, "dirt");

  // Cobblestone path on floor
  const floorMesh = new THREE.Mesh(
    new THREE.BoxGeometry((N + 0.5) * S, 0.05, (N + 0.5) * S),
    getBlockMaterial("cobblestone")
  );
  floorMesh.position.set(0, 0.03, 0);
  floorMesh.receiveShadow = true;
  rig.scene.add(floorMesh);

  // ---- Carve the maze (recursive backtracker) ----
  const east = Array.from({ length: N }, () => Array(N).fill(true));
  const south = Array.from({ length: N }, () => Array(N).fill(true));
  const seen = Array.from({ length: N }, () => Array(N).fill(false));
  const stack = [[0, 0]];
  seen[0][0] = true;

  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const nb = [];
    if (r > 0 && !seen[r - 1][c]) nb.push([r - 1, c, "N"]);
    if (r < N - 1 && !seen[r + 1][c]) nb.push([r + 1, c, "S"]);
    if (c > 0 && !seen[r][c - 1]) nb.push([r, c - 1, "W"]);
    if (c < N - 1 && !seen[r][c + 1]) nb.push([r, c + 1, "E"]);
    if (!nb.length) {
      stack.pop();
      continue;
    }
    const [nr, nc, dir] = nb[Math.floor(Math.random() * nb.length)];
    if (dir === "E") east[r][c] = false;
    if (dir === "W") east[nr][nc] = false;
    if (dir === "S") south[r][c] = false;
    if (dir === "N") south[nr][nc] = false;
    seen[nr][nc] = true;
    stack.push([nr, nc]);
  }

  // ---- Build walls (Minecraft Oak Leaves & Stone Bricks) ----
  const leafMat = getBlockMaterial("oak_leaves");
  const stoneMat = getBlockMaterial("stone_brick");
  const H = 4.0, T = 0.8;

  function wall(cx, cz, sx, sz, useStone = false) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, H, sz), useStone ? stoneMat : leafMat);
    m.position.set(cx, H / 2, cz);
    m.castShadow = true;
    m.receiveShadow = true;
    rig.scene.add(m);
    rig.colliders.push(rig.aabb(cx, H / 2, cz, sx, H, sz));
  }

  const cx = (c) => c * S - O, cz = (r) => r * S - O;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (east[r][c]) wall(cx(c) + S / 2, cz(r), T, S + T, (r + c) % 3 === 0);
      if (south[r][c]) wall(cx(c), cz(r) + S / 2, S + T, T, (r + c) % 2 === 0);
    }
  }

  // Outer boundary (Stone Bricks)
  wall(cx(0) - S / 2, cz((N - 1) / 2), T, N * S + T, true);
  wall(cx(N - 1) + S / 2, cz((N - 1) / 2), T, N * S + T, true);
  wall(cx((N - 1) / 2), cz(0) - S / 2, N * S + T, T, true);
  wall(cx((N - 1) / 2), cz(N - 1) + S / 2, N * S + T, T, true);

  // ---- Goal: Minecraft Nether Star / Beacon at the far corner ----
  const goalPos = new THREE.Vector3(cx(N - 1), 1.4, cz(N - 1));

  // Beacon base
  const bBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1.6), getBlockMaterial("diamond_block"));
  bBase.position.set(goalPos.x, 0.2, goalPos.z);
  rig.scene.add(bBase);

  // Nether star
  const starGeo = new THREE.OctahedronGeometry(0.7, 0);
  const starMat = new THREE.MeshBasicMaterial({ color: 0x5fedd9 });
  const star = new THREE.Mesh(starGeo, starMat);
  star.position.copy(goalPos);
  markBloom(star);
  rig.scene.add(star);

  const halo = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.15, 2.0),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
  );
  halo.position.copy(goalPos);
  halo.position.y = 0.45;
  markBloom(halo);
  rig.scene.add(halo);

  const hud = document.getElementById("mode-hud");
  hud.classList.remove("hidden");
  hud.innerHTML = `<span class="mh-pill">🌀 Encuentra la ⭐</span>`;

  let won = false, t = 0;
  rig.run((dt) => {
    t += dt;
    star.rotation.y += dt * 2.5;
    star.rotation.x += dt * 1.5;
    star.position.y = 1.4 + Math.sin(t * 2) * 0.2;
    halo.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    if (!won && Math.hypot(rig.player.pos.x - goalPos.x, rig.player.pos.z - goalPos.z) < 1.6) {
      win();
    }
  });

  function win() {
    won = true;
    hud.classList.add("hidden");
    sfx.win();
    progress.addXp(50);
    const res = document.getElementById("mode-result");
    res.innerHTML = `<div class="result-card">
      <div class="win-emoji">🏆</div>
      <h2>¡Lo encontraste!</h2>
      <p class="win-stars">¡Resolviste el laberinto!<br>Nivel ${progress.info().level}</p>
      <button class="btn btn-big btn-accent" id="mz-again">Nuevo laberinto</button>
    </div>`;
    res.classList.remove("hidden");
    res.querySelector("#mz-again").addEventListener("click", () => {
      if (restart) restart();
      else location.reload();
    });
  }

  function destroy() {
    hud.classList.add("hidden");
    const res = document.getElementById("mode-result");
    res.classList.add("hidden");
    res.innerHTML = "";
    rig.destroy();
  }

  return { destroy };
}
