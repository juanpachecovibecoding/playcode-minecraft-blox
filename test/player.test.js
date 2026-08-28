import { describe, it, expect } from "vitest";
import { createPlayer, updatePlayer, respawn, PLAYER_HALF } from "../src/player.js";

// one wide platform with its top surface at y = 0
const ground = [{ min: { x: -5, y: -1, z: -5 }, max: { x: 5, y: 0, z: 5 } }];
const noInput = { moveX: 0, moveZ: 0, jump: false };

function settle(player, platforms, steps = 120) {
  for (let i = 0; i < steps; i++) updatePlayer(player, 1 / 60, noInput, platforms);
}

describe("player physics", () => {
  it("falls under gravity and lands on top of a platform", () => {
    const p = createPlayer({ x: 0, y: 5, z: 0 });
    settle(p, ground);
    expect(p.grounded).toBe(true);
    // standing: center should be platform top (0) + half height
    expect(p.pos.y).toBeCloseTo(PLAYER_HALF.y, 2);
  });

  it("does not clip through the platform", () => {
    const p = createPlayer({ x: 0, y: 5, z: 0 });
    for (let i = 0; i < 300; i++) {
      updatePlayer(p, 1 / 60, noInput, ground);
      expect(p.pos.y).toBeGreaterThanOrEqual(PLAYER_HALF.y - 0.05);
    }
  });

  it("jumps upward only when grounded", () => {
    const p = createPlayer({ x: 0, y: 5, z: 0 });
    settle(p, ground);
    expect(p.grounded).toBe(true);
    updatePlayer(p, 1 / 60, { moveX: 0, moveZ: 0, jump: true }, ground);
    expect(p.vel.y).toBeGreaterThan(0); // launched up
    expect(p.grounded).toBe(false);
    // a second jump press mid-air does nothing extra
    const vy = p.vel.y;
    updatePlayer(p, 1 / 60, { moveX: 0, moveZ: 0, jump: true }, ground);
    expect(p.vel.y).toBeLessThan(vy); // gravity reduced it; no re-launch
  });

  it("reports a fall when there is no platform below", () => {
    const p = createPlayer({ x: 0, y: 5, z: 0 });
    let fell = false;
    for (let i = 0; i < 200 && !fell; i++) {
      fell = updatePlayer(p, 1 / 60, noInput, []).fell;
    }
    expect(fell).toBe(true);
  });

  it("respawn resets position and velocity", () => {
    const p = createPlayer({ x: 0, y: 5, z: 0 });
    settle(p, ground);
    respawn(p, { x: 2, y: 9, z: -3 });
    expect(p.pos).toEqual({ x: 2, y: 9, z: -3 });
    expect(p.vel).toEqual({ x: 0, y: 0, z: 0 });
    expect(p.grounded).toBe(false);
  });

  it("is blocked horizontally by a tall wall", () => {
    // ground + a tall wall at x = 2 (from x:2..3, 3 units tall - too tall to step)
    const platforms = [
      ...ground,
      { min: { x: 2, y: -1, z: -5 }, max: { x: 3, y: 3, z: 5 } },
    ];
    const p = createPlayer({ x: 0, y: 0.7, z: 0 });
    p.grounded = true;
    for (let i = 0; i < 120; i++) updatePlayer(p, 1 / 60, { moveX: 1, moveZ: 0, jump: false }, platforms);
    // should be stopped before entering the wall (wall min.x 2 minus player half)
    expect(p.pos.x).toBeLessThanOrEqual(2 - PLAYER_HALF.x + 0.02);
  });

  it("auto-climbs a short ledge without jumping (step-up)", () => {
    // ground at top y=0, plus a long low ledge at x>=2 whose top is y=0.4 (a curb)
    const platforms = [
      ...ground,
      { min: { x: 2, y: -1, z: -5 }, max: { x: 100, y: 0.4, z: 5 } },
    ];
    const p = createPlayer({ x: 0, y: 5, z: 0 });
    settle(p, platforms); // land on the ground first
    // walk into the curb - should step up onto it, not get stuck
    for (let i = 0; i < 40; i++) updatePlayer(p, 1 / 60, { moveX: 1, moveZ: 0, jump: false }, platforms);
    expect(p.pos.x).toBeGreaterThan(3); // climbed up and kept walking past the edge
    expect(p.pos.y).toBeCloseTo(0.4 + PLAYER_HALF.y, 1); // standing on the higher surface
    expect(p.grounded).toBe(true);
  });

  it("does NOT auto-climb a ledge taller than the step height", () => {
    // a 1.2-tall ledge is too high to step - the player should be blocked
    const platforms = [
      ...ground,
      { min: { x: 2, y: -1, z: -5 }, max: { x: 100, y: 1.2, z: 5 } },
    ];
    const p = createPlayer({ x: 0, y: 5, z: 0 });
    settle(p, platforms);
    for (let i = 0; i < 60; i++) updatePlayer(p, 1 / 60, { moveX: 1, moveZ: 0, jump: false }, platforms);
    expect(p.pos.x).toBeLessThanOrEqual(2 - PLAYER_HALF.x + 0.05); // stopped at the wall
  });
});
