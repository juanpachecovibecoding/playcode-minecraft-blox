// Minecraft Voxel Character (Steve / Alex blocky proportions)
// Sharp 90-degree boxy limbs, pixel-art facial textures, and stiff Minecraft-style limb swings.
// API: { root, update, setBodyColor }.

import * as THREE from "three";
import { toonMat, addOutline } from "./gfx.js";

export const AVATAR_COLORS = [
  0x5cc6f0, 0xff8e72, 0x5fd69a, 0xffd45e, 0xbfa1ff, 0xff94bc, 0xff6b6b, 0x52e0c4,
];

export function colorForId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// Generates a 16x16 pixel face texture for the Minecraft head (+Z face)
function makeFaceTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // Skin base
  ctx.fillStyle = "#f5c596";
  ctx.fillRect(0, 0, 16, 16);

  // Hair fringe at top
  ctx.fillStyle = "#4a2d18";
  ctx.fillRect(0, 0, 16, 4);
  ctx.fillRect(0, 4, 3, 2);
  ctx.fillRect(13, 4, 3, 2);

  // Eyes (white + pupil)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(3, 7, 3, 2);
  ctx.fillRect(10, 7, 3, 2);
  ctx.fillStyle = "#2d5bb9";
  ctx.fillRect(4, 7, 2, 2);
  ctx.fillRect(11, 7, 2, 2);

  // Nose
  ctx.fillStyle = "#e0ad7c";
  ctx.fillRect(7, 9, 2, 2);

  // Smile / Mouth
  ctx.fillStyle = "#703a1a";
  ctx.fillRect(6, 12, 4, 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Side/back hair texture for head
function makeHairTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "#4a2d18";
  ctx.fillRect(0, 0, 16, 16);
  // hair highlights
  ctx.fillStyle = "#5c3920";
  ctx.fillRect(2, 2, 4, 4);
  ctx.fillRect(10, 6, 4, 4);
  ctx.fillStyle = "#382010";
  ctx.fillRect(6, 10, 4, 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const faceTex = makeFaceTexture();
const hairTex = makeHairTexture();

export function createAvatar(bodyColor = 0x5cc6f0, name = "", hat = "none") {
  const root = new THREE.Group();
  const skin = 0xf5c596;
  const pants = 0x243e74;
  const shoes = 0x484848;

  // 1. Torso: box 0.72 wide, 0.86 high, 0.42 deep
  const torsoMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.86, 0.42), torsoMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  root.add(torsoMesh);

  // 2. Head: box 0.68 x 0.68 x 0.68 with pixel hair and face
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const hairMat = new THREE.MeshLambertMaterial({ map: hairTex });
  const faceMat = new THREE.MeshLambertMaterial({ map: faceTex });

  // Material order for BoxGeometry: +X (right), -X (left), +Y (top), -Y (bottom), +Z (front/face), -Z (back)
  const headMaterials = [hairMat, hairMat, hairMat, skinMat, faceMat, hairMat];
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.68, 0.68), headMaterials);
  head.position.y = 0.82;
  head.castShadow = true;
  root.add(head);

  // 3. Hat / Headgear
  const hatGroup = buildHat(hat);
  if (hatGroup) {
    hatGroup.position.y = 1.18;
    root.add(hatGroup);
  }

  // 4. Arms (Pivoted at shoulders)
  function makeArm(px) {
    const pivot = new THREE.Group();
    pivot.position.set(px, 0.38, 0);

    const armGeo = new THREE.BoxGeometry(0.24, 0.82, 0.24);
    const armMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    const armMesh = new THREE.Mesh(armGeo, armMat);
    armMesh.position.y = -0.41;
    armMesh.castShadow = true;
    pivot.add(armMesh);

    // Skin hand at bottom
    const handMesh = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.2, 0.23), skinMat);
    handMesh.position.y = -0.72;
    pivot.add(handMesh);

    root.add(pivot);
    return { pivot, armMesh };
  }

  const { pivot: armL, armMesh: armLMesh } = makeArm(-0.49);
  const { pivot: armR, armMesh: armRMesh } = makeArm(0.49);

  // 5. Legs (Pivoted at hips)
  function makeLeg(px) {
    const pivot = new THREE.Group();
    pivot.position.set(px, -0.43, 0);

    const legGeo = new THREE.BoxGeometry(0.28, 0.82, 0.28);
    const legMat = new THREE.MeshLambertMaterial({ color: pants });
    const legMesh = new THREE.Mesh(legGeo, legMat);
    legMesh.position.y = -0.41;
    legMesh.castShadow = true;
    pivot.add(legMesh);

    // Shoe at bottom
    const shoeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.16, 0.34), new THREE.MeshLambertMaterial({ color: shoes }));
    shoeMesh.position.set(0, -0.74, 0.03);
    pivot.add(shoeMesh);

    root.add(pivot);
    return pivot;
  }

  const legL = makeLeg(-0.18);
  const legR = makeLeg(0.18);

  const bodyMeshes = [torsoMesh, armLMesh, armRMesh];

  // Optional Name Tag
  let tag = null;
  if (name) {
    tag = makeNameTag(name);
    tag.position.set(0, 1.55, 0);
    root.add(tag);
  }

  function neutralExtras() {
    root.rotation.z = 0;
    root.rotation.x = 0;
    armL.rotation.z = 0;
    armR.rotation.z = 0;
  }

  let t = 0;
  function update(anim, dt, camera) {
    t += dt;
    neutralExtras();

    if (anim === "run") {
      const s = Math.sin(t * 11) * 0.95;
      legL.rotation.x = s;
      legR.rotation.x = -s;
      armL.rotation.x = -s;
      armR.rotation.x = s;
      armL.rotation.z = -0.06;
      armR.rotation.z = 0.06;
      torsoMesh.position.y = Math.abs(Math.sin(t * 11)) * 0.05;
      head.position.y = 0.82 + Math.abs(Math.sin(t * 11)) * 0.02;
    } else if (anim === "jump") {
      const e = 0.4;
      legL.rotation.x = THREE.MathUtils.lerp(legL.rotation.x, -0.45, e);
      legR.rotation.x = THREE.MathUtils.lerp(legR.rotation.x, 0.4, e);
      armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, -1.8, e);
      armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, -1.8, e);
      torsoMesh.position.y = 0;
      head.position.y = 0.82;
    } else if (anim === "cheer") {
      armL.rotation.x = -2.6;
      armR.rotation.x = -2.6;
      const b = Math.abs(Math.sin(t * 10));
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      torsoMesh.position.y = b * 0.1;
      head.position.y = 0.82 + b * 0.04;
      root.rotation.z = Math.sin(t * 16) * 0.04;
    } else if (anim === "wave") {
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, 0, 0.2);
      armR.rotation.x = -2.5;
      armR.rotation.z = Math.sin(t * 12) * 0.4 - 0.2;
      torsoMesh.position.y = Math.sin(t * 2) * 0.02;
    } else if (anim === "dance") {
      const s = Math.sin(t * 9);
      armL.rotation.x = -2.2 + s * 0.4;
      armR.rotation.x = -2.2 - s * 0.4;
      legL.rotation.x = s * 0.3;
      legR.rotation.x = -s * 0.3;
      torsoMesh.position.y = Math.abs(Math.sin(t * 9)) * 0.08;
      root.rotation.z = Math.sin(t * 4.5) * 0.15;
    } else if (anim === "sit") {
      legL.rotation.x = THREE.MathUtils.lerp(legL.rotation.x, -1.5, 0.3);
      legR.rotation.x = THREE.MathUtils.lerp(legR.rotation.x, -1.5, 0.3);
      armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, -0.4, 0.3);
      armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, -0.4, 0.3);
      torsoMesh.position.y = THREE.MathUtils.lerp(torsoMesh.position.y, -0.18, 0.3);
    } else if (anim === "laugh") {
      root.rotation.x = -0.16;
      armL.rotation.x = -1.1; armR.rotation.x = -1.1;
      armL.rotation.z = 0.4; armR.rotation.z = -0.4;
      legL.rotation.x = 0; legR.rotation.x = 0;
      torsoMesh.position.y = Math.abs(Math.sin(t * 14)) * 0.06;
    } else if (anim === "point") {
      legL.rotation.x = 0; legR.rotation.x = 0;
      armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, 0, 0.2);
      armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, -1.55, 0.3);
      torsoMesh.position.y = Math.sin(t * 2) * 0.02;
    } else {
      const e = 0.2;
      for (const l of [legL, legR, armL, armR]) l.rotation.x = THREE.MathUtils.lerp(l.rotation.x, 0, e);
      torsoMesh.position.y = Math.sin(t * 2) * 0.02;
      head.position.y = 0.82 + Math.sin(t * 2) * 0.01;
    }

    if (tag && camera) tag.quaternion.copy(camera.quaternion);
  }

  function setBodyColor(c) {
    for (const m of bodyMeshes) {
      m.material.color.set(c);
    }
  }

  return { root, update, setBodyColor };
}

// Voxel Hats & Headgear
export function buildHat(key) {
  const g = new THREE.Group();
  const m = (color) => new THREE.MeshLambertMaterial({ color });

  if (key === "cap") {
    // Voxel Cap
    const dome = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.2, 0.74), m(0xe83b3b));
    dome.position.y = 0.05;
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.35), m(0xe83b3b));
    brim.position.set(0, 0.02, 0.42);
    g.add(dome, brim);
  } else if (key === "crown") {
    // Voxel Gold Crown
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.12, 0.76), m(0xf6cd34));
    base.position.y = 0.06;
    g.add(base);
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.16), m(0xf6cd34));
    p1.position.set(-0.3, 0.18, -0.3);
    const p2 = p1.clone(); p2.position.set(0.3, 0.18, -0.3);
    const p3 = p1.clone(); p3.position.set(-0.3, 0.18, 0.3);
    const p4 = p1.clone(); p4.position.set(0.3, 0.18, 0.3);
    const p5 = p1.clone(); p5.position.set(0, 0.22, 0.3);
    g.add(p1, p2, p3, p4, p5);
  } else if (key === "party") {
    // Stepped Voxel Party Cone
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), m(0xff6b9d));
    b1.position.y = 0.08;
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.34), m(0xffe066));
    b2.position.y = 0.24;
    const b3 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), m(0x5fc6f0));
    b3.position.y = 0.4;
    g.add(b1, b2, b3);
  } else if (key === "beanie") {
    // Voxel Wool Beanie
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 0.76), m(0x4ca347));
    b1.position.y = 0.08;
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.58), m(0x357a31));
    b2.position.y = 0.24;
    const pom = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), m(0xffffff));
    pom.position.y = 0.4;
    g.add(b1, b2, pom);
  } else if (key === "propeller") {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.16, 0.74), m(0x3898ec));
    cap.position.y = 0.06;
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), m(0x6b7a99));
    pin.position.y = 0.2;
    const blades = new THREE.Group();
    blades.position.y = 0.3;
    const bl1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.12), m(0xffcc00));
    const bl2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.7), m(0xff4444));
    blades.add(bl1, bl2);
    g.userData.spin = blades;
    g.add(cap, pin, blades);
  } else if (key === "wizard") {
    // Voxel Wizard Hat
    const brim = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 1.0), m(0x5630a8));
    brim.position.y = 0.03;
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.2, 0.64), m(0x6b3fd6));
    b1.position.y = 0.15;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.66), m(0xffd23f));
    band.position.y = 0.12;
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.44), m(0x6b3fd6));
    b2.position.y = 0.32;
    const b3 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), m(0x6b3fd6));
    b3.position.y = 0.5;
    g.add(brim, b1, band, b2, b3);
  } else {
    return null;
  }

  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}

function makeNameTag(name) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // Minecraft-style dark box with border
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(16, 20, 480, 88);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 20, 480, 88);

  ctx.fillStyle = "#ffff55"; // Minecraft yellow name
  ctx.font = "bold 56px monospace, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name.slice(0, 14), 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(1.8, 0.45, 1);
  return sprite;
}
