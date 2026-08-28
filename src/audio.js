// Tiny Web Audio sound effects - synthesized so there are no asset files to ship
// or load. All sounds are short, friendly blips/chimes. The AudioContext is
// created lazily and resumed on first user gesture (browser autoplay rules).

let ctx = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (C) ctx = new C();
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ac();
}

// shared context so background music rides the same graph as the sfx
export function getAudioContext() {
  return ac();
}

function tone(freq, start, dur, type = "sine", gain = 0.18) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  jump() {
    tone(420, 0, 0.16, "square", 0.12);
    tone(640, 0.04, 0.14, "square", 0.1);
  },
  land() {
    tone(180, 0, 0.1, "sine", 0.1);
  },
  correct() {
    tone(523, 0, 0.14, "triangle"); // C
    tone(659, 0.12, 0.14, "triangle"); // E
    tone(784, 0.24, 0.2, "triangle"); // G
  },
  wrong() {
    tone(220, 0, 0.18, "sawtooth", 0.1);
    tone(160, 0.14, 0.22, "sawtooth", 0.1);
  },
  gate() {
    tone(500, 0, 0.12, "sine");
    tone(750, 0.1, 0.18, "sine");
  },
  checkpoint() {
    tone(660, 0, 0.1, "triangle", 0.12);
  },
  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, i * 0.14, 0.3, "triangle", 0.2));
  },
  coin() {
    tone(880, 0, 0.06, "square", 0.1);
    tone(1320, 0.05, 0.1, "square", 0.1);
  },
  powerup() {
    tone(500, 0, 0.08, "triangle", 0.14);
    tone(700, 0.07, 0.08, "triangle", 0.14);
    tone(1000, 0.14, 0.16, "triangle", 0.16);
  },
  levelup() {
    const notes = [659, 784, 988, 1319];
    notes.forEach((f, i) => tone(f, i * 0.1, 0.22, "triangle", 0.18));
  },
  emote() {
    tone(660, 0, 0.07, "triangle", 0.12);
    tone(990, 0.06, 0.1, "triangle", 0.12);
  },
  splash() {
    tone(300, 0, 0.16, "sine", 0.12);
    tone(180, 0.05, 0.2, "sine", 0.1);
  },
  sparkle() {
    tone(1320, 0, 0.06, "triangle", 0.1);
    tone(1760, 0.05, 0.08, "triangle", 0.1);
    tone(2090, 0.1, 0.1, "triangle", 0.08);
  },
  highfive() {
    tone(880, 0, 0.05, "square", 0.12);
    tone(1320, 0.05, 0.08, "square", 0.12);
    tone(1760, 0.12, 0.14, "triangle", 0.14);
  },
};
