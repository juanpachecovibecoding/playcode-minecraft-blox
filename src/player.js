// Player physics: gravity, jumping, and axis-by-axis AABB collision against
// the level's platforms. Kept free of Three.js so it can be unit-tested with
// plain numbers. main.js mirrors `player.pos` onto the visual mesh each frame.

export const PLAYER_HALF = { x: 0.4, y: 0.7, z: 0.4 };

const SPEED = 6.5; // horizontal units/sec
const GRAVITY = 26; // units/sec^2
const JUMP_VELOCITY = 11; // initial up speed
const FALL_LIMIT = -25; // y below which the player has "fallen off"
const STEP_HEIGHT = 0.55; // small ledges this tall are auto-climbed (no jump needed)

export function createPlayer(spawn = { x: 0, y: 2, z: 0 }) {
  return {
    pos: { ...spawn },
    vel: { x: 0, y: 0, z: 0 },
    grounded: false,
    facing: 0, // radians, for turning the avatar toward movement
    anim: "idle", // idle | run | jump (for remote sync + squash)
    spawn: { ...spawn },
    // power-up modifiers (single jump, normal speed by default)
    maxJumps: 1,
    jumpsUsed: 0,
    speedMult: 1,
  };
}

function overlaps(pos, p) {
  return (
    pos.x + PLAYER_HALF.x > p.min.x &&
    pos.x - PLAYER_HALF.x < p.max.x &&
    pos.y + PLAYER_HALF.y > p.min.y &&
    pos.y - PLAYER_HALF.y < p.max.y &&
    pos.z + PLAYER_HALF.z > p.min.z &&
    pos.z - PLAYER_HALF.z < p.max.z
  );
}

// Would the player fit (no overlap) if its center were at this y? Used to make
// sure auto step-up doesn't shove the player into a platform overhead.
function fitsAtY(player, y, platforms, ignore) {
  const probe = { x: player.pos.x, y, z: player.pos.z };
  for (const p of platforms) {
    if (p === ignore) continue;
    if (overlaps(probe, p)) return false;
  }
  return true;
}

// Move one axis then resolve any platform overlaps on that axis.
// Returns whether the player landed on top (axis "y", moving down).
function moveAxis(player, axis, amount, platforms) {
  player.pos[axis] += amount;
  let landed = false;
  for (const p of platforms) {
    if (!overlaps(player.pos, p)) continue;
    if (axis === "y") {
      if (player.vel.y <= 0) {
        // moving down -> sit on top of platform
        player.pos.y = p.max.y + PLAYER_HALF.y;
        landed = true;
      } else {
        // moving up -> bonk head
        player.pos.y = p.min.y - PLAYER_HALF.y;
      }
      player.vel.y = 0;
    } else {
      // Horizontal collision. If the obstacle is a SHORT ledge (its top is within
      // STEP_HEIGHT of our feet) and we have headroom, climb onto it instead of
      // stopping - like a Roblox character stepping over a curb. This kills the
      // "wedged against a ledge" bug. Taller walls (and closed gates) still block.
      const feet = player.pos.y - PLAYER_HALF.y;
      const rise = p.max.y - feet;
      const steppedY = p.max.y + PLAYER_HALF.y;
      if (rise > 0.001 && rise <= STEP_HEIGHT && fitsAtY(player, steppedY, platforms, p)) {
        player.pos.y = steppedY;
        if (player.vel.y < 0) player.vel.y = 0;
        landed = true;
      } else {
        const half = PLAYER_HALF[axis];
        if (amount > 0) player.pos[axis] = p.min[axis] - half;
        else if (amount < 0) player.pos[axis] = p.max[axis] + half;
        player.vel[axis] = 0;
      }
    }
  }
  return landed;
}

// Advance the player one tick.
//   input: { moveX, moveZ, jump }  (moveX/moveZ are world-space, -1..1)
//   platforms: array of AABBs { min:{x,y,z}, max:{x,y,z} }
// Returns { fell } so the caller can trigger a respawn.
export function updatePlayer(player, dt, input, platforms) {
  // clamp dt so a long frame (tab refocus) can't tunnel through platforms
  dt = Math.min(dt, 0.05);

  const mx = input.moveX || 0;
  const mz = input.moveZ || 0;
  const len = Math.hypot(mx, mz);
  const nx = len > 1 ? mx / len : mx;
  const nz = len > 1 ? mz / len : mz;

  const speed = SPEED * (player.speedMult || 1);
  player.vel.x = nx * speed;
  player.vel.z = nz * speed;

  if (len > 0.05) player.facing = Math.atan2(nx, nz);

  // jumping: standing on ground resets the jump count; a jump is allowed while we
  // still have jumps left (maxJumps > 1 means a double jump from a power-up).
  if (player.grounded) player.jumpsUsed = 0;
  const maxJumps = player.maxJumps || 1;
  if (input.jump && (player.jumpsUsed || 0) < maxJumps) {
    player.vel.y = JUMP_VELOCITY;
    player.jumpsUsed = (player.jumpsUsed || 0) + 1;
    player.grounded = false;
  }

  player.vel.y -= GRAVITY * dt;

  // resolve horizontal first, then vertical. Any axis can "land" us (horizontal
  // axes via an auto step-up onto a ledge), so OR the results together.
  const landedX = moveAxis(player, "x", player.vel.x * dt, platforms);
  const landedZ = moveAxis(player, "z", player.vel.z * dt, platforms);
  const landedY = moveAxis(player, "y", player.vel.y * dt, platforms);
  player.grounded = landedX || landedZ || landedY;

  // pick an animation state for the avatar + remote sync
  if (!player.grounded) player.anim = "jump";
  else if (len > 0.05) player.anim = "run";
  else player.anim = "idle";

  const fell = player.pos.y < FALL_LIMIT;
  return { fell };
}

// Send the player back to a checkpoint (or original spawn).
export function respawn(player, to = player.spawn) {
  player.pos = { ...to };
  player.vel = { x: 0, y: 0, z: 0 };
  player.grounded = false;
  player.anim = "idle";
}
