// Maze - find your way through a hedge maze to the glowing star. A random maze is
// carved each time (recursive backtracker). A high, near-overhead camera keeps the
// path readable for kids. Reach the star to win + earn XP.

import * as THREE from "three";
import { createScene3d } from "./scene3d.js";
import { toonMat, markBloom } from "./gfx.js";
import { sfx } from "./audio.js";
import { createProgress } from "./progress.js";

const N = 6; // cells per side
const S = 4; // cell size
const O = ((N - 1) * S) / 2; // offset to center the maze

export function startMaze(goHome, restart) {
  const progress = createProgress();
  // start in the first cell; near-overhead camera so corners are easy to read
  const spawn = { x: -O, y: 1.5, z: -O };
  const rig = createScene3d(spawn, { camDist: 4, camHeight: 13 });
  rig.addGroundPlane((N + 1) * S, (N + 1) * S, 0x9fe6b0);

  // ---- carve the maze (recursive backtracker) ----
  const east = Array.from({ length: N }, () => Array(N).fill(true)); // wall east of (r,c)
  const south = Array.from({ length: N }, () => Array(N).fill(true)); // wall south of (r,c)
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
    if (!nb.length) { stack.pop(); continue; }
    const [nr, nc, dir] = nb[Math.floor(Math.random() * nb.length)];
    if (dir === "E") east[r][c] = false;
    if (dir === "W") east[nr][nc] = false;
    if (dir === "S") south[r][c] = false;
    if (dir === "N") south[nr][nc] = false;
    seen[nr][nc] = true;
    stack.push([nr, nc]);
  }

  // ---- build walls (hedge boxes) ----
  const hedge = toonMat(0x46a85a, { flatShading: true });
  const H = 4.5, T = 0.6;
  function wall(cx, cz, sx, sz) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, H, sz), hedge);
    m.position.set(cx, H / 2, cz);
    m.castShadow = true; m.receiveShadow = true;
    rig.scene.add(m);
    rig.colliders.push(rig.aabb(cx, H / 2, cz, sx, H, sz));
  }
  const cx = (c) => c * S - O, cz = (r) => r * S - O;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (east[r][c]) wall(cx(c) + S / 2, cz(r), T, S + T);
    if (south[r][c]) wall(cx(c), cz(r) + S / 2, S + T, T);
  }
  // outer boundary
  wall(cx(0) - S / 2, cz((N - 1) / 2), T, N * S + T); // west
  wall(cx(N - 1) + S / 2, cz((N - 1) / 2), T, N * S + T); // east
  wall(cx((N - 1) / 2), cz(0) - S / 2, N * S + T, T); // north
  wall(cx((N - 1) / 2), cz(N - 1) + S / 2, N * S + T, T); // south



  // ---- goal star at the far corner ----
  const goalPos = new THREE.Vector3(cx(N - 1), 1.4, cz(N - 1));
  const star = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  star.position.copy(goalPos);
  markBloom(star);
  rig.scene.add(star);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.16, 10, 28), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  halo.position.copy(goalPos); halo.position.y = 0.2; halo.rotation.x = Math.PI / 2;
  markBloom(halo); rig.scene.add(halo);

  const hud = document.getElementById("mode-hud");
  hud.classList.remove("hidden");
  hud.innerHTML = `<span class="mh-pill">🌀 Encuentra la ⭐</span>`;

  let won = false, t = 0;
  rig.run((dt) => {
    t += dt;
    star.rotation.y += dt * 2;
    star.position.y = 1.4 + Math.sin(t * 2) * 0.2;
    halo.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    if (!won && Math.hypot(rig.player.pos.x - goalPos.x, rig.player.pos.z - goalPos.z) < 1.6) win();
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
    res.classList.add("hidden"); res.innerHTML = "";
    rig.destroy();
  }
  return { destroy };
}
