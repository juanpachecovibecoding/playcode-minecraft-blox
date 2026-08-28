// Selective-bloom post-processing. Two render passes per frame:
//   1) bloom pass - every non-glowing object is swapped to black, so ONLY the
//      objects on BLOOM_LAYER (rings, gates, goal, coins, sparkles) light up and
//      get blurred into a glow. The bright sky and pale platforms never bloom.
//   2) final pass - renders the real scene, adds the bloom on top, draws the
//      character outline (high-end), anti-aliases (SMAA), and tone-maps (Output).
// This is the proven three.js selective-bloom recipe and avoids the washed-out
// look you get from blooming the whole frame.

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { BLOOM_LAYER } from "./gfx.js";

// Character outlines are drawn cheaply with always-on inverted hulls in avatar.js,
// so no OutlinePass is needed here (it would double the outline and cost fill).
export function createPostFX(renderer, scene, camera, opts = {}) {
  const { low = false } = opts;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = low ? 1 : Math.min(window.devicePixelRatio, 2);

  const bloomLayer = new THREE.Layers();
  bloomLayer.set(BLOOM_LAYER);
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const stash = new Map();

  const renderPass = new RenderPass(scene, camera);

  // --- bloom-only composer (threshold 0: the scene is already black except glows) ---
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), low ? 0.35 : 0.5, 0.4, 0.0);
  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.setPixelRatio(pr);
  bloomComposer.setSize(w, h);
  bloomComposer.addPass(renderPass);
  bloomComposer.addPass(bloomPass);

  // --- final composer: scene + bloom + outline + AA + tonemap ---
  const mixPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: { baseTexture: { value: null }, bloomTexture: { value: bloomComposer.renderTarget2.texture } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv;
        void main(){ gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv); }`,
    }),
    "baseTexture"
  );
  mixPass.needsSwap = true;

  const finalComposer = new EffectComposer(renderer);
  finalComposer.setPixelRatio(pr);
  finalComposer.setSize(w, h);
  finalComposer.addPass(renderPass);
  finalComposer.addPass(mixPass);
  finalComposer.addPass(new SMAAPass(w, h));
  finalComposer.addPass(new OutputPass());

  function darken(obj) {
    if (obj.isMesh && !bloomLayer.test(obj.layers)) {
      stash.set(obj, obj.material);
      obj.material = darkMat;
    }
  }
  function restore(obj) {
    if (stash.has(obj)) {
      obj.material = stash.get(obj);
      stash.delete(obj);
    }
  }

  function render() {
    scene.traverse(darken);
    bloomComposer.render();
    scene.traverse(restore);
    finalComposer.render();
  }

  function setSize(width, height) {
    bloomComposer.setSize(width, height);
    finalComposer.setSize(width, height);
    bloomPass.setSize(width, height);
  }

  return { render, setSize };
}
