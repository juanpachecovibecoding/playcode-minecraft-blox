// Shared cel-shaded "toy" graphics helpers used by the avatar, world, and props
// so everything reads as ONE cohesive storybook style. A single 3-band toon
// gradient map is shared across every toon material (cheap + consistent).

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// 4-step grayscale ramp -> flat banded cel shading.
const ramp = new Uint8Array([90, 150, 210, 255]);
export const TOON_GRADIENT = new THREE.DataTexture(ramp, ramp.length, 1, THREE.RedFormat);
TOON_GRADIENT.minFilter = THREE.NearestFilter;
TOON_GRADIENT.magFilter = THREE.NearestFilter;
TOON_GRADIENT.generateMipmaps = false;
TOON_GRADIENT.needsUpdate = true;

// Dark navy used for the inverted-hull character outlines. Shared + flagged so
// per-peer disposal never frees it (see remotePlayers.remove).
export const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x14203f, side: THREE.BackSide });
OUTLINE_MAT.userData.shared = true;

export function toonMat(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: TOON_GRADIENT, ...opts });
}

// Objects on this layer are the ONLY things that bloom (rings, gates, goal,
// coins, sparkles). Everything else - sky, platforms, characters - never blooms,
// which keeps the picture crisp instead of washed out.
export const BLOOM_LAYER = 1;
export function markBloom(obj) {
  obj.layers.enable(BLOOM_LAYER);
}

export function roundedGeo(w, h, d, radius = Math.min(w, h, d) * 0.16, segments = 3) {
  return new RoundedBoxGeometry(w, h, d, segments, radius);
}

// Add a cheap always-on toon outline to a mesh by parenting a slightly larger
// back-faced dark clone. Animates with the mesh since it is a child.
export function addOutline(mesh, scale = 1.08) {
  const hull = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
  hull.scale.setScalar(scale);
  mesh.add(hull);
  return hull;
}

export { RoundedBoxGeometry };
