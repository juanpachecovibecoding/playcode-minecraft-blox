// Shared 3D rig for simple walk-around modes (Coin Rush, Maze).
// Includes Minecraft sky, square sun, lighting, post-fx, voxel player, and controls.

import * as THREE from "three";
import { createPlayer, updatePlayer, respawn } from "./player.js";
import { createAvatar } from "./avatar.js";
import { createControls, isTouchDevice } from "./controls.js";
import { createFollowCamera, intentToWorld } from "./camera.js";
import { createEmotes } from "./emotes.js";
import { getBlockMaterial, createVoxelBlock, getSunTex, markBloom } from "./gfx.js";
import { createPostFX } from "./postfx.js";
import { sfx } from "./audio.js";
import * as profile from "./profile.js";

const HIGH_END = !isTouchDevice() && window.devicePixelRatio < 2.5 && (navigator.hardwareConcurrency || 4) > 4;
const LOW = isTouchDevice() && window.devicePixelRatio >= 2;

export function createScene3d(spawn, opts = {}) {
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
  scene.add(makeMinecraftSky());

  scene.add(new THREE.HemisphereLight(0xfffae8, 0x9ec7eb, 0.95));
  scene.add(new THREE.AmbientLight(0x7ea4cc, 0.25));

  const sun = new THREE.DirectionalLight(0xfff7d9, 1.35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(HIGH_END ? 2048 : 1024, HIGH_END ? 2048 : 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -40;
  sun.shadow.camera.right = sun.shadow.camera.top = 40;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const colliders = [];
  const aabb = (cx, cy, cz, sx, sy, sz) => ({
    min: { x: cx - sx / 2, y: cy - sy / 2, z: cz - sz / 2 },
    max: { x: cx + sx / 2, y: cy + sy / 2, z: cz + sz / 2 }
  });

  function addGround(radius, blockType = "grass") {
    const size = radius * 2;
    const g = createVoxelBlock(blockType, size, 2, size);
    g.position.set(0, -1, 0);
    g.receiveShadow = true;
    scene.add(g);
    colliders.push(aabb(0, -1, 0, size, 2, size));
    return g;
  }

  function addGroundPlane(w, d, blockType = "grass") {
    const g = createVoxelBlock(blockType, w, 2, d);
    g.position.set(0, -1, 0);
    g.receiveShadow = true;
    scene.add(g);
    colliders.push(aabb(0, -1, 0, w, 2, d));
    return g;
  }

  const player = createPlayer(spawn);
  if (import.meta.env.DEV) window.__bbPlayer = player;
  const avatar = createAvatar(profile.getColor(), opts.name || "", profile.getHat());
  scene.add(avatar.root);

  const camera = createFollowCamera(window.innerWidth / window.innerHeight, {
    dist: opts.camDist ?? 6.2,
    height: opts.camHeight ?? 2.8
  });
  camera.snap(player.pos);
  const controls = createControls();
  const emotes = createEmotes();
  const postfx = createPostFX(renderer, scene, camera.cam, { low: LOW });

  const bounds = opts.bounds || 0;
  let alive = true, last = performance.now(), elapsed = 0, rafId = 0, hook = null;

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

    if (bounds) {
      const d = Math.hypot(player.pos.x, player.pos.z);
      if (d > bounds) {
        player.pos.x *= bounds / d;
        player.pos.z *= bounds / d;
      }
    }
    if (player.pos.y < -12) respawn(player, spawn);

    const anim = emotes.tick(dt, moving);
    avatar.root.position.set(player.pos.x, player.pos.y + 0.15, player.pos.z);
    avatar.root.rotation.y = player.facing;
    avatar.update(anim, dt, camera.cam);

    camera.update(player.pos, dt, colliders);
    sun.position.set(player.pos.x + 18, 34, player.pos.z + 12);
    sun.target.position.set(player.pos.x, 0, player.pos.z);

    if (hook) hook(dt, elapsed);
    postfx.render();
    if (alive) rafId = requestAnimationFrame(frame);
  }

  function run(fn) {
    hook = fn;
    rafId = requestAnimationFrame(frame);
  }

  const onResize = () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.resize(innerWidth / innerHeight);
    postfx.resize(innerWidth, innerHeight);
  };
  window.addEventListener("resize", onResize);

  function destroy() {
    alive = false;
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    controls.destroy?.();
    emotes.destroy?.();
    renderer.dispose();
    if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement);
  }

  return {
    renderer,
    scene,
    sun,
    player,
    avatar,
    camera,
    controls,
    postfx,
    colliders,
    aabb,
    addGround,
    addGroundPlane,
    run,
    destroy,
    paused: (v) => { hook && (hook._paused = v); }
  };
}

function makeMinecraftSky() {
  const skyGroup = new THREE.Group();
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x82b4ff, side: THREE.BackSide });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(160, 16, 16), skyMat);
  skyGroup.add(skyDome);

  const sunTex = getSunTex();
  const sunPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, side: THREE.DoubleSide })
  );
  sunPlane.position.set(40, 70, 30);
  sunPlane.lookAt(0, 0, 0);
  markBloom(sunPlane);
  skyGroup.add(sunPlane);

  return skyGroup;
}
