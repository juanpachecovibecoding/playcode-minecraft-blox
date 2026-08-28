// Renders other players' avatars and smooths their motion. Network packets only
// arrive ~12 Hz, so we interpolate each avatar toward its latest target position
// every frame, which makes remote characters glide instead of teleport.

import * as THREE from "three";
import { createAvatar } from "./avatar.js";

export function createRemotePlayers(scene = null) {
  const group = new THREE.Group();
  if (scene) scene.add(group);
  const peers = new Map(); // id -> { avatar, cur:{x,y,z}, target:{x,y,z}, ry, anim, name, color }

  function ensure(id, name, color) {
    let p = peers.get(id);
    if (!p) {
      const avatar = createAvatar(color, name || "Player");
      group.add(avatar.root);
      p = {
        avatar,
        cur: { x: 0, y: -50, z: 0 },
        target: { x: 0, y: -50, z: 0 },
        ry: 0,
        targetRy: 0,
        anim: "idle",
        name,
        color,
      };
      peers.set(id, p);
    }
    return p;
  }

  // a state packet from the network: { id, x, y, z, ry, anim }
  function applyState(packet, maybePacket) {
    // support applyState(id, m) or applyState(packet)
    const data = typeof packet === "string" ? { id: packet, ...maybePacket } : packet;
    const p = peers.get(data.id);
    if (!p) return;
    p.target = { x: data.x, y: data.y, z: data.z };
    p.targetRy = data.ry ?? p.targetRy;
    p.anim = data.anim || "idle";
  }

  // reconcile to the presence roster (others only - caller filters out self)
  function syncRoster(others) {
    const ids = new Set(others.map((o) => o.id));
    for (const o of others) ensure(o.id, o.name, o.color);
    for (const id of [...peers.keys()]) {
      if (!ids.has(id)) remove(id);
    }
  }

  function remove(id) {
    const p = peers.get(id);
    if (!p) return;
    clearTimeout(p._emoteT);
    group.remove(p.avatar.root);
    p.avatar.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && !o.material.userData?.shared) o.material.dispose();
    });
    peers.delete(id);
  }

  function update(dtOrId, cameraOrState) {
    if (typeof dtOrId === "string") {
      applyState(dtOrId, cameraOrState);
      return;
    }
    const dt = dtOrId;
    const camera = cameraOrState;
    const k = 1 - Math.pow(0.0001, dt);
    for (const p of peers.values()) {
      p.cur.x += (p.target.x - p.cur.x) * k;
      p.cur.y += (p.target.y - p.cur.y) * k;
      p.cur.z += (p.target.z - p.cur.z) * k;
      let d = p.targetRy - p.ry;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      p.ry += d * k;
      p.avatar.root.position.set(p.cur.x, p.cur.y, p.cur.z);
      p.avatar.root.rotation.y = p.ry;
      p.avatar.update(p.anim, dt, camera);
    }
  }

  function list() {
    const out = [];
    for (const [id, p] of peers) out.push({ id, name: p.name, pos: { x: p.cur.x, y: p.cur.y, z: p.cur.z } });
    return out;
  }

  function playEmote(id, anim, ms = 1800) {
    const p = peers.get(id);
    if (!p) return;
    p.anim = anim;
    clearTimeout(p._emoteT);
    p._emoteT = setTimeout(() => { if (p.anim === anim) p.anim = "idle"; }, ms);
  }

  function destroy() { for (const id of [...peers.keys()]) remove(id); }

  return {
    group,
    ensure,
    add: (p) => ensure(p.id, p.name, p.color),
    applyState,
    syncRoster,
    remove,
    update,
    tick: update,
    emote: playEmote,
    playEmote,
    list,
    destroy,
    count: () => peers.size
  };
}
