// Minecraft Voxel Props & Collectibles
// Drifting flat voxel clouds, 3D rotating Emeralds / Gold Ingots,
// voxel oak trees & torches near checkpoints, and sparkle bursts.

import * as THREE from "three";
import { getBlockMaterial, createVoxelBlock, markBloom } from "./gfx.js";

export function createProps(scene, world, density = 1) {
  const group = new THREE.Group();
  scene.add(group);

  const clouds = [];
  const coins = [];
  const balloons = [];
  const transients = [];

  // ---- 1. Flat Voxel Clouds ----
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const cloudCount = Math.round(14 * density);
  for (let i = 0; i < cloudCount; i++) {
    const cw = 12 + (i % 3) * 6;
    const cd = 10 + (i % 2) * 8;
    const m = new THREE.Mesh(new THREE.BoxGeometry(cw, 2, cd), cloudMat);
    m.position.set((i * 13) % 70 - 35, 12 + (i % 3) * 3, i * 11 - 10);
    m.userData.speed = 0.4 + (i % 3) * 0.2;
    group.add(m);
    clouds.push(m);
  }

  // ---- 2. Collectible 3D Minecraft Emeralds between checkpoints ----
  const emeraldMat = new THREE.MeshLambertMaterial({
    color: 0x17dd62,
    emissive: new THREE.Color(0x0a6b2c),
    emissiveIntensity: 0.4
  });
  const emeraldGeo = new THREE.OctahedronGeometry(0.32, 0);

  {
    const cps = world.checkpoints;
    const per = density > 0.5 ? 3 : 2;
    for (let i = 0; i < cps.length; i++) {
      const a = i === 0 ? { x: world.spawn.x, y: 1, z: world.spawn.z } : cps[i - 1].pos;
      const b = cps[i].pos;
      for (let k = 1; k <= per; k++) {
        const t = k / (per + 1);
        const coin = new THREE.Mesh(emeraldGeo, emeraldMat);
        coin.scale.set(1.0, 1.4, 0.7); // Emerald gem shape
        coin.position.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t + 0.25, a.z + (b.z - a.z) * t);
        coin.userData.phase = i + k;
        coin.userData.collected = false;
        markBloom(coin);
        group.add(coin);
        coins.push(coin);
      }
    }
  }

  // ---- 3. Minecraft Oak Trees near checkpoints ----
  function makeVoxelTree(x, y, z, s = 1) {
    const tg = new THREE.Group();
    // 3 logs
    for (let ly = 0; ly < 3; ly++) {
      const log = createVoxelBlock("log", 0.6, 0.6, 0.6);
      log.position.y = ly * 0.6 + 0.3;
      tg.add(log);
    }
    // Leaf block
    const leafMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.4, 2.0),
      getBlockMaterial("oak_leaves")
    );
    leafMesh.position.y = 2.4;
    leafMesh.castShadow = true;
    tg.add(leafMesh);

    tg.position.set(x, y, z);
    tg.scale.setScalar(s);
    group.add(tg);
  }

  for (const cp of world.checkpoints) {
    if (density > 0.5) {
      makeVoxelTree(-3.5, cp.pos.y - 1, cp.pos.z, 0.9 + (cp.index % 2) * 0.2);
      makeVoxelTree(3.5, cp.pos.y - 1, cp.pos.z - 0.6, 0.85 + (cp.index % 3) * 0.2);
    }
  }

  // ---- 4. Power-up Pickups ----
  const powerupItems = [];
  function emojiSprite(char, size = 1.1) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(8, 8, 112, 112);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 112, 112);
    ctx.font = "80px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(char, 64, 68);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.scale.set(size, size, 1);
    return spr;
  }

  {
    const cps = world.checkpoints;
    const defs = [
      { type: "doublejump", char: "🎈", icon: "🎈", label: "Double Jump" },
      { type: "speed", char: "⚡", icon: "⚡", label: "Speed Boost" },
    ];
    for (let i = 1; i < cps.length; i += 2) {
      const a = cps[i - 1].pos;
      const b = cps[i].pos;
      const def = defs[(i >> 1) % defs.length];
      const spr = emojiSprite(def.char, 1.3);
      spr.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.8, (a.z + b.z) / 2);
      spr.userData = { ...def, collected: false, phase: i, baseY: spr.position.y };
      group.add(spr);
      powerupItems.push(spr);
    }
  }

  function near(pos, obj, r = 1.5) {
    return (
      Math.abs(pos.x - obj.position.x) < r &&
      Math.abs(pos.y + 0.4 - obj.position.y) < 1.8 &&
      Math.abs(pos.z - obj.position.z) < r
    );
  }

  function collectCoins(pos) {
    let got = 0;
    for (const c of coins) {
      if (c.userData.collected) continue;
      if (near(pos, c, 1.4)) {
        c.userData.collected = true;
        c.visible = false;
        got++;
        spawnSparkle({ x: c.position.x, y: c.position.y, z: c.position.z });
      }
    }
    return got;
  }

  function collectPowerup(pos) {
    for (const p of powerupItems) {
      if (p.userData.collected) continue;
      if (near(pos, p, 1.6)) {
        p.userData.collected = true;
        p.visible = false;
        spawnSparkle({ x: p.position.x, y: p.position.y, z: p.position.z });
        return { type: p.userData.type, icon: p.userData.icon, label: p.userData.label };
      }
    }
    return null;
  }

  function resetCollectibles() {
    for (const c of coins) {
      c.userData.collected = false;
      c.visible = true;
    }
    for (const p of powerupItems) {
      p.userData.collected = false;
      p.visible = true;
    }
  }

  // ---- 5. Sparkle Particle Bursts ----
  function spawnSparkle(pos) {
    const n = 14;
    const positions = new Float32Array(n * 3);
    const vel = [];
    for (let i = 0; i < n; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      const a = (i / n) * Math.PI * 2;
      vel.push(new THREE.Vector3(Math.cos(a) * 2.2, 2.5 + Math.random() * 2, Math.sin(a) * 2.2));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0x17dd62,
        size: 0.28,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    markBloom(pts);
    group.add(pts);
    transients.push({
      obj: pts, age: 0, ttl: 0.7,
      tick(dt, age) {
        const arr = geo.attributes.position.array;
        for (let i = 0; i < n; i++) {
          arr[i * 3] += vel[i].x * dt;
          arr[i * 3 + 1] += (vel[i].y - age * 6) * dt;
          arr[i * 3 + 2] += vel[i].z * dt;
        }
        geo.attributes.position.needsUpdate = true;
        pts.material.opacity = 1 - age / 0.7;
      },
    });
  }

  function spawnConfetti(center) {
    const colors = [0x17dd62, 0xf8d93c, 0x5fedd9, 0xe83b3b, 0xa63df2, 0xffffff];
    const n = Math.round(50 * density);
    const geo = new THREE.PlaneGeometry(0.2, 0.2);
    const inst = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), n);
    const dummy = new THREE.Object3D();
    const data = [];
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      data.push({
        x: center.x + (Math.random() - 0.5) * 5,
        y: center.y + 5 + Math.random() * 3,
        z: center.z + (Math.random() - 0.5) * 5,
        vy: -2 - Math.random() * 2,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 8,
        spin: Math.random() * Math.PI,
      });
      inst.setColorAt(i, col.set(colors[i % colors.length]));
    }
    group.add(inst);
    transients.push({
      obj: inst, age: 0, ttl: 2.4,
      tick(dt) {
        for (let i = 0; i < n; i++) {
          const d = data[i];
          d.y += d.vy * dt;
          d.rot += d.vr * dt;
          dummy.position.set(d.x, d.y, d.z);
          dummy.rotation.set(d.rot, d.spin, d.rot * 0.5);
          dummy.updateMatrix();
          inst.setMatrixAt(i, dummy.matrix);
        }
        inst.instanceMatrix.needsUpdate = true;
      },
    });
  }

  function update(dt, t) {
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 38) c.position.x = -38;
    }
    for (const coin of coins) {
      if (!coin.visible) continue;
      coin.rotation.y += dt * 3.0;
      coin.position.y += Math.sin(t * 2.5 + coin.userData.phase) * dt * 0.4;
    }
    for (const p of powerupItems) {
      if (!p.visible) continue;
      p.position.y = p.userData.baseY + Math.sin(t * 2 + p.userData.phase) * 0.18;
      p.material.rotation = Math.sin(t * 2) * 0.2;
    }
    for (let i = transients.length - 1; i >= 0; i--) {
      const tr = transients[i];
      tr.age += dt;
      tr.tick(dt, tr.age);
      if (tr.age >= tr.ttl) {
        group.remove(tr.obj);
        tr.obj.geometry?.dispose?.();
        tr.obj.material?.dispose?.();
        transients.splice(i, 1);
      }
    }
  }

  return { group, update, spawnSparkle, spawnConfetti, collectCoins, collectPowerup, resetCollectibles };
}
