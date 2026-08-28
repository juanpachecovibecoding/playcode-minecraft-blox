// Third-person follow camera with kid-friendly drag-to-look. The camera orbits
// the player on a sphere (yaw + a gently-clamped pitch) and eases toward that
// spot each frame so motion feels smooth. When the player is moving and nobody
// is dragging, the yaw auto-eases back BEHIND the direction of travel (the
// Roblox default-cam feel), so kids rarely have to touch the camera at all.
// main.js/explore.js read `state.yaw` to turn screen-relative input into world
// movement via intentToWorld().

import * as THREE from "three";

export function createFollowCamera(aspect, opts = {}) {
  const cam = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);

  // Preserve the old camera framing exactly: derive an orbit radius + a baseline
  // pitch from the legacy { dist, height } so every existing mode looks the same
  // at rest, then let the player tilt up/down a little around that baseline.
  const baseDist = opts.dist ?? 9;
  const baseHeight = opts.height ?? 5.5;
  const RADIUS = Math.hypot(baseDist, baseHeight);
  const BASE_PITCH = Math.atan2(baseHeight, baseDist);
  // hard-cap strictly below vertical so cos(pitch) can never go non-positive and
  // flip the camera over the player - matters for steep rigs like the Maze
  // (camHeight 13, camDist 4 -> BASE_PITCH 1.27, which is already near PI/2).
  const PITCH_MIN = Math.max(BASE_PITCH - 0.32, 0.12); // peek down a bit
  const PITCH_MAX = Math.min(BASE_PITCH + 0.42, Math.PI / 2 - 0.12); // peek up, never overhead
  const LOOK_AT_Y = 1; // aim at the chest, not the feet

  const state = { yaw: 0, pitch: BASE_PITCH };
  let elapsed = 0;
  let recenterAt = 0; // auto-follow stays suspended until elapsed passes this

  const tmpTarget = new THREE.Vector3();

  // where the camera wants to be for the current yaw/pitch, orbiting the player
  function desired(playerPos) {
    const cp = Math.cos(state.pitch);
    const sp = Math.sin(state.pitch);
    tmpTarget.set(
      playerPos.x - Math.sin(state.yaw) * cp * RADIUS,
      playerPos.y + sp * RADIUS,
      playerPos.z - Math.cos(state.yaw) * cp * RADIUS
    );
    return tmpTarget;
  }

  // drag-to-look: swing the camera and pause auto-follow for ~1s afterward
  function rotate(dYaw, dPitch) {
    state.yaw += dYaw;
    state.pitch = clamp(state.pitch + dPitch, PITCH_MIN, PITCH_MAX);
    recenterAt = elapsed + 1.0;
  }

  // follow opts: { facing, moving } let the camera ease back behind travel
  function follow(playerPos, dt, info = {}) {
    elapsed += dt;
    // auto-recenter the yaw behind the player's heading while moving + not dragging
    if (info.moving && elapsed >= recenterAt && info.facing != null) {
      state.yaw = approachAngle(state.yaw, info.facing, dt, 2.6);
    }
    const target = desired(playerPos);
    const k = 1 - Math.pow(0.001, dt); // exponential smoothing toward the target
    cam.position.lerp(target, k);
    cam.lookAt(playerPos.x, playerPos.y + LOOK_AT_Y, playerPos.z);
  }

  function snap(playerPos) {
    elapsed = 0;
    recenterAt = 0;
    cam.position.copy(desired(playerPos));
    cam.lookAt(playerPos.x, playerPos.y + LOOK_AT_Y, playerPos.z);
  }

  return { cam, state, follow, snap, rotate };
}

// Convert camera-relative intent (fwd/right) into a world-space direction, given
// the camera yaw. fwd = away from camera, right = the player's right as seen on
// screen. With the camera looking toward +z, screen-right is -x, so the right
// axis is negated (this fixes the "press left, moves right" bug).
export function intentToWorld(fwd, right, yaw) {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const x = fwd * sin - right * cos;
  const z = fwd * cos + right * sin;
  return { x, z };
}

// Ease an angle toward a target along the shortest path, framerate-independent.
// Exported for unit tests + reuse. rate is "per second" (higher = snappier).
export function approachAngle(current, target, dt, rate) {
  let d = target - current;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const k = 1 - Math.exp(-rate * dt);
  return current + d * k;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
