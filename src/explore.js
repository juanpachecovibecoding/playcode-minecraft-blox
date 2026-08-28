// Minecraft Hub World (Plains & Forest Biome)
// Built with voxel blocks, oak trees, cobblestone paths, obsidian Nether portals,
// torches, voxel flowers, beacon well, and 3D voxel mobs.

import * as THREE from "three";
import { createPlayer, updatePlayer, respawn } from "./player.js";
import { createAvatar } from "./avatar.js";
import { createControls, isTouchDevice } from "./controls.js";
import { createFollowCamera, intentToWorld } from "./camera.js";
import { createEmotes } from "./emotes.js";
import { createInteractions } from "./interactions.js";
import {
  getBlockMaterial,
  createVoxelBlock,
  getFlowerRedTex,
  getFlowerYellowTex,
  getSunTex,
  markBloom
} from "./gfx.js";
import { createPostFX } from "./postfx.js";
import { sfx } from "./audio.js";
import { createNet, MULTIPLAYER_AVAILABLE } from "./net.js";
import { createVoice } from "./voice.js";
import { createRemotePlayers } from "./remotePlayers.js";
import { colorForId } from "./avatar.js";
import * as profile from "./profile.js";

const HIGH_END = !isTouchDevice() && window.devicePixelRatio < 2.5 && (navigator.hardwareConcurrency || 4) > 4;
const LOW = isTouchDevice() && window.devicePixelRatio >= 2;

const ZONES = [
  { key: "obby", name: "Carrera de Obstáculos", emoji: "🏃", color: 0x8824d6, type: "nether" },
  { key: "arcade", name: "Quiz Arcade", emoji: "⚡", color: 0xf8d93c, type: "arcade" },
  { key: "puzzles", name: "Rompecabezas", emoji: "🧩", color: 0x17dd62, type: "puzzles" },
  { key: "learn", name: "Aprender", emoji: "📚", color: 0x5fc6f0, type: "library" },
  { key: "coinrush", name: "Lluvia de Monedas", emoji: "🪙", color: 0xffcf3a, type: "desert" },
  { key: "maze", name: "Laberinto", emoji: "🌀", color: 0x4fa85c, type: "maze" },
  { key: "closet", name: "Mi Ropero", emoji: "👕", color: 0xff94bc, type: "closet" },
];

export function startExplore(onEnter, opts = {}) {
  const mp = opts.multiplayer || null;
  const root = document.getElementById("game-root");
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xb2d9ff, 45, 160);

  // Minecraft Skybox with square sun & flat voxel clouds
  scene.add(makeMinecraftSky());

  scene.add(new THREE.HemisphereLight(0xfffae8, 0x9ec7eb, 0.95));
  scene.add(new THREE.AmbientLight(0x7ea4cc, 0.25));

  const sun = new THREE.DirectionalLight(0xfff7d9, 1.35);
  sun.castShadow = true;
  sun.position.set(30, 45, 20);
  sun.shadow.mapSize.set(HIGH_END ? 2048 : 1024, HIGH_END ? 2048 : 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -45;
  sun.shadow.camera.right = sun.shadow.camera.top = 45;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const colliders = [];
  const aabb = (cx, cy, cz, sx, sy, sz) => ({
    min: { x: cx - sx / 2, y: cy - sy / 2, z: cz - sz / 2 },
    max: { x: cx + sx / 2, y: cy + sy / 2, z: cz + sz / 2 }
  });

  const R = 32;

  // 1. Voxel Terrain: Grass block surface with dirt underneath
  const ground = createVoxelBlock("grass", (R + 6) * 2, 2, (R + 6) * 2);
  ground.position.set(0, -1, 0);
  ground.receiveShadow = true;
  scene.add(ground);
  colliders.push(aabb(0, -1, 0, (R + 6) * 2, 2, (R + 6) * 2));

  // Cobblestone central plaza
  const plazaMat = getBlockMaterial("cobblestone");
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(22, 0.1, 22), plazaMat);
  plaza.position.set(0, 0.05, 0);
  plaza.receiveShadow = true;
  scene.add(plaza);

  // Cobblestone paths to portals
  for (let i = 0; i < ZONES.length; i++) {
    const ang = (i / ZONES.length) * Math.PI * 2;
    const pathMesh = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.08, 14), plazaMat);
    pathMesh.position.set(Math.cos(ang) * 12, 0.04, Math.sin(ang) * 12);
    pathMesh.rotation.y = -ang + Math.PI / 2;
    pathMesh.receiveShadow = true;
    scene.add(pathMesh);
  }

  // 2. Central Minecraft Fountain / Beacon Well
  const fountain = new THREE.Group();
  // Cobblestone basin rim
  const basinMat = getBlockMaterial("stone_brick");
  const basin = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.8, 5.4), basinMat);
  basin.position.y = 0.4;
  basin.castShadow = true;
  basin.receiveShadow = true;
  fountain.add(basin);

  // Water block inside basin
  const waterMesh = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, 4.4), getBlockMaterial("water"));
  waterMesh.position.y = 0.65;
  fountain.add(waterMesh);

  // Diamond block base
  const diamondBase = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 2), getBlockMaterial("diamond_block"));
  diamondBase.position.y = 0.7;
  diamondBase.castShadow = true;
  fountain.add(diamondBase);

  // Beacon block in center
  const beaconMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), getBlockMaterial("obsidian"));
  beaconMesh.position.y = 1.6;
  beaconMesh.castShadow = true;
  fountain.add(beaconMesh);

  // Beacon Light Beam (vertical cylinder shooting up)
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x5fedd9,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 45, 8), beamMat);
  beam.position.y = 24;
  markBloom(beam);
  fountain.add(beam);

  // Spinning "PlayCode" Voxel Gold/Diamond Logo
  const logoGroup = new THREE.Group();
  logoGroup.position.y = 3.6;
  const barMat = getBlockMaterial("gold_block");
  const barGeo1 = new THREE.BoxGeometry(0.2, 0.5, 0.2);
  const barGeo2 = new THREE.BoxGeometry(0.2, 1.0, 0.2);
  const b1 = new THREE.Mesh(barGeo1, barMat); b1.position.set(-0.6, 0.2, 0); b1.rotation.z = -Math.PI / 6;
  const b2 = new THREE.Mesh(barGeo1, barMat); b2.position.set(-0.6, -0.2, 0); b2.rotation.z = Math.PI / 6;
  const b3 = new THREE.Mesh(barGeo2, barMat); b3.position.set(0, 0, 0); b3.rotation.z = -Math.PI / 6;
  const b4 = new THREE.Mesh(barGeo1, barMat); b4.position.set(0.6, 0.2, 0); b4.rotation.z = Math.PI / 6;
  const b5 = new THREE.Mesh(barGeo1, barMat); b5.position.set(0.6, -0.2, 0); b5.rotation.z = -Math.PI / 6;
  logoGroup.add(b1, b2, b3, b4, b5);

  const cvs = document.createElement("canvas"); cvs.width = 256; cvs.height = 64;
  const ctx = cvs.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 56);
  ctx.font = "bold 32px monospace"; ctx.fillStyle = "#ffff55"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("PLAY CODE", 128, 32);
  const tex = new THREE.CanvasTexture(cvs);
  tex.magFilter = THREE.NearestFilter;
  const planeMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const textPlane1 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), planeMat); textPlane1.position.y = -0.7;
  const textPlane2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), planeMat); textPlane2.position.y = -0.7; textPlane2.rotation.y = Math.PI;
  logoGroup.add(textPlane1, textPlane2);
  logoGroup.scale.setScalar(1.6);
  fountain.add(logoGroup);

  scene.add(fountain);
  colliders.push(aabb(0, 0.8, 0, 5.6, 1.6, 5.6));

  // 3. Minecraft Oak Trees
  function makeMinecraftTree(x, z, h = 4) {
    const tg = new THREE.Group();
    // Wood log trunk
    for (let y = 0; y < h; y++) {
      const log = createVoxelBlock("log", 1, 1, 1);
      log.position.set(0, y + 0.5, 0);
      tg.add(log);
    }
    // Leaves volume (3x3 top, 5x5 middle)
    const leavesMat = getBlockMaterial("oak_leaves");
    const leafGeo5 = new THREE.BoxGeometry(4.8, 1.8, 4.8);
    const leavesLower = new THREE.Mesh(leafGeo5, leavesMat);
    leavesLower.position.set(0, h - 0.2, 0);
    leavesLower.castShadow = true;
    tg.add(leavesLower);

    const leafGeo3 = new THREE.BoxGeometry(3.0, 1.4, 3.0);
    const leavesUpper = new THREE.Mesh(leafGeo3, leavesMat);
    leavesUpper.position.set(0, h + 1.2, 0);
    leavesUpper.castShadow = true;
    tg.add(leavesUpper);

    tg.position.set(x, 0, z);
    scene.add(tg);
    colliders.push(aabb(x, h / 2, z, 1.2, h, 1.2));
  }

  // Scatter trees around perimeter
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.25;
    const rr = 23 + (i % 3) * 2.5;
    makeMinecraftTree(Math.cos(a) * rr, Math.sin(a) * rr, 4 + (i % 2));
  }

  // 4. Wooden Fences & Torches
  const fenceMat = getBlockMaterial("oak_planks");
  const postGeo = new THREE.BoxGeometry(0.25, 1.2, 0.25);
  const railGeo = new THREE.BoxGeometry(2.4, 0.16, 0.12);

  function makeTorch(x, y, z) {
    const tg = new THREE.Group();
    // Wooden stick
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), getBlockMaterial("oak_planks"));
    stick.position.y = 0.2;
    // Flame tip
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const flame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), flameMat);
    flame.position.y = 0.42;
    markBloom(flame);
    tg.add(stick, flame);
    tg.position.set(x, y, z);
    scene.add(tg);
  }

  // Fence circle
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const x = Math.cos(a) * (R + 1), z = Math.sin(a) * (R + 1);
    const post = new THREE.Mesh(postGeo, fenceMat);
    post.position.set(x, 0.6, z);
    post.lookAt(0, 0.6, 0);
    scene.add(post);

    const rail = new THREE.Mesh(railGeo, fenceMat);
    rail.position.set(x, 0.75, z);
    rail.lookAt(0, 0.75, 0);
    scene.add(rail);

    // Torches every 6th post
    if (i % 6 === 0) {
      makeTorch(x, 1.2, z);
    }
  }

  // 5. Minecraft Flowers (Red Poppies & Yellow Dandelions)
  const redFlowerTex = getFlowerRedTex();
  const yellowFlowerTex = getFlowerYellowTex();
  const flowerGeo = new THREE.PlaneGeometry(0.7, 0.7);

  function makeFlower(x, z, isRed) {
    const fg = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      map: isRed ? redFlowerTex : yellowFlowerTex,
      transparent: true,
      alphaTest: 0.4,
      side: THREE.DoubleSide
    });
    const p1 = new THREE.Mesh(flowerGeo, mat); p1.position.y = 0.35;
    const p2 = new THREE.Mesh(flowerGeo, mat); p2.position.y = 0.35; p2.rotation.y = Math.PI / 2;
    fg.add(p1, p2);
    fg.position.set(x, 0, z);
    scene.add(fg);
  }

  for (let i = 0; i < 36; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 12 + Math.random() * 16;
    makeFlower(Math.cos(a) * r, Math.sin(a) * r, i % 2 === 0);
  }

  // 6. Decorative Voxel Crafting Tables, Chests & Bookshelves around Plaza
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.8;
    const cx = Math.cos(a) * 9, cz = Math.sin(a) * 9;
    if (i % 2 === 0) {
      const ct = createVoxelBlock("crafting_table", 1, 1, 1);
      ct.position.set(cx, 0.5, cz);
      scene.add(ct);
      colliders.push(aabb(cx, 0.5, cz, 1, 1, 1));
      makeTorch(cx, 1.0, cz);
    } else {
      const bs = createVoxelBlock("bookshelf", 1, 1, 1);
      bs.position.set(cx, 0.5, cz);
      scene.add(bs);
      colliders.push(aabb(cx, 0.5, cz, 1, 1, 1));
    }
  }

  // 7. Minecraft 3D Voxel Animals / Mobs roaming around
  const mobs = [];
  function createVoxelMob(type, x, z) {
    const mg = new THREE.Group();
    const m = (c) => new THREE.MeshLambertMaterial({ color: c });

    if (type === "sheep") {
      // White wool body + head
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.4), m(0xededed));
      body.position.y = 0.8;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.6), m(0xf5c596));
      head.position.set(0, 1.1, 0.8);
      // 4 legs
      for (const [lx, lz] of [[-0.3, -0.4], [0.3, -0.4], [-0.3, 0.4], [0.3, 0.4]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), m(0xf5c596));
        leg.position.set(lx, 0.25, lz);
        mg.add(leg);
      }
      mg.add(body, head);
    } else if (type === "pig") {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.3), m(0xf2a1a1));
      body.position.y = 0.7;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), m(0xf2a1a1));
      head.position.set(0, 0.95, 0.7);
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.15), m(0xdb7777));
      snout.position.set(0, 0.9, 1.0);
      for (const [lx, lz] of [[-0.28, -0.38], [0.28, -0.38], [-0.28, 0.38], [0.28, 0.38]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.22), m(0xf2a1a1));
        leg.position.set(lx, 0.22, lz);
        mg.add(leg);
      }
      mg.add(body, head, snout);
    } else { // wolf / dog
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.1), m(0xd4d4d4));
      body.position.y = 0.65;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.5), m(0xd4d4d4));
      head.position.set(0, 0.95, 0.65);
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.15, 0.15), m(0xe83b3b));
      collar.position.set(0, 0.85, 0.42);
      for (const [lx, lz] of [[-0.22, -0.3], [0.22, -0.3], [-0.22, 0.3], [0.22, 0.3]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), m(0xd4d4d4));
        leg.position.set(lx, 0.22, lz);
        mg.add(leg);
      }
      mg.add(body, head, collar);
    }

    mg.position.set(x, 0, z);
    mg.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(mg);
    mobs.push({ root: mg, tx: x, tz: z, speed: 0.8 + Math.random() * 0.8, timer: 0 });
  }

  createVoxelMob("sheep", 6, 7);
  createVoxelMob("sheep", -8, 6);
  createVoxelMob("pig", 7, -7);
  createVoxelMob("pig", -6, -8);
  createVoxelMob("wolf", 0, -10);

  // 8. 3D Voxel Activity Portals (Nether Portal, Temple, Cabins)
  const portals = [];
  const ringR = 19;

  ZONES.forEach((z, i) => {
    const ang = (i / ZONES.length) * Math.PI * 2;
    const px = Math.cos(ang) * ringR;
    const pz = Math.sin(ang) * ringR;
    const rot = -ang - Math.PI / 2;

    const portalGroup = new THREE.Group();
    portalGroup.position.set(px, 0, pz);
    portalGroup.rotation.y = rot;

    // Obsidian Portal Frame (Width 4, Height 5)
    const obsMat = getBlockMaterial("obsidian");
    const frameGeo = new THREE.BoxGeometry(1, 1, 1);

    // Base
    for (let bx = -1.5; bx <= 1.5; bx += 1) {
      const b = new THREE.Mesh(frameGeo, obsMat);
      b.position.set(bx, 0.5, 0);
      b.castShadow = true; portalGroup.add(b);
    }
    // Pillars
    for (let by = 1.5; by <= 4.5; by += 1) {
      const bL = new THREE.Mesh(frameGeo, obsMat); bL.position.set(-1.5, by, 0); bL.castShadow = true;
      const bR = new THREE.Mesh(frameGeo, obsMat); bR.position.set(1.5, by, 0); bR.castShadow = true;
      portalGroup.add(bL, bR);
    }
    // Top
    for (let bx = -1.5; bx <= 1.5; bx += 1) {
      const b = new THREE.Mesh(frameGeo, obsMat);
      b.position.set(bx, 4.5, 0);
      b.castShadow = true; portalGroup.add(b);
    }

    // Portal Energy Interior (Glowing purple plane)
    const portalEnergyMat = getBlockMaterial("nether_portal");
    const energyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.0, 0.3), portalEnergyMat);
    energyMesh.position.set(0, 2.5, 0);
    markBloom(energyMesh);
    portalGroup.add(energyMesh);

    // Torches on portal pillars
    makeTorch(px + Math.cos(rot + Math.PI / 2) * 1.6, 2.8, pz + Math.sin(rot + Math.PI / 2) * 1.6);
    makeTorch(px - Math.cos(rot + Math.PI / 2) * 1.6, 2.8, pz - Math.sin(rot + Math.PI / 2) * 1.6);

    // Minecraft Wooden Sign Board above Portal
    const signCvs = document.createElement("canvas");
    signCvs.width = 512; signCvs.height = 128;
    const sctx = signCvs.getContext("2d");
    sctx.imageSmoothingEnabled = false;
    sctx.fillStyle = "#8a6639"; sctx.fillRect(0, 0, 512, 128);
    sctx.strokeStyle = "#4a3318"; sctx.lineWidth = 6; sctx.strokeRect(6, 6, 500, 116);
    sctx.font = "bold 44px monospace, sans-serif"; sctx.fillStyle = "#ffffff"; sctx.textAlign = "center"; sctx.textBaseline = "middle";
    sctx.fillText(`${z.emoji} ${z.name}`, 256, 64);
    const signTex = new THREE.CanvasTexture(signCvs);
    signTex.magFilter = THREE.NearestFilter;
    const signPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.9),
      new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
    );
    signPlane.position.set(0, 5.4, 0.1);
    portalGroup.add(signPlane);

    // Glowing Activation Pad in front of portal
    const padMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.12, 2.8),
      new THREE.MeshLambertMaterial({ color: z.color })
    );
    padMesh.position.set(0, 0.06, 2.2);
    padMesh.receiveShadow = true;
    portalGroup.add(padMesh);

    scene.add(portalGroup);
    colliders.push(aabb(px, 2.5, pz, 4.2, 5.0, 1.6));

    const padWorldPos = new THREE.Vector3(0, 0.06, 2.2).applyMatrix4(portalGroup.matrixWorld);
    portals.push({
      key: z.key,
      name: z.name,
      emoji: z.emoji,
      color: z.color,
      pos: { x: padWorldPos.x, z: padWorldPos.z },
      group: portalGroup,
      energy: energyMesh
    });
  });

  // ---------- Player, Camera, Controls, Multiplayer ----------
  const spawn = { x: 0, y: 1.5, z: 8 };
  const player = createPlayer(spawn);
  if (import.meta.env.DEV) window.__bbPlayer = player;
  const avatar = createAvatar(profile.getColor(), opts.name || "", profile.getHat());
  scene.add(avatar.root);

  const camera = createFollowCamera(window.innerWidth / window.innerHeight, { dist: 6.2, height: 2.8 });
  camera.snap(player.pos);
  const controls = createControls();
  const emotes = createEmotes();
  const postfx = createPostFX(renderer, scene, camera.cam, { low: LOW });

  const hudInteractions = createInteractions({
    onSit: () => emotes.play("sit"),
    onDance: () => emotes.play("dance"),
    onWave: () => emotes.play("wave"),
  });

  let net = null, voice = null, remotes = null;
  if (mp) {
    remotes = createRemotePlayers(scene);
    net = createNet({
      code: mp.code,
      name: mp.name,
      color: colorForId(mp.name),
      onPeerJoin: (p) => remotes.add(p),
      onPeerLeave: (id) => remotes.remove(id),
      onPeerMove: (id, m) => remotes.update(id, m),
      onPeerEmote: (id, e) => remotes.emote(id, e),
    });
    voice = createVoice({ code: mp.code, name: mp.name });
  }

  // Enter Portal UI Prompt
  const enterBtn = document.createElement("button");
  enterBtn.id = "explore-enter-btn";
  enterBtn.className = "explore-enter-btn hidden";
  root.appendChild(enterBtn);
  let activePortal = null;

  enterBtn.addEventListener("click", () => {
    if (!activePortal) return;
    sfx.click();
    destroy();
    if (onEnter) onEnter(activePortal.key);
  });

  let alive = true, last = performance.now(), elapsed = 0, rafId = 0;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;

    const inRaw = controls.getInput();
    const look = controls.getLook();
    if (look.dx || look.dy) camera.rotate(look.dx, look.dy);
    const dir = intentToWorld(inRaw.fwd, inRaw.right, camera.state.yaw);
    const moving = Math.hypot(inRaw.fwd, inRaw.right) > 0.05;
    const wasGrounded = player.grounded;

    updatePlayer(player, dt, { moveX: dir.x, moveZ: dir.z, jump: inRaw.jump }, colliders);
    if (inRaw.jump && wasGrounded) sfx.jump();

    // Clamp inside world bounds
    const distCenter = Math.hypot(player.pos.x, player.pos.z);
    if (distCenter > R + 1) {
      player.pos.x *= (R + 1) / distCenter;
      player.pos.z *= (R + 1) / distCenter;
    }
    if (player.pos.y < -10) respawn(player, spawn);

    const anim = emotes.tick(dt, moving);
    avatar.root.position.set(player.pos.x, player.pos.y + 0.15, player.pos.z);
    avatar.root.rotation.y = player.facing;
    avatar.update(anim, dt, camera.cam);

    camera.follow(player.pos, dt, { facing: player.facing, moving });

    // Rotate Central Logo
    logoGroup.rotation.y += dt * 0.8;

    // Portal energy pulse & interaction check
    let nearestPortal = null;
    let minPortalDist = 999;
    for (const p of portals) {
      p.energy.material.opacity = 0.7 + Math.sin(elapsed * 4 + p.pos.x) * 0.2;
      const d = Math.hypot(player.pos.x - p.pos.x, player.pos.z - p.pos.z);
      if (d < minPortalDist) {
        minPortalDist = d;
        if (d < 2.6) nearestPortal = p;
      }
    }

    if (nearestPortal !== activePortal) {
      activePortal = nearestPortal;
      if (activePortal) {
        enterBtn.innerHTML = `<span>Entrar a <b>${activePortal.name}</b> ${activePortal.emoji}</span>`;
        enterBtn.classList.remove("hidden");
      } else {
        enterBtn.classList.add("hidden");
      }
    }

    // Mob roaming
    for (const mob of mobs) {
      mob.timer -= dt;
      if (mob.timer <= 0) {
        mob.timer = 3 + Math.random() * 4;
        const ra = Math.random() * Math.PI * 2;
        const rd = 4 + Math.random() * 12;
        mob.tx = Math.cos(ra) * rd;
        mob.tz = Math.sin(ra) * rd;
      }
      const mdx = mob.tx - mob.root.position.x;
      const mdz = mob.tz - mob.root.position.z;
      const mdist = Math.hypot(mdx, mdz);
      if (mdist > 0.4) {
        mob.root.position.x += (mdx / mdist) * mob.speed * dt;
        mob.root.position.z += (mdz / mdist) * mob.speed * dt;
        mob.root.rotation.y = Math.atan2(mdx, mdz);
      }
    }

    // Multiplayer broadcast
    if (net && (moving || inRaw.jump)) {
      net.sendMove({ x: player.pos.x, y: player.pos.y, z: player.pos.z, facing: player.facing, anim });
    }
    if (remotes) remotes.tick(dt, camera.cam);

    postfx.render();
    if (alive) rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  function handleResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.resize(window.innerWidth / window.innerHeight);
    postfx.resize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", handleResize);

  function destroy() {
    alive = false;
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", handleResize);
    controls.destroy();
    hudInteractions.destroy();
    if (enterBtn.parentElement) enterBtn.remove();
    if (net) net.destroy();
    if (voice) voice.destroy();
    renderer.dispose();
    if (renderer.domElement.parentElement) renderer.domElement.remove();
  }

  return { destroy, player, camera, scene };
}

// Minecraft Sky with square sun and flat voxel clouds
function makeMinecraftSky() {
  const skyGroup = new THREE.Group();

  // Sky dome / background
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x82b4ff, side: THREE.BackSide });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(140, 16, 16), skyMat);
  skyGroup.add(skyDome);

  // Square Sun
  const sunTex = getSunTex();
  const sunPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, side: THREE.DoubleSide })
  );
  sunPlane.position.set(40, 70, 30);
  sunPlane.lookAt(0, 0, 0);
  markBloom(sunPlane);
  skyGroup.add(sunPlane);

  // Flat Voxel Clouds
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
  for (let i = 0; i < 12; i++) {
    const cw = 16 + (i % 3) * 8;
    const cd = 14 + (i % 2) * 10;
    const cloud = new THREE.Mesh(new THREE.BoxGeometry(cw, 2.5, cd), cloudMat);
    cloud.position.set((i * 24) % 180 - 90, 45 + (i % 2) * 4, ((i * 37) % 180) - 90);
    skyGroup.add(cloud);
  }

  return skyGroup;
}
