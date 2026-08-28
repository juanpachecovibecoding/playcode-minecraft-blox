import { describe, it, expect } from "vitest";
import { createEmoteState, EMOTES } from "../src/emotes.js";

describe("emote state machine", () => {
  it("starts with no emote", () => {
    const s = createEmoteState();
    expect(s.current()).toBe(null);
  });

  it("plays a valid emote and ignores unknown keys", () => {
    const s = createEmoteState();
    s.play("dance");
    expect(s.current()).toBe("dance");
    s.clear();
    s.play("not-a-real-emote");
    expect(s.current()).toBe(null);
  });

  it("expires after its duration", () => {
    const s = createEmoteState();
    s.play("cheer"); // 1.8s
    s.tick(1.0, false);
    expect(s.current()).toBe("cheer");
    s.tick(1.0, false);
    expect(s.current()).toBe(null);
  });

  it("moving cancels an emote immediately", () => {
    const s = createEmoteState();
    s.play("sit");
    s.tick(0.1, true);
    expect(s.current()).toBe(null);
  });

  it("every wheel emote has a positive duration + icon + label", () => {
    for (const e of EMOTES) {
      expect(e.dur).toBeGreaterThan(0);
      expect(e.icon.length).toBeGreaterThan(0);
      expect(e.label.length).toBeGreaterThan(0);
    }
  });
});
