// Shared 3D rig for the simple walk-around modes (Coin Rush, Maze). Sets up the
// renderer, lights, sky, fog, post-processing, player, avatar, follow camera and
// controls, and drives the per-frame movement + camera. A mode just adds its own
// meshes/colliders and passes a hook for its own logic.

import * as THREE from "three";
import { createPlayer, updatePlayer, respawn } from "./player.js";
import { createAvatar } from "./avatar.js";
import { createControls, isTouchDevice } from "./controls.js";
import { createFollowCamera, intentToWorld } from "./camera.js";
import { createEmotes } from "./emotes.js";
import { toonMat } from "./gfx.js";
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
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdcefff, 50, 170);
  scene.add(makeSky());
  scene.add(new THREE.HemisphereLight(0xfff7e6, 0xbfd4ff, 0.9));
  scene.add(new THREE.AmbientLight(0x9fb8e8, 0.18));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.25);
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
  const aabb = (cx, cy, cz, sx, sy, sz) => ({ min: { x: cx - sx / 2, y: cy - sy / 2, z: cz - sz / 2 }, max: { x: cx + sx / 2, y: cy + sy / 2, z: cz + sz / 2 } });

  function addGround(radius, color = 0x7ed87e) {
    const g = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), toonMat(color));
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    scene.add(g);
    colliders.push(aabb(0, -0.5, 0, radius * 2, 1, radius * 2));
    return g;
  }
  function addGroundPlane(w, d, color = 0x7ed87e) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toonMat(color));
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    scene.add(g);
    colliders.push(aabb(0, -0.5, 0, w, 1, d));
    return g;
  }

  const player = createPlayer(spawn);
  if (import.meta.env.DEV) window.__bbPlayer = player;
  const avatar = createAvatar(profile.getColor(), "", profile.getHat());
  scene.add(avatar.root);
  const camera = createFollowCamera(window.innerWidth / window.innerHeight, { dist: opts.camDist, height: opts.camHeight });
  camera.snap(player.pos);
  const controls = createControls();
  const emotes = createEmotes();
  const postfx = createPostFX(renderer, scene, camera.cam, { low: LOW });

  const bounds = opts.bounds || 0; // clamp player within this radius (0 = none)
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
      if (d > bounds) { player.pos.x *= bounds / d; player.pos.z *= bounds / d; }
    }
    if (player.pos.y < -12) respawn(player, spawn);
    emotes.tick(dt, moving);
    avatar.root.position.set(player.pos.x, player.pos.y + 0.15, player.pos.z);
    avatar.root.rotation.y = player.facing;
    avatar.update(emotes.current() || player.anim, dt, camera.cam);
    camera.follow(player.pos, dt, { facing: player.facing, moving });
    sun.position.set(player.pos.x + 18, 34, player.pos.z + 12);
    sun.target.position.set(player.pos.x, 0, player.pos.z);
    if (hook) hook(dt, elapsed);
    postfx.render();
    if (alive) rafId = requestAnimationFrame(frame);
  }

  function run(fn) { hook = fn; rafId = requestAnimationFrame(frame); }

  const onResize = () => { renderer.setSize(innerWidth, innerHeight); camera.cam.aspect = innerWidth / innerHeight; camera.cam.updateProjectionMatrix(); postfx.setSize(innerWidth, innerHeight); };
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

  return { renderer, scene, sun, player, avatar, camera, controls, postfx, colliders, aabb, addGround, addGroundPlane, run, destroy, paused: (v) => { hook && (hook._paused = v); } };
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
