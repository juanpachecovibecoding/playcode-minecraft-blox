// Minecraft Voxel Obby (Parkour World)
// Built with authentic Minecraft block platforms: Grass, Oak Planks, Stone Bricks,
// Sandstone, Obsidian, Gold & Diamond blocks.
// Checkpoints are Emerald & Redstone Lamp pedestals with Beacon light rings.
// Goal is a Diamond/Gold monument with a Minecraft Wool Banner.

import * as THREE from "three";
import { getBlockMaterial, createVoxelBlock, markBloom } from "./gfx.js";

const BLOCK_TYPES = [
  "grass",
  "oak_planks",
  "stone_brick",
  "sand",
  "obsidian",
  "gold_block",
  "diamond_block",
];

function boxAABB(cx, cy, cz, sx, sy, sz) {
  return {
    min: { x: cx - sx / 2, y: cy - sy / 2, z: cz - sz / 2 },
    max: { x: cx + sx / 2, y: cy + sy / 2, z: cz + sz / 2 },
  };
}

export const GATE_COUNT = 6;

export function buildWorld() {
  const group = new THREE.Group();
  const platforms = [];
  const checkpoints = [];
  const gates = [];

  let typeIdx = 0;

  function addPlatform(cx, cy, cz, sx, sy, sz, blockType) {
    const type = blockType ?? BLOCK_TYPES[typeIdx++ % BLOCK_TYPES.length];
    const mesh = createVoxelBlock(type, sx, sy, sz);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    platforms.push(boxAABB(cx, cy, cz, sx, sy, sz));
    return mesh;
  }

  // ---- starting plaza ----
  const spawn = { x: 0, y: 2, z: 0 };
  addPlatform(0, -0.5, 0, 10, 1, 10, "grass");

  let z = 4.5;
  let y = 0;

  for (let g = 0; g < GATE_COUNT; g++) {
    const steps = 3 + (g % 2);
    for (let s = 0; s < steps; s++) {
      const width = Math.max(2.6, 3.4 - g * 0.16);
      const stepDist = width * 0.5 + 1.5 + g * 0.25;
      z += stepDist;
      y += Math.min(0.34, 0.26 + g * 0.02);
      const xoff = g < 2 ? 0 : (s % 2 === 0 ? -1 : 1) * Math.min(0.7, 0.3 + g * 0.06);
      addPlatform(xoff, y - 0.5, z, width, 1, width);
    }

    // ---- checkpoint pad (Emerald Block Platform + Beacon) ----
    z += 2.6;
    y += 0.28;
    addPlatform(0, y - 0.5, z, 5, 1, 5, "emerald_block");

    // Voxel Beacon Ring
    const ring = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.25, 3.2),
      new THREE.MeshBasicMaterial({ color: 0x17dd62 })
    );
    ring.position.set(0, y + 0.9, z);
    markBloom(ring);
    group.add(ring);

    const halo = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.4, 3.6),
      new THREE.MeshBasicMaterial({
        color: 0x56f996,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.position.copy(ring.position);
    markBloom(halo);
    group.add(halo);

    checkpoints.push({
      pos: { x: 0, y: y + 1, z },
      radius: 2.2,
      index: g,
      triggered: false,
      ring,
      halo,
      baseY: y + 0.9
    });

    // ---- locked gate (Voxel Iron Bar / Obsidian forcefield) ----
    const gateZ = z + 2.6;
    const gateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(6, 4, 0.5),
      new THREE.MeshBasicMaterial({
        color: 0x8824d6,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      })
    );
    gateMesh.position.set(0, y + 1.5, gateZ);
    markBloom(gateMesh);
    group.add(gateMesh);
    gates.push({
      index: g,
      mesh: gateMesh,
      aabb: boxAABB(0, y + 1.5, gateZ, 6, 4, 0.5),
      open: false
    });

    z = gateZ + 0.6;
  }

  // ---- goal podium (Diamond & Gold monument) ----
  z += 3.2;
  y += 0.45;
  addPlatform(0, y - 0.5, z, 6, 1, 6, "diamond_block");

  const inlay = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.15, 3.6),
    new THREE.MeshBasicMaterial({ color: 0xf8d93c })
  );
  inlay.position.set(0, y + 0.08, z);
  markBloom(inlay);
  group.add(inlay);

  // Minecraft Wool Banner on Wood Post
  const flagGroup = new THREE.Group();
  flagGroup.position.set(0, y, z);

  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), getBlockMaterial("oak_planks"));
  pole.position.y = 1.3;
  pole.castShadow = true;
  flagGroup.add(pole);

  const bannerMat = new THREE.MeshLambertMaterial({
    color: 0xe83b3b,
    side: THREE.DoubleSide
  });
  const flagGeo = new THREE.PlaneGeometry(1.0, 1.4, 6, 4);
  const flagPlane = new THREE.Mesh(flagGeo, bannerMat);
  flagPlane.position.set(0.55, 1.8, 0);
  flagPlane.castShadow = true;
  flagGroup.add(flagPlane);
  group.add(flagGroup);

  const flagBase = flagGeo.attributes.position.array.slice();
  const goal = { pos: { x: 0, y: y + 1, z }, radius: 2.4, flag: flagGroup, flagGeo, flagBase, inlay };

  function getColliders() {
    const closed = gates.filter((g) => !g.open).map((g) => g.aabb);
    return platforms.concat(closed);
  }

  function openGate(i) {
    const gate = gates[i];
    if (gate && !gate.open) gate.open = true;
  }

  return { group, platforms, checkpoints, gates, goal, spawn, getColliders, openGate };
}
