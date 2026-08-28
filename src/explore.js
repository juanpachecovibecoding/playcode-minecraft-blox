// The 3D Explore World - a Roblox-style open hub you walk around. A grassy plaza
// with a fountain, a pool, trees, paths and lamp-posts, ringed by cute building
// "standees" (the generated art, white removed at runtime) that are portals into
// each activity. Walk onto a building's glowing pad and an Enter button appears.

import * as THREE from "three";
import { createPlayer, updatePlayer, respawn } from "./player.js";
import { createAvatar } from "./avatar.js";
import { createControls, isTouchDevice } from "./controls.js";
import { createFollowCamera, intentToWorld } from "./camera.js";
import { createEmotes } from "./emotes.js";
import { createInteractions } from "./interactions.js";
import { toonMat, roundedGeo, markBloom } from "./gfx.js";
import { createPostFX } from "./postfx.js";
import { sfx } from "./audio.js";
import { createNet, MULTIPLAYER_AVAILABLE } from "./net.js";
import { createVoice } from "./voice.js";
import { createRemotePlayers } from "./remotePlayers.js";
import { colorForId } from "./avatar.js";
import * as profile from "./profile.js";

const HIGH_END = !isTouchDevice() && window.devicePixelRatio < 2.5 && (navigator.hardwareConcurrency || 4) > 4;
const LOW = isTouchDevice() && window.devicePixelRatio >= 2;
const BASE = import.meta.env.BASE_URL;

// each zone: a building standee + portal pad. `soon` marks not-yet-built modes.
const ZONES = [
  { key: "obby", name: "Carrera de Obstáculos", emoji: "🏃", img: "gym", color: 0xff8e72 },
  { key: "arcade", name: "Quiz Arcade", emoji: "⚡", img: "arcade", color: 0xffd45e },
  { key: "puzzles", name: "Rompecabezas", emoji: "🧩", img: "toystore", color: 0x5fd69a },
  { key: "learn", name: "Aprender", emoji: "📚", img: "school", color: 0x5fc6f0 },
  { key: "coinrush", name: "Lluvia de Monedas", emoji: "🪙", img: "icecream", color: 0xffcf3a },
  { key: "maze", name: "Laberinto", emoji: "🌀", img: "library", color: 0xbfa1ff },
  { key: "closet", name: "Mi Ropero", emoji: "👕", color: 0xff94bc },
];

export function startExplore(onEnter, opts = {}) {
  const mp = opts.multiplayer || null; // { code, name } -> friends roam together
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
  scene.fog = new THREE.Fog(0xdcefff, 55, 180);
  scene.add(makeSky());

  scene.add(new THREE.HemisphereLight(0xfff7e6, 0xbfd4ff, 0.9));
  scene.add(new THREE.AmbientLight(0x9fb8e8, 0.18));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.25);
  sun.castShadow = true;
  sun.position.set(20, 34, 14);
  sun.shadow.mapSize.set(HIGH_END ? 2048 : 1024, HIGH_END ? 2048 : 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -40;
  sun.shadow.camera.right = sun.shadow.camera.top = 40;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // ---------- world geometry ----------
  const colliders = [];
  const aabb = (cx, cy, cz, sx, sy, sz) => ({ min: { x: cx - sx / 2, y: cy - sy / 2, z: cz - sz / 2 }, max: { x: cx + sx / 2, y: cy + sy / 2, z: cz + sz / 2 } });

  const R = 30; // world radius
  // grass ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(R + 4, 48), toonMat(0x7ed87e));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  colliders.push(aabb(0, -0.5, 0, (R + 4) * 2, 1, (R + 4) * 2)); // flat floor at y=0

  // stone plaza
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(11, 40), toonMat(0xe6dcc0));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.02;
  plaza.receiveShadow = true;
  scene.add(plaza);

  // central fountain
  let logoGroup;
  const fountain = new THREE.Group();
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.7, 20), toonMat(0xcfd6e6));
  basin.position.y = 0.35;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.2, 20), new THREE.MeshBasicMaterial({ color: 0x6fd0ff }));
  water.position.y = 0.62;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.4, 12), toonMat(0xcfd6e6));
  spout.position.y = 1.3;

  logoGroup = new THREE.Group();
  logoGroup.position.y = 3.2;
  const orangeMat = new THREE.MeshLambertMaterial({ color: 0xef9a13 });
  const barGeo1 = new THREE.BoxGeometry(0.12, 0.45, 0.12);
  const barGeo2 = new THREE.BoxGeometry(0.12, 0.9, 0.12);
  const b1 = new THREE.Mesh(barGeo1, orangeMat); b1.position.set(-0.5, 0.15, 0); b1.rotation.z = -Math.PI / 6;
  const b2 = new THREE.Mesh(barGeo1, orangeMat); b2.position.set(-0.5, -0.15, 0); b2.rotation.z = Math.PI / 6;
  const b3 = new THREE.Mesh(barGeo2, orangeMat); b3.position.set(0, 0, 0); b3.rotation.z = -Math.PI / 6;
  const b4 = new THREE.Mesh(barGeo1, orangeMat); b4.position.set(0.5, 0.15, 0); b4.rotation.z = Math.PI / 6;
  const b5 = new THREE.Mesh(barGeo1, orangeMat); b5.position.set(0.5, -0.15, 0); b5.rotation.z = -Math.PI / 6;
  logoGroup.add(b1, b2, b3, b4, b5);

  const cvs = document.createElement('canvas'); cvs.width = 256; cvs.height = 64;
  const ctx = cvs.getContext('2d');
  ctx.font = '800 36px "Baloo 2", sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 6; ctx.strokeStyle = '#051426';
  ctx.strokeText('Play Code', 128, 32); ctx.fillText('Play Code', 128, 32);
  const tex = new THREE.CanvasTexture(cvs);
  const planeMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const textPlane1 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), planeMat); textPlane1.position.y = -0.65;
  const textPlane2 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), planeMat); textPlane2.position.y = -0.65; textPlane2.rotation.y = Math.PI;
  logoGroup.add(textPlane1, textPlane2);
  logoGroup.traverse((o) => { o.castShadow = true; });
  logoGroup.scale.setScalar(2);

  fountain.add(basin, water, spout, logoGroup);
  fountain.traverse((o) => (o.castShadow = true));
  scene.add(fountain);
  colliders.push(aabb(0, 1, 0, 5.2, 2, 5.2));

  // a fun pool (resort vibe) off to one side
  const pool = new THREE.Mesh(new THREE.CircleGeometry(5, 28), new THREE.MeshBasicMaterial({ color: 0x57c6f0 }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(16, 0.03, 16);
  scene.add(pool);
  const poolRim = new THREE.Mesh(new THREE.TorusGeometry(5, 0.4, 10, 36), toonMat(0xede3c8));
  poolRim.rotation.x = Math.PI / 2;
  poolRim.position.set(16, 0.1, 16);
  scene.add(poolRim);

  // trees + lamp-posts scattered around
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 1.4, 7);
  const trunkMat = toonMat(0x9a6b4f);
  const leafGeo = new THREE.IcosahedronGeometry(1.1, 0);
  const leafMat = toonMat(0x57b85c, { flatShading: true });
  function tree(x, z, s = 1) {
    const g = new THREE.Group();
    const t = new THREE.Mesh(trunkGeo, trunkMat); t.position.y = 0.7; t.castShadow = true;
    const l = new THREE.Mesh(leafGeo, leafMat); l.position.y = 1.9; l.castShadow = true;
    g.add(t, l); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
    colliders.push(aabb(x, 1, z, 0.6, 2, 0.6));
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.3;
    const rr = 22 + (i % 3) * 2.5;
    tree(Math.cos(a) * rr, Math.sin(a) * rr, 0.9 + (i % 3) * 0.25);
  }

  // ---------- decorations: lamps, benches, flowers, fence, playground ----------
  const poleMat = toonMat(0x6b7a99);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe98a });
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 3, 8);
  const bulbGeo = new THREE.SphereGeometry(0.28, 10, 10);
  function lamppost(x, z) {
    const g = new THREE.Group();
    const p = new THREE.Mesh(poleGeo, poleMat); p.position.y = 1.5; p.castShadow = true;
    const b = new THREE.Mesh(bulbGeo, bulbMat); b.position.y = 3.1; markBloom(b);
    g.add(p, b); g.position.set(x, 0, z); scene.add(g);
  }
  const benchMat = toonMat(0xb5763f);
  function bench(x, z, rot) {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(roundedGeo(2, 0.2, 0.7, 0.06, 1), benchMat); seat.position.y = 0.6; seat.castShadow = true;
    const back = new THREE.Mesh(roundedGeo(2, 0.6, 0.15, 0.06, 1), benchMat); back.position.set(0, 0.95, -0.28);
    g.add(seat, back); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  }
  const benchSpots = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    lamppost(Math.cos(a) * 13, Math.sin(a) * 13);
    if (i % 2 === 0) {
      const bx = Math.cos(a + 0.3) * 9.5, bz = Math.sin(a + 0.3) * 9.5;
      bench(bx, bz, -a);
      benchSpots.push({ x: bx, z: bz });
    }
  }

  // flowers + bushes
  const bushGeo = new THREE.IcosahedronGeometry(0.7, 0);
  const bushMat = toonMat(0x5cbf63, { flatShading: true });
  const flowerColors = [0xff6b9d, 0xffd23f, 0xff8e72, 0xbfa1ff, 0xff5d5d];
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 16;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.random() < 0.5) {
      const bush = new THREE.Mesh(bushGeo, bushMat); bush.position.set(x, 0.5, z); bush.scale.setScalar(0.7 + Math.random()); bush.castShadow = true; scene.add(bush);
    } else {
      const fg = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5), toonMat(0x4fa85c)); stem.position.y = 0.25;
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), toonMat(flowerColors[i % flowerColors.length])); bloom.position.y = 0.55;
      fg.add(stem, bloom); fg.position.set(x, 0, z); scene.add(fg);
    }
  }

  // white picket fence around the edge
  const fenceMat = toonMat(0xfdfdf5);
  const postGeo = new THREE.BoxGeometry(0.2, 1.1, 0.2);
  const railGeo = new THREE.BoxGeometry(2.6, 0.16, 0.1);
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2;
    const x = Math.cos(a) * (R + 1), z = Math.sin(a) * (R + 1);
    const post = new THREE.Mesh(postGeo, fenceMat); post.position.set(x, 0.55, z); post.lookAt(0, 0.55, 0); scene.add(post);
    if (i % 1 === 0) { const rail = new THREE.Mesh(railGeo, fenceMat); rail.position.set(x, 0.7, z); rail.lookAt(0, 0.7, 0); scene.add(rail); }
  }

  // playground (slide + swing) near the pool
  const pg = new THREE.Group(); pg.position.set(-16, 0, 16);
  const slideMat = toonMat(0xff8e72), frameMat = toonMat(0x5fc6f0);
  const tower = new THREE.Mesh(roundedGeo(1.6, 2.4, 1.6, 0.2, 1), frameMat); tower.position.y = 1.2; tower.castShadow = true; pg.add(tower);
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 4), slideMat); slide.position.set(0, 1.4, 1.8); slide.rotation.x = 0.5; pg.add(slide);
  const swingFrame = new THREE.Group(); swingFrame.position.set(4, 0, 0);
  const barL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 6), frameMat); barL.position.set(-1, 1.3, 0); barL.rotation.z = 0.3;
  const barR = barL.clone(); barR.position.x = 1; barR.rotation.z = -0.3;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 6), frameMat); top.position.y = 2.5; top.rotation.z = Math.PI / 2;
  swingFrame.add(barL, barR, top); pg.add(swingFrame);
  scene.add(pg);
  colliders.push(aabb(-16, 1.2, 16, 1.8, 2.4, 1.8));

  // ambient floating stars (decoration)
  const starGeo = new THREE.IcosahedronGeometry(0.4, 0);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  const stars = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, r = 7;
    const s = new THREE.Mesh(starGeo, starMat); s.position.set(Math.cos(a) * r, 4 + (i % 2), Math.sin(a) * r); markBloom(s); s.userData.ph = i; scene.add(s); stars.push(s);
  }

  // ---------- wandering NPC characters ----------
  const npcs = [];
  ["puppy", "kitten", "bunny", "duck", "robot", "dino"].forEach((name, i) => {
    loadCutout(`${BASE}assets/npc/${name}.png`, (tex) => {
      const spr = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
      const a = (i / 6) * Math.PI * 2;
      spr.position.set(Math.cos(a) * 8, 1, Math.sin(a) * 8);
      scene.add(spr);
      npcs.push({ spr, tx: spr.position.x, tz: spr.position.z, ph: i, speed: 1.2 + Math.random() });
    });
  });

  // ---------- building "standees" = portals ----------
  const portals = [];
  const ringR = 18;
  ZONES.forEach((z, i) => {
    const ang = (i / ZONES.length) * Math.PI * 2;
    const bx = Math.cos(ang) * ringR;
    const bz = Math.sin(ang) * ringR;
    const facing = Math.atan2(-bx, -bz); // face the plaza center

    const group = new THREE.Group();
    group.position.set(bx, 0, bz);
    group.rotation.y = facing;
    scene.add(group);

    // colored base plinth
    const base = new THREE.Mesh(roundedGeo(6, 0.6, 2.5, 0.2, 2), toonMat(z.color));
    base.position.y = 0.3; base.castShadow = true; base.receiveShadow = true;
    group.add(base);
    colliders.push(aabb(bx, 1.5, bz, 5.5, 3, 2));

    if (z.img) {
      // the building art as a standee (white removed at load)
      const standee = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, color: 0xffffff }));
      standee.position.set(0, 3.1, 0);
      group.add(standee);
      loadCutout(`${BASE}assets/world/${z.img}.jpg`, (tex) => { standee.material.map = tex; standee.material.needsUpdate = true; });
    } else {
      // no art (Closet) -> a simple wardrobe
      const ward = new THREE.Mesh(roundedGeo(2.2, 3, 1, 0.12, 2), toonMat(z.color));
      ward.position.y = 2.1; ward.castShadow = true;
      const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.4, 0.05), toonMat(0xffffff)); doorL.position.set(0, 2.1, 0.52);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), toonMat(0xffd23f)); knob.position.set(-0.25, 2.1, 0.52);
      group.add(ward, doorL, knob);
    }

    // floating sign with emoji + name
    const sign = makeSign(z.emoji + " " + z.name + (z.soon ? "  🔜" : ""));
    sign.position.set(0, 6, 0);
    group.add(sign);

    // glowing portal pad in front (toward center)
    const padPos = new THREE.Vector3(bx * 0.74, 0.05, bz * 0.74);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.12, 24), new THREE.MeshBasicMaterial({ color: z.color }));
    pad.position.copy(padPos); pad.position.y = 0.06;
    markBloom(pad);
    scene.add(pad);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.12, 10, 28), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ring.rotation.x = Math.PI / 2; ring.position.copy(padPos); ring.position.y = 0.14;
    markBloom(ring);
    scene.add(ring);

    portals.push({ ...z, padPos, ring, sign });
  });
  if (import.meta.env.DEV) window.__bbPortals = portals.map((p) => ({ key: p.key, x: p.padPos.x, z: p.padPos.z }));

  // ---------- clouds + ambient coins ----------
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cloudGeo = new THREE.IcosahedronGeometry(1.4, 0);
  const clouds = [];
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Mesh(cloudGeo, cloudMat);
    c.position.set((i * 7) % 60 - 30, 13 + (i % 3) * 3, (i * 11) % 60 - 30);
    c.scale.set(1 + (i % 2), 0.6, 1.2); scene.add(c); clouds.push(c);
  }

  // ---------- player + camera + controls ----------
  const player = createPlayer({ x: 0, y: 1.5, z: -7 });
  player.facing = 0;
  if (import.meta.env.DEV) window.__bbPlayer = player;
  const avatar = createAvatar(profile.getColor(), "", profile.getHat());
  scene.add(avatar.root);
  const camera = createFollowCamera(window.innerWidth / window.innerHeight);
  camera.snap(player.pos);
  const controls = createControls();
  const emotes = createEmotes({ onPlay: (key) => { if (net) net.sendState({ x: player.pos.x, y: player.pos.y, z: player.pos.z, ry: player.facing, anim: key }); } });

  const postfx = createPostFX(renderer, scene, camera.cam, { low: LOW });

  // ---------- multiplayer: friends roam the world together ----------
  let net = null, voice = null, remote = null, myId = null;
  if (mp && MULTIPLAYER_AVAILABLE) setupMultiplayer();
  async function setupMultiplayer() {
    net = createNet();
    myId = crypto.randomUUID();
    const me = { id: myId, name: mp.name, color: colorForId(myId) };
    avatar.setBodyColor(me.color);
    remote = createRemotePlayers();
    scene.add(remote.group);
    net.on("roster", (players) => remote.syncRoster(players.filter((p) => p.id !== myId)));
    net.on("state", (packet) => remote.applyState(packet));
    net.on("msg", onSocialMessage);
    const ok = await net.join(mp.code, me);
    if (!ok) return;
    voice = createVoice(net, {});
    voice.wire();
    const started = await voice.start();
    // a small Leave + mic bar
    const bar = document.getElementById("explore-bar");
    bar.classList.remove("hidden");
    bar.innerHTML = `<button class="icon-btn ${voice && started ? "muted" : ""}" id="ex-mute">${started ? "🔇" : "🚫"}</button><button class="btn" id="ex-leave">🚪 Salir</button><span class="ex-tag">👋 ¡Explora con tus amigos!</span>`;
    if (started) {
      bar.querySelector("#ex-mute").addEventListener("click", () => { const m = voice.toggleMute(); bar.querySelector("#ex-mute").textContent = m ? "🔇" : "🎤"; bar.querySelector("#ex-mute").classList.toggle("muted", m); bar.querySelector("#ex-mute").classList.toggle("live", !m); });
    }
    bar.querySelector("#ex-leave").addEventListener("click", () => opts.onExit && opts.onExit());
  }

  // ---------- enter prompt (DOM) ----------
  const prompt = document.getElementById("explore-prompt");
  let activePortal = null;
  function showPrompt(p) {
    activePortal = p;
    prompt.textContent = p.soon ? `${p.emoji} ${p.name} - ¡Próximamente!` : `▶ Entrar a ${p.name}`;
    prompt.classList.toggle("soon", !!p.soon);
    prompt.classList.remove("hidden");
  }
  function hidePrompt() { activePortal = null; prompt.classList.add("hidden"); }
  function enter() {
    if (!activePortal) return;
    if (activePortal.soon) { sfx.wrong(); flashSoon(); return; }
    sfx.gate();
    onEnter(activePortal.key);
  }
  const onPromptClick = () => enter();
  prompt.addEventListener("click", onPromptClick);
  const onKey = (e) => { if (e.key === "Enter" && activePortal) enter(); }; // "E" is for world interactions
  window.addEventListener("keydown", onKey);
  function flashSoon() {
    prompt.animate([{ transform: "translateX(-50%) scale(1.1)" }, { transform: "translateX(-50%) scale(1)" }], { duration: 300 });
  }

  // ---------- particles (hearts / sparkles / splashes) ----------
  const texCache = new Map();
  function emojiTex(ch) {
    if (texCache.has(ch)) return texCache.get(ch);
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const ctx = c.getContext("2d");
    ctx.font = "48px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(ch, 32, 36);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    texCache.set(ch, tex); return tex;
  }
  const bursts = [];
  function spawnBurst(pos, ch, n = 6, spread = 0.6, rise = 2.2) {
    const tex = emojiTex(ch);
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      s.position.set(pos.x + (Math.random() - 0.5) * spread, pos.y + Math.random() * 0.4, pos.z + (Math.random() - 0.5) * spread);
      s.scale.setScalar(0.6 + Math.random() * 0.3);
      scene.add(s);
      bursts.push({ s, vx: (Math.random() - 0.5) * 1.2, vy: rise + Math.random() * 1.2, vz: (Math.random() - 0.5) * 1.2, life: 0, max: 0.9 + Math.random() * 0.4 });
    }
  }
  function updateBursts(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.life += dt;
      b.s.position.x += b.vx * dt; b.s.position.y += b.vy * dt; b.s.position.z += b.vz * dt;
      b.vy -= 3 * dt;
      b.s.material.opacity = Math.max(0, 1 - b.life / b.max);
      if (b.life >= b.max) { scene.remove(b.s); b.s.material.dispose(); bursts.splice(i, 1); }
    }
  }

  // ---------- world + social interactions ----------
  const interactions = createInteractions();
  let wishCooldown = 0; // throttle fountain coins
  function hopPlayer() { if (player.grounded) { player.vel.y = 8; player.grounded = false; } }

  function doSplash() { sfx.splash(); hopPlayer(); spawnBurst({ x: player.pos.x, y: player.pos.y + 0.3, z: player.pos.z }, "💦", 8, 0.9, 2.6); }
  function doWish() {
    sfx.sparkle();
    spawnBurst({ x: 0, y: 2.4, z: 0 }, "✨", 8, 1.0, 2.4);
    if (wishCooldown <= 0) { profile.addCoins(1); spawnBurst({ x: 0, y: 1.6, z: 0 }, "🪙", 1, 0.2, 1.6); wishCooldown = 4; }
  }
  function petNpc(spot) {
    sfx.emote && sfx.emote();
    if (spot.npc) spot.npc.spr.position.y += 0.5;
    spawnBurst({ x: spot.pos.x, y: 1.8, z: spot.pos.z }, "💛", 4, 0.5, 2.0);
  }
  function highfive(spot) {
    emotes.play("wave");
    sfx.highfive();
    const mid = { x: (player.pos.x + spot.pos.x) / 2, y: 1.8, z: (player.pos.z + spot.pos.z) / 2 };
    spawnBurst(mid, "🙌", 5, 0.6, 2.0);
    if (net) net.sendMsg("social", { kind: "highfive", to: spot.id });
  }
  // a friend high-fived us back -> play it on their avatar + sparkle between us
  function onSocialMessage(payload) {
    if (!payload || payload.kind !== "highfive") return;
    if (payload.to && payload.to !== myId) return; // aimed at someone else
    if (remote) remote.playEmote(payload.from, "wave");
    sfx.highfive();
    const peer = remote && remote.list().find((p) => p.id === payload.from);
    if (peer) spawnBurst({ x: (player.pos.x + peer.pos.x) / 2, y: 1.8, z: (player.pos.z + peer.pos.z) / 2 }, "🙌", 5, 0.6, 2.0);
  }

  // static spots: benches (sit), pool (splash), fountain (wish), playground (dance)
  interactions.setSpots([
    ...benchSpots.map((b, i) => ({ key: `bench${i}`, pos: b, range: 2.3, icon: "🪑", label: "Sentarse", act: () => emotes.play("sit") })),
    { key: "pool", pos: { x: 16, z: 16 }, range: 5.6, icon: "🏊", label: "Salpicar", act: doSplash },
    { key: "fountain", pos: { x: 0, z: 0 }, range: 3.6, icon: "🪙", label: "Pedir un deseo", act: doWish },
    { key: "swing", pos: { x: -16, z: 16 }, range: 3.4, icon: "🛝", label: "Jugar", act: () => emotes.play("dance") },
  ]);
  // dynamic spots: wandering NPCs (pet) + nearby friends (high-five)
  interactions.setDynamic(() => {
    const out = npcs.map((n, i) => ({ key: `npc${i}`, pos: { x: n.spr.position.x, z: n.spr.position.z }, range: 2.4, icon: "🐾", label: "Acariciar", npc: n, act: petNpc }));
    if (remote) for (const p of remote.list()) out.push({ key: `hi-${p.id}`, pos: { x: p.pos.x, z: p.pos.z }, range: 3.0, icon: "🙌", label: "Chocar los cinco", id: p.id, act: highfive });
    return out;
  });

  // ---------- loop ----------
  let alive = true, last = performance.now(), elapsed = 0, rafId = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now; elapsed += dt;
    if (wishCooldown > 0) wishCooldown -= dt;
    const inRaw = controls.getInput();
    const look = controls.getLook();
    if (look.dx || look.dy) camera.rotate(look.dx, look.dy);
    const dir = intentToWorld(inRaw.fwd, inRaw.right, camera.state.yaw);
    const moving = Math.hypot(inRaw.fwd, inRaw.right) > 0.05;
    emotes.tick(dt, moving);
    const wasGrounded = player.grounded;
    updatePlayer(player, dt, { moveX: dir.x, moveZ: dir.z, jump: inRaw.jump }, colliders);
    if (inRaw.jump && wasGrounded) sfx.jump();

    // keep inside the world
    const d = Math.hypot(player.pos.x, player.pos.z);
    if (d > R) { player.pos.x *= R / d; player.pos.z *= R / d; }
    if (player.pos.y < -10) respawn(player, { x: 0, y: 1.5, z: -7 });

    // nearest portal pad (solo only - multiplayer is a hangout space)
    if (!mp) {
      let near = null, nd = 3.2;
      for (const p of portals) {
        const pd = Math.hypot(player.pos.x - p.padPos.x, player.pos.z - p.padPos.z);
        if (pd < nd) { nd = pd; near = p; }
      }
      if (near && near !== activePortal) showPrompt(near);
      else if (!near && activePortal) hidePrompt();
    }

    // contextual world/social interactions (sit, splash, wish, pet, high-five)
    interactions.update(player.pos);
    updateBursts(dt);

    // animate
    avatar.root.position.set(player.pos.x, player.pos.y + 0.15, player.pos.z);
    avatar.root.rotation.y = player.facing;
    avatar.update(emotes.current() || player.anim, dt, camera.cam);
    camera.follow(player.pos, dt, { facing: player.facing, moving });
    sun.position.set(player.pos.x + 18, 34, player.pos.z + 12);
    sun.target.position.set(player.pos.x, 0, player.pos.z);
    water.rotation.y += dt;
    if (logoGroup) {
      logoGroup.rotation.y += dt * 0.8;
      logoGroup.position.y = 3.2 + Math.sin(elapsed * 2.5) * 0.15;
    }
    for (const p of portals) { p.ring.rotation.z += dt * 1.5; p.ring.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.06); p.sign.quaternion.copy(camera.cam.quaternion); }
    for (const c of clouds) { c.position.x += dt * 0.4; if (c.position.x > 34) c.position.x = -34; }
    for (const s of stars) { s.rotation.y += dt * 1.5; s.position.y = 4 + (s.userData.ph % 2) + Math.sin(elapsed * 1.5 + s.userData.ph) * 0.4; }

    // NPCs wander toward a target, then pick a new one; always face the camera
    for (const n of npcs) {
      const dx = n.tx - n.spr.position.x, dz = n.tz - n.spr.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.6) { const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 14; n.tx = Math.cos(a) * r; n.tz = Math.sin(a) * r; }
      else { n.spr.position.x += (dx / dist) * n.speed * dt; n.spr.position.z += (dz / dist) * n.speed * dt; }
      n.spr.position.y = 1 + Math.abs(Math.sin(elapsed * 6 + n.ph)) * 0.12; // little hop
      const q = camera.cam.quaternion.clone(); n.spr.quaternion.copy(q);
    }

    // multiplayer: broadcast my position (+ active emote) + draw friends
    if (net) {
      net.sendState({ x: player.pos.x, y: player.pos.y, z: player.pos.z, ry: player.facing, anim: emotes.current() || player.anim });
      remote.update(dt, camera.cam);
    }

    postfx.render();
    if (alive) rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  const onResize = () => { renderer.setSize(innerWidth, innerHeight); camera.cam.aspect = innerWidth / innerHeight; camera.cam.updateProjectionMatrix(); postfx.setSize(innerWidth, innerHeight); };
  window.addEventListener("resize", onResize);

  function destroy() {
    alive = false;
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("keydown", onKey);
    prompt.removeEventListener("click", onPromptClick);
    prompt.classList.add("hidden");
    controls.destroy?.();
    emotes.destroy?.();
    interactions.destroy?.();
    if (remote) remote.destroy();
    if (voice) voice.stop();
    if (net) net.leave();
    document.getElementById("explore-bar")?.classList.add("hidden");
    renderer.dispose();
    if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement);
  }
  return { destroy };
}

// load an image and knock out its white background -> transparent texture
function loadCutout(url, cb) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i] > 234 && a[i + 1] > 234 && a[i + 2] > 234) a[i + 3] = 0;
    }
    ctx.putImageData(d, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    cb(tex);
  };
  img.onerror = () => {};
  img.src = url;
}

function makeSign(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(20,32,63,0.85)";
  roundRect(ctx, 6, 10, 500, 76, 24); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 44px 'Baloo 2', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 50);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(4.2, 0.8, 1);
  return sprite;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function makeSky() {
  const geo = new THREE.SphereGeometry(300, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x6fbeff) }, mid: { value: new THREE.Color(0x9ad4ff) }, bottom: { value: new THREE.Color(0xeaf6ff) }, exponent: { value: 0.55 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vDir; uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform float exponent;
      void main(){ float t = pow(max(vDir.y,0.0), exponent); vec3 c = t < 0.5 ? mix(bottom, mid, t*2.0) : mix(mid, top, (t-0.5)*2.0); gl_FragColor = vec4(c, 1.0); }`,
  });
  return new THREE.Mesh(geo, mat);
}
