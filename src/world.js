// Builds the obby level in the "Storybook Toybox" style: rounded toon platforms
// with darker grass-top caps, glowing checkpoint rings, glowing locked gates, and
// a goal with a waving flag. The path is deliberately forgiving early (small
// gaps, wide platforms, near-centered) and ramps up, so an 8-year-old can clear
// it by running forward and hopping. Collision AABBs stay exact boxes.
//
// Returns: group, platforms (AABBs), checkpoints, gates, goal, spawn,
//          getColliders(), openGate(i).

import * as THREE from "three";
import { toonMat, roundedGeo, markBloom } from "./gfx.js";

// body + darker grass-cap hue pairs
const PALETTE = [
  [0xff8e72, 0xf2664a],
  [0x5fc6f0, 0x36a8d8],
  [0x5fd69a, 0x38c088],
  [0xffd45e, 0xf2b53c],
  [0xbfa1ff, 0xa07ff0],
  [0xff94bc, 0xf0689c],
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

  let colorIdx = 0;
  // a platform = rounded toon body block + a thin grass-cap on top (visual only).
  function addPlatform(cx, cy, cz, sx, sy, sz, pair) {
    const [body, cap] = pair ?? PALETTE[colorIdx++ % PALETTE.length];
    const mesh = new THREE.Mesh(roundedGeo(sx, sy, sz, 0.14, 2), toonMat(body));
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const capMesh = new THREE.Mesh(roundedGeo(sx * 0.98, 0.2, sz * 0.98, 0.08, 2), toonMat(cap));
    capMesh.position.set(cx, cy + sy / 2 - 0.02, cz);
    capMesh.receiveShadow = true;
    group.add(capMesh);

    platforms.push(boxAABB(cx, cy, cz, sx, sy, sz));
    return mesh;
  }

  // ---- starting plaza ----
  const spawn = { x: 0, y: 2, z: 0 };
  addPlatform(0, -0.5, 0, 10, 1, 10, [0x8ed1e8, 0x6fbfe0]);

  let z = 4.5;
  let y = 0;

  for (let g = 0; g < GATE_COUNT; g++) {
    const steps = 3 + (g % 2);
    for (let s = 0; s < steps; s++) {
      const width = Math.max(2.6, 3.4 - g * 0.16);
      const stepDist = width * 0.5 + 1.5 + g * 0.25; // gap grows with gate number
      z += stepDist;
      y += Math.min(0.34, 0.26 + g * 0.02); // gentle rise (auto step-up handles it)
      const xoff = g < 2 ? 0 : (s % 2 === 0 ? -1 : 1) * Math.min(0.7, 0.3 + g * 0.06);
      addPlatform(xoff, y - 0.5, z, width, 1, width);
    }

    // ---- checkpoint pad + glowing ring ----
    z += 2.6;
    y += 0.28;
    addPlatform(0, y - 0.5, z, 5, 1, 5, [0xfff1b8, 0xffe08a]);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.16, 12, 32),
      new THREE.MeshBasicMaterial({ color: 0x46e39b })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, y + 0.9, z);
    markBloom(ring);
    group.add(ring);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.32, 12, 32),
      new THREE.MeshBasicMaterial({ color: 0x46e39b, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.copy(ring.position);
    markBloom(halo);
    group.add(halo);

    checkpoints.push({ pos: { x: 0, y: y + 1, z }, radius: 2.2, index: g, triggered: false, ring, halo, baseY: y + 0.9 });

    // ---- locked glowing gate (a translucent toon "door") ----
    const gateZ = z + 2.6;
    const hue = PALETTE[g % PALETTE.length][0];
    const gateMesh = new THREE.Mesh(
      roundedGeo(6, 4, 0.6, 0.2, 2),
      toonMat(hue, { transparent: true, opacity: 0.55, emissive: new THREE.Color(hue), emissiveIntensity: 0.5 })
    );
    gateMesh.position.set(0, y + 1.5, gateZ);
    markBloom(gateMesh);
    group.add(gateMesh);
    gates.push({ index: g, mesh: gateMesh, aabb: boxAABB(0, y + 1.5, gateZ, 6, 4, 0.6), open: false });

    z = gateZ + 0.6;
  }

  // ---- goal podium + waving flag ----
  z += 3.2;
  y += 0.45;
  addPlatform(0, y - 0.5, z, 6, 1, 6, [0xffd23f, 0xf2b020]);
  const inlay = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.12, 12, 36),
    new THREE.MeshBasicMaterial({ color: 0xffd23f })
  );
  inlay.rotation.x = Math.PI / 2;
  inlay.position.set(0, y + 0.06, z);
  markBloom(inlay);
  group.add(inlay);

  const flagGroup = new THREE.Group();
  flagGroup.position.set(0, y, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 10), toonMat(0xf2f2f4));
  pole.position.y = 1.1;
  flagGroup.add(pole);
  const flagGeo = new THREE.PlaneGeometry(0.95, 0.6, 10, 4);
  const flagPlane = new THREE.Mesh(flagGeo, new THREE.MeshBasicMaterial({ color: 0xff5d6c, side: THREE.DoubleSide }));
  flagPlane.position.set(0.5, 1.85, 0);
  flagGroup.add(flagPlane);
  group.add(flagGroup);
  // remember each flag vertex's base x/y so the loop can ripple it
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
