// Shared voxel graphics helpers & Minecraft materials.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
export * from "./minecraft_textures.js";

// 4-step grayscale ramp for banded cel shading
const ramp = new Uint8Array([90, 150, 210, 255]);
export const TOON_GRADIENT = new THREE.DataTexture(ramp, ramp.length, 1, THREE.RedFormat);
TOON_GRADIENT.minFilter = THREE.NearestFilter;
TOON_GRADIENT.magFilter = THREE.NearestFilter;
TOON_GRADIENT.generateMipmaps = false;
TOON_GRADIENT.needsUpdate = true;

export const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x14203f, side: THREE.BackSide });
OUTLINE_MAT.userData.shared = true;

export function toonMat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

export const BLOOM_LAYER = 1;
export function markBloom(obj) {
  obj.layers.enable(BLOOM_LAYER);
}

// In Minecraft voxel style, geometries are authentic sharp cubes / boxes
export function roundedGeo(w, h, d, radius = 0, segments = 1) {
  return new THREE.BoxGeometry(w, h, d);
}

export function addOutline(mesh, scale = 1.05) {
  const hull = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
  hull.scale.setScalar(scale);
  mesh.add(hull);
  return hull;
}

export { RoundedBoxGeometry };
