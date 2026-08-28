import { describe, it, expect } from "vitest";
import { intentToWorld, approachAngle, clamp, createFollowCamera } from "../src/camera.js";

describe("intentToWorld", () => {
  it("maps forward at yaw 0 to +z", () => {
    const d = intentToWorld(1, 0, 0);
    expect(d.x).toBeCloseTo(0);
    expect(d.z).toBeCloseTo(1);
  });
  it("maps right at yaw 0 to -x (screen-right)", () => {
    const d = intentToWorld(0, 1, 0);
    expect(d.x).toBeCloseTo(-1);
    expect(d.z).toBeCloseTo(0);
  });
  it("rotates forward by the camera yaw", () => {
    const d = intentToWorld(1, 0, Math.PI / 2);
    expect(d.x).toBeCloseTo(1);
    expect(d.z).toBeCloseTo(0);
  });
});

describe("approachAngle", () => {
  it("moves toward the target", () => {
    const next = approachAngle(0, 1, 0.1, 2.6);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });
  it("takes the short way around the wrap (3.0 -> -3.0 goes up, not down)", () => {
    // target is just past +PI; shortest path crosses the seam upward
    const next = approachAngle(3.0, -3.0, 0.1, 2.6);
    expect(next).toBeGreaterThan(3.0); // wrapped forward past PI, not back toward 0
  });
  it("is framerate-independent-ish: a big dt lands closer than a small dt", () => {
    const small = approachAngle(0, 1, 0.016, 2.6);
    const big = approachAngle(0, 1, 0.2, 2.6);
    expect(big).toBeGreaterThan(small);
  });
  it("never overshoots past the target", () => {
    const next = approachAngle(0, 1, 100, 2.6); // huge dt
    expect(next).toBeLessThanOrEqual(1 + 1e-9);
  });
});

describe("clamp", () => {
  it("clamps below, within, above", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe("createFollowCamera", () => {
  const pos = { x: 0, y: 2, z: 0 };

  it("snaps behind the player preserving the legacy framing (9 back, 5.5 up)", () => {
    const c = createFollowCamera(1.6);
    c.snap(pos);
    expect(c.cam.position.z).toBeCloseTo(pos.z - 9, 4);
    expect(c.cam.position.y).toBeCloseTo(pos.y + 5.5, 4);
    expect(c.cam.position.x).toBeCloseTo(pos.x, 4);
  });

  it("rotate() changes yaw and pitch (pitch is clamped, not flipped)", () => {
    const c = createFollowCamera(1.6);
    const y0 = c.state.yaw;
    c.rotate(0.5, 0);
    expect(c.state.yaw).toBeCloseTo(y0 + 0.5);
    // shove pitch way up: it must clamp, never exceed the cap
    c.rotate(0, 10);
    const capped = c.state.pitch;
    c.rotate(0, 10);
    expect(c.state.pitch).toBeCloseTo(capped); // already at the ceiling
  });

  it("steep rigs (Maze) never let pitch cross vertical -> camera stays on the player's side", () => {
    const c = createFollowCamera(1.6, { dist: 4, height: 13 }); // the Maze rig
    const p = { x: 0, y: 1, z: 0 };
    c.snap(p);
    const zBehind = c.cam.position.z; // behind the player at rest
    for (let i = 0; i < 30; i++) c.rotate(0, 1); // shove the look all the way up
    c.snap(p); // recompute position at the clamped pitch
    // camera must remain BEHIND (same side, -z) - a flip would push it to +z
    expect(Math.sign(c.cam.position.z)).toBe(Math.sign(zBehind));
    expect(c.cam.position.z).toBeLessThan(0);
  });

  it("auto-follow eases yaw toward facing only while moving", () => {
    const c = createFollowCamera(1.6);
    c.snap(pos);
    // not moving -> yaw unchanged
    c.follow(pos, 0.1, { facing: 1, moving: false });
    expect(c.state.yaw).toBeCloseTo(0);
    // moving -> yaw drifts toward facing
    c.follow(pos, 0.1, { facing: 1, moving: true });
    expect(c.state.yaw).toBeGreaterThan(0);
  });

  it("a recent drag suspends auto-follow", () => {
    const c = createFollowCamera(1.6);
    c.snap(pos);
    c.rotate(0.2, 0); // just dragged -> recenter paused ~1s
    const yawAfterDrag = c.state.yaw;
    c.follow(pos, 0.1, { facing: -1, moving: true });
    expect(c.state.yaw).toBeCloseTo(yawAfterDrag); // did not recenter yet
  });
});
