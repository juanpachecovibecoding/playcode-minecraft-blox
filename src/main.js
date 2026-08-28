import "./style.css";
import * as THREE from "three";

import { buildWorld } from "./world.js";
import { createPlayer, updatePlayer, respawn } from "./player.js";
import { createAvatar } from "./avatar.js";
import { createControls, isTouchDevice } from "./controls.js";
import { createFollowCamera, intentToWorld } from "./camera.js";
import { createEmotes } from "./emotes.js";
import { createMusic } from "./music.js";
import { setupFullscreen } from "./fullscreen.js";
import { getQuestion, getCategoryQuestion } from "./questions.js";
import { createQuiz } from "./quiz.js";
import { createHud } from "./hud.js";
import { sfx, unlockAudio } from "./audio.js";
import { showLobby } from "./lobby.js";
import { createNet, MULTIPLAYER_AVAILABLE } from "./net.js";
import { createRemotePlayers } from "./remotePlayers.js";
import { createVoice } from "./voice.js";
import { colorForId } from "./avatar.js";
import { createProps } from "./props.js";
import { createPostFX } from "./postfx.js";
import { createProgress } from "./progress.js";
import { GATE_COUNT } from "./world.js";
import { startArcade } from "./arcade.js";
import { startPuzzles } from "./puzzles.js";
import { startLearn } from "./learn.js";
import { startRoom } from "./room.js";
import { startExplore } from "./explore.js";
import { startCoinRush } from "./coinrush.js";
import { startMaze } from "./maze.js";
import { startCloset } from "./closet.js";
import * as profile from "./profile.js";

const AVATAR_Y_OFFSET = 0.15; // lift the visual so feet rest on platform tops

// Device capability: gate the heavier visuals (bigger shadows, character outline,
// full-res bloom) so phones stay smooth.
const HIGH_END = !isTouchDevice() && window.devicePixelRatio < 2.5 && (navigator.hardwareConcurrency || 4) > 4;
const LOW = isTouchDevice() && window.devicePixelRatio >= 2;

let current = null; // the mounted activity screen { destroy }
let playerName = "Player";
let music = null; // global background music singleton (survives mode changes)

initHub();
boot();

async function boot() {
  const choice = await showLobby();
  unlockAudio();
  playerName = choice.name;
  setupMusic();
  if (choice.mode === "multi") openActivity(() => startRoom(choice, { launchObby, launchExplore }));
  else openExplore();
}

// background music + its top-right toggle button. created once; keeps playing as
// the player moves between the world and activities.
function setupMusic() {
  music = createMusic();
  const btn = document.getElementById("music-btn");
  btn.classList.remove("hidden");
  const sync = () => { btn.classList.toggle("off", !music.isOn()); btn.textContent = music.isOn() ? "🎵" : "🔈"; };
  sync();
  btn.addEventListener("click", () => { music.toggle(); sync(); });
  if (music.isOn()) music.start();
}

// launch the multiplayer obby from the room lobby (its own reconnecting world)
function launchObby(code, name, category) {
  openActivity((goHome) => startGame({ mode: "multi", name, code, category }, goHome));
}

// launch the multiplayer explore world - friends roam together with voice
function launchExplore(code, name) {
  openActivity(() => startExplore((key) => openActivity(LAUNCHERS[key]), { multiplayer: { code, name }, onExit: goHome }));
}

// the 3D explore world is the solo hub - walk to a building to enter an activity
function openExplore() {
  if (current?.destroy) current.destroy();
  document.getElementById("btn-home").classList.add("hidden"); // the world IS home
  document.getElementById("hud").classList.add("hidden");
  current = startExplore((key) => openActivity(LAUNCHERS[key]));
}

// ---------- hub / world-select + screen router ----------
const LAUNCHERS = {
  obby: (goHome) => startGame({ mode: "solo", name: playerName }, goHome),
  arcade: (goHome) => startArcade(goHome),
  puzzles: (goHome) => startPuzzles(goHome),
  learn: (goHome) => startLearn(goHome),
  coinrush: () => startCoinRush(),
  maze: (goHome, restart) => startMaze(goHome, restart),
  closet: (goHome) => startCloset(goHome),
};

function initHub() {
  setupFullscreen("hub-fs");
  document.querySelectorAll(".hub-card").forEach((card) =>
    card.addEventListener("click", () => openActivity(LAUNCHERS[card.dataset.act]))
  );
  // one delegated Home button works for every activity
  document.getElementById("btn-home").addEventListener("click", () => goHome());
}

function openActivity(launcher) {
  if (current?.destroy) current.destroy();
  document.getElementById("hub").classList.add("hidden");
  document.getElementById("btn-home").classList.remove("hidden");
  const restart = () => openActivity(launcher);
  current = launcher(goHome, restart);
}

function goHome() {
  // returning from an activity drops you back into the 3D explore world
  openExplore();
}

function showHub() {
  const hub = document.getElementById("hub");
  hub.classList.remove("hidden");
  document.getElementById("hud").classList.add("hidden");
  const info = createProgress().info();
  document.getElementById("hub-level").textContent = String(info.level);
  document.getElementById("hub-stars").textContent = String(createProgress().getXp());
}

function startGame(choice, onHome) {
  // ---------- renderer + scene ----------
  // antialias is off because the composer's SMAA pass handles edges (avoids
  // paying for MSAA twice). NeutralToneMapping keeps the candy colors punchy.
  const root = document.getElementById("game-root");
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdcefff, 60, 200);
  scene.add(makeSky());

  // ---------- lighting (baked-flat toy rig) ----------
  const hemi = new THREE.HemisphereLight(0xfff7e6, 0xbfd4ff, 0.85);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight(0x9fb8e8, 0.16)); // floor so nothing goes black

  const sun = new THREE.DirectionalLight(0xfff1d6, 1.25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(HIGH_END ? 2048 : 1024, HIGH_END ? 2048 : 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 55;
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02; // hides shadow acne on the rounded bevels
  sun.shadow.radius = 4;
  scene.add(sun);
  scene.add(sun.target);

  // soft sky-blue fill from the opposite side (no shadow) lifts the dark faces
  const fill = new THREE.DirectionalLight(0xbbd4ff, 0.35);
  scene.add(fill);

  // ---------- world ----------
  const world = buildWorld();
  scene.add(world.group);

  // ---------- decorative props ----------
  const props = createProps(scene, world, LOW ? 0.4 : 1);

  // ---------- local player ----------
  const player = createPlayer(world.spawn);
  if (import.meta.env.DEV) window.__bbPlayer = player; // dev-only debug hook
  const avatar = createAvatar(profile.getColor(), "", profile.getHat());
  scene.add(avatar.root);

  // ---------- camera + controls ----------
  const camera = createFollowCamera(window.innerWidth / window.innerHeight);
  camera.snap(player.pos);
  const controls = createControls();
  const emotes = createEmotes();
  setupFullscreen("btn-fs");

  // ---------- post-processing (needs the camera) ----------
  const postfx = createPostFX(renderer, scene, camera.cam, { highEnd: HIGH_END, low: LOW });

  // ---------- ui ----------
  const quiz = createQuiz();
  const hud = createHud();
  document.getElementById("hud").classList.remove("hidden");
  document.getElementById("btn-home").classList.remove("hidden");

  // ---------- multiplayer ----------
  const remote = createRemotePlayers();
  scene.add(remote.group);
  let net = null;
  let voice = null;
  let others = [];
  const speaking = new Set(); // ids currently talking ("me" or peer id)
  let me = null;

  function refreshPlayers() {
    const list = [{ id: me?.id || "me", name: me?.name || choice.name, color: me?.color ?? 0x4cc9f0, speaking: speaking.has("me") || speaking.has(me?.id) }];
    for (const o of others) list.push({ ...o, speaking: speaking.has(o.id) });
    hud.setPlayers(list);
  }

  if (choice.mode === "multi" && MULTIPLAYER_AVAILABLE) {
    setupMultiplayer(choice).catch((e) => {
      console.error(e);
      hud.showFlash("No se pudo unir a la sala", 1500);
    });
  }

  async function setupMultiplayer(choice) {
    net = createNet();
    const id = crypto.randomUUID();
    me = { id, name: choice.name, color: colorForId(id) };
    avatar.setBodyColor(me.color);

    net.on("roster", (players) => {
      others = players.filter((p) => p.id !== me.id);
      remote.syncRoster(others);
      refreshPlayers();
    });
    net.on("state", (packet) => remote.applyState(packet));

    const ok = await net.join(choice.code, me);
    if (!ok) {
      hud.showFlash("Salas no configuradas", 1500);
      return;
    }
    hud.showRoom(choice.code);
    setupInvite(choice.code);

    // voice
    voice = createVoice(net, {
      onSpeaking: (id, on) => {
        if (on) speaking.add(id);
        else speaking.delete(id);
        refreshPlayers();
      },
    });
    voice.wire();
    const muteBtn = document.getElementById("btn-mute");
    muteBtn.classList.remove("hidden");
    muteBtn.classList.add("muted");
    const started = await voice.start();
    if (started) {
      others.forEach((o) => voice.connect && voice.connect(o.id));
      muteBtn.addEventListener("click", () => {
        const muted = voice.toggleMute();
        muteBtn.classList.toggle("muted", muted);
        muteBtn.classList.toggle("live", !muted);
        muteBtn.textContent = muted ? "🔇" : "🎤";
        hud.showFlash(muted ? "Mic apagado" : "Mic encendido - ¡saluda!", 900);
      });
    } else {
      muteBtn.textContent = "🚫";
      muteBtn.title = "Micrófono bloqueado";
    }
    refreshPlayers();
  }

  function setupInvite(code) {
    const btn = document.getElementById("btn-copy");
    btn.addEventListener("click", async () => {
      const link = `${location.origin}${location.pathname}?room=${code}`;
      try {
        await navigator.clipboard.writeText(link);
        hud.showFlash("¡Enlace copiado!", 900);
      } catch {
        hud.showFlash(link, 1800);
      }
    });
  }

  // ---------- game state ----------
  let state = "play"; // play | quiz | win
  let level = 0;
  let respawnPoint = { ...world.spawn };
  const fades = []; // gate fade tweens: { mesh, t }

  // progression + run counters
  const progress = createProgress();
  hud.setLevel(progress.info());
  let coinTotal = 0;
  let streak = 0;
  let cheerUntil = 0;
  const activePowerups = []; // { type, icon, label, until }

  // award XP, refresh the HUD bar, and celebrate a level-up
  function awardXp(amount) {
    const res = progress.addXp(amount);
    hud.setLevel(res.info);
    if (res.leveledUp) {
      hud.popLevel();
      hud.showFlash(`¡Nivel ${res.level}! 🎉`, 1100);
      sfx.levelup();
      props.spawnConfetti({ x: player.pos.x, y: player.pos.y + 3, z: player.pos.z });
    }
  }

  // ---------- power-ups ----------
  const PWR_DURATION = 18; // seconds
  function applyPowerup(pu) {
    sfx.powerup();
    const existing = activePowerups.find((p) => p.type === pu.type);
    if (existing) existing.until = elapsed + PWR_DURATION;
    else activePowerups.push({ ...pu, until: elapsed + PWR_DURATION });
    if (pu.type === "doublejump") player.maxJumps = 2;
    if (pu.type === "speed") player.speedMult = 1.6;
    hud.showFlash(`${pu.icon} ${pu.label}!`, 1100);
    hud.setPowerups(activePowerups.map((p) => ({ icon: p.icon, label: p.label })));
  }
  function updatePowerups() {
    let changed = false;
    for (let i = activePowerups.length - 1; i >= 0; i--) {
      if (elapsed > activePowerups[i].until) {
        const exp = activePowerups.splice(i, 1)[0];
        if (exp.type === "doublejump") player.maxJumps = 1;
        if (exp.type === "speed") player.speedMult = 1;
        changed = true;
      }
    }
    if (changed) hud.setPowerups(activePowerups.map((p) => ({ icon: p.icon, label: p.label })));
  }

  async function triggerQuiz(cp) {
    cp.armed = false;
    state = "quiz";
    controls.setEnabled(false);
    emotes.setEnabled(false);
    respawnPoint = { ...cp.pos };
    sfx.checkpoint();

    const q = choice.category ? getCategoryQuestion(choice.category, level) : getQuestion(level);
    const correct = await quiz.ask(q, { progress: cp.index / GATE_COUNT });

    if (correct) {
      cp.cleared = true;
      hud.addStar();
      sfx.correct();
      sfx.gate();
      world.openGate(cp.index);
      fades.push({ mesh: world.gates[cp.index].mesh, t: 0 });
      props.spawnSparkle({ x: cp.pos.x, y: cp.baseY, z: cp.pos.z });
      props.spawnConfetti({ x: cp.pos.x, y: cp.pos.y + 2, z: cp.pos.z });
      level += 1;
      streak += 1;
      cheerUntil = elapsed + 1.4; // character cheers
      awardXp(20);
      // streak bonus every 3 correct in a row
      if (streak > 0 && streak % 3 === 0) {
        hud.addStar();
        awardXp(15);
        hud.showFlash(`¡${streak} seguidas! Bonus ⭐`, 1200);
      } else {
        hud.showFlash("¡Puerta abierta! 🎉", 900);
      }
    } else {
      sfx.wrong();
      streak = 0;
      hud.showFlash("¡Inténtalo de nuevo!", 1000);
      respawn(player, cp.pos); // back onto the safe pad, gate still locked
    }
    state = state === "win" ? "win" : "play";
    controls.setEnabled(true);
    emotes.setEnabled(true);
  }

  function softReset() {
    hud.hideWin();
    hud.setStars(0);
    coinTotal = 0;
    streak = 0;
    hud.setCoins(0);
    activePowerups.length = 0;
    hud.setPowerups([]);
    player.maxJumps = 1;
    player.speedMult = 1;
    level = 0;
    respawnPoint = { ...world.spawn };
    respawn(player, world.spawn);
    props.resetCollectibles();
    for (const cp of world.checkpoints) {
      cp.armed = true;
      cp.cleared = false;
      cp.triggered = false;
    }
    for (const g of world.gates) {
      g.open = false;
      g.mesh.visible = true;
      g.mesh.material.opacity = 0.6;
    }
    camera.snap(player.pos);
    state = "play";
    controls.setEnabled(true);
  }
  const playAgainBtn = document.getElementById("btn-play-again");
  playAgainBtn.addEventListener("click", softReset);
  const winHomeBtn = document.getElementById("btn-win-home");
  const onWinHome = () => onHome && onHome();
  winHomeBtn.addEventListener("click", onWinHome);

  // arm all checkpoints initially
  for (const cp of world.checkpoints) cp.armed = true;

  // ---------- main loop ----------
  let last = performance.now();
  let elapsed = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;
    let moving = false;

    if (state === "play") {
      const inRaw = controls.getInput();
      const look = controls.getLook();
      if (look.dx || look.dy) camera.rotate(look.dx, look.dy);
      const dir = intentToWorld(inRaw.fwd, inRaw.right, camera.state.yaw);
      moving = Math.hypot(inRaw.fwd, inRaw.right) > 0.05;
      emotes.tick(dt, moving);
      const wasGrounded = player.grounded;
      const { fell } = updatePlayer(player, dt, { moveX: dir.x, moveZ: dir.z, jump: inRaw.jump }, world.getColliders());
      if (inRaw.jump && wasGrounded) sfx.jump();
      if (fell) {
        respawn(player, respawnPoint);
        hud.showFlash("¡Ups!", 700);
      }

      // collect coins along the way
      const got = props.collectCoins(player.pos);
      if (got) {
        coinTotal += got;
        hud.setCoins(coinTotal);
        sfx.coin();
        awardXp(got * 2);
        profile.addCoins(got); // into the persistent wallet (spend in the Closet)
      }

      // collect a power-up
      const pu = props.collectPowerup(player.pos);
      if (pu) applyPowerup(pu);

      // expire power-ups
      updatePowerups();

      // checkpoints: trigger when armed + inside ring; re-arm after leaving
      for (const cp of world.checkpoints) {
        const d = Math.hypot(player.pos.x - cp.pos.x, player.pos.z - cp.pos.z);
        const within = d < cp.radius && Math.abs(player.pos.y - cp.pos.y) < 3;
        if (cp.armed && within && !cp.cleared) {
          triggerQuiz(cp);
          break;
        }
        if (!cp.armed && !cp.cleared && !within) cp.armed = true;
      }

      // win check
      const dg = Math.hypot(player.pos.x - world.goal.pos.x, player.pos.z - world.goal.pos.z);
      if (state === "play" && dg < world.goal.radius && player.pos.y > world.goal.pos.y - 2) {
        state = "win";
        controls.setEnabled(false);
        sfx.win();
        awardXp(100);
        props.spawnConfetti(world.goal.pos);
        hud.showWin(progress.info().level);
      }

      // broadcast my position (+ active emote so friends see it)
      if (net) net.sendState({ x: player.pos.x, y: player.pos.y, z: player.pos.z, ry: player.facing, anim: emotes.current() || player.anim });
    }

    // place + animate local avatar (emote > cheer flourish > movement)
    avatar.root.position.set(player.pos.x, player.pos.y + AVATAR_Y_OFFSET, player.pos.z);
    avatar.root.rotation.y = player.facing;
    const showAnim = emotes.current() || (elapsed < cheerUntil ? "cheer" : player.anim);
    avatar.update(showAnim, dt, camera.cam);

    // remote players
    remote.update(dt, camera.cam);

    // camera + sun + fill follow the player so shadows + light stay crisp
    camera.follow(player.pos, dt, { facing: player.facing, moving });
    sun.position.set(player.pos.x + 12, player.pos.y + 28, player.pos.z + 8);
    sun.target.position.set(player.pos.x, player.pos.y, player.pos.z);
    fill.position.set(player.pos.x - 10, player.pos.y + 10, player.pos.z - 6);

    // goal flag spin + ripple, checkpoint ring spin + pulse
    world.goal.flag.rotation.y += dt * 1.2;
    rippleFlag(world.goal, elapsed);
    for (const cp of world.checkpoints) {
      if (!cp.ring) continue;
      cp.ring.rotation.z += dt * (cp.cleared ? 0.4 : 1.6);
      if (cp.cleared) {
        cp.ring.material.color.set(0xbfe9d2);
        cp.halo.visible = false;
      } else {
        const pulse = 1 + Math.sin(elapsed * 3 + cp.index) * 0.06;
        cp.ring.scale.setScalar(pulse);
        cp.halo.scale.setScalar(pulse * 1.05);
      }
    }

    // decorative props (clouds, coins, balloons, bursts)
    props.update(dt, elapsed);

    // gate fade tweens
    for (let i = fades.length - 1; i >= 0; i--) {
      const f = fades[i];
      f.t += dt;
      f.mesh.material.opacity = Math.max(0, 0.6 * (1 - f.t / 0.6));
      if (f.t >= 0.6) {
        f.mesh.visible = false;
        fades.splice(i, 1);
      }
    }

    postfx.render();
    if (alive) rafId = requestAnimationFrame(frame);
  }
  let alive = true;
  let rafId = requestAnimationFrame(frame);

  // ---------- resize ----------
  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.cam.aspect = window.innerWidth / window.innerHeight;
    camera.cam.updateProjectionMatrix();
    postfx.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize);

  const onUnload = () => {
    if (voice) voice.stop();
    if (net) net.leave();
  };
  window.addEventListener("beforeunload", onUnload);

  // (the Home button is wired centrally by the router; the obby just provides
  //  onHome via the win-screen Hub button below.)

  // ---------- teardown (stop the loop + free the GPU when leaving) ----------
  function destroy() {
    alive = false;
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("beforeunload", onUnload);
    playAgainBtn.removeEventListener("click", softReset);
    winHomeBtn.removeEventListener("click", onWinHome);
    controls.destroy?.();
    emotes.destroy?.();
    remote.destroy?.();
    if (voice) voice.stop();
    if (net) net.leave();
    document.getElementById("hud").classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("win")?.classList.add("hidden");
    renderer.dispose();
    if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement);
  }

  return { destroy };
}

// ripple the goal flag's plane vertices so it looks like it is waving
function rippleFlag(goal, t) {
  const pos = goal.flagGeo.attributes.position;
  const base = goal.flagBase;
  for (let i = 0; i < pos.count; i++) {
    const bx = base[i * 3];
    const by = base[i * 3 + 1];
    // anchor the pole edge (x near -0.475), wave grows toward the free edge
    const k = (bx + 0.475) / 0.95;
    pos.array[i * 3 + 2] = Math.sin(bx * 6 + t * 6) * 0.12 * k;
  }
  pos.needsUpdate = true;
}

// vertical gradient skydome (soft storybook sky)
function makeSky() {
  const geo = new THREE.SphereGeometry(300, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x6fbeff) },
      mid: { value: new THREE.Color(0x9ad4ff) },
      bottom: { value: new THREE.Color(0xeaf6ff) },
      exponent: { value: 0.55 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vDir; uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform float exponent;
      void main(){ float t = pow(max(vDir.y,0.0), exponent);
        vec3 c = t < 0.5 ? mix(bottom, mid, t*2.0) : mix(mid, top, (t-0.5)*2.0);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  return new THREE.Mesh(geo, mat);
}
