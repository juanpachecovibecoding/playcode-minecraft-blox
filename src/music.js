// Gentle, looping background music - synthesized with Web Audio so there are no
// audio files to ship (same philosophy as audio.js). A soft I-V-vi-IV "happy"
// progression in C with a bouncy pentatonic arpeggio and a mellow bass, kept low
// in the mix so quiz prompts + voice chat stay clear. A look-ahead scheduler
// queues notes slightly in the future so the loop never stutters on a busy frame.
//
// Preference persists in localStorage ("bb-music"); default ON. Returns a small
// API: { toggle, isOn, start, stop }. The HUD music button drives toggle().

import { getAudioContext } from "./audio.js";

const KEY = "bb-music";

// note frequencies (Hz)
const N = {
  C3: 130.81, E3: 164.81, G3: 196.0, A3: 220.0, F3: 174.61, D3: 146.83,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, F4: 349.23, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
};

// 8 bars, each: { bass root, chord arpeggio pool }. I–V–vi–IV, twice.
const BARS = [
  { bass: N.C3, arp: [N.C4, N.E4, N.G4, N.C5] },
  { bass: N.G3, arp: [N.G3, N.B4, N.D4, N.G4] },
  { bass: N.A3, arp: [N.A3, N.C4, N.E4, N.A4] },
  { bass: N.F3, arp: [N.F3, N.A4, N.C4, N.F4] },
  { bass: N.C3, arp: [N.E4, N.G4, N.C5, N.E5] },
  { bass: N.G3, arp: [N.D4, N.G4, N.B4, N.D5] },
  { bass: N.A3, arp: [N.C4, N.E4, N.A4, N.C5] },
  { bass: N.F3, arp: [N.A4, N.C5, N.F4, N.A5] },
];

const TEMPO = 104; // bpm
const STEP = 60 / TEMPO / 2; // eighth-note grid
const STEPS_PER_BAR = 8;
const TOTAL = BARS.length * STEPS_PER_BAR;

export function createMusic() {
  const ctx = getAudioContext();
  let on = localStorage.getItem(KEY) !== "off";
  let master = null;
  let timer = null;
  let step = 0;
  let nextTime = 0;

  function ensureMaster() {
    if (master || !ctx) return;
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }

  function blip(freq, time, dur, type, gain) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g).connect(master);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  function scheduleStep(s, time) {
    const bar = BARS[Math.floor(s / STEPS_PER_BAR) % BARS.length];
    const beat = s % STEPS_PER_BAR;
    // bass on beats 0 and 4 (quarter notes)
    if (beat === 0 || beat === 4) blip(bar.bass, time, 0.4, "triangle", 0.18);
    // soft pad chord swell at the top of each bar
    if (beat === 0) blip(bar.bass * 2, time, 0.9, "sine", 0.05);
    // bouncy arpeggio every eighth
    const note = bar.arp[beat % bar.arp.length];
    blip(note, time, 0.22, "triangle", 0.085);
  }

  function tick() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.12) {
      scheduleStep(step, nextTime);
      nextTime += STEP;
      step = (step + 1) % TOTAL;
    }
    timer = setTimeout(tick, 25);
  }

  function start() {
    if (!ctx || !on) return;
    if (ctx.state === "suspended") ctx.resume();
    ensureMaster();
    if (timer) return; // already running
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 1.2);
    step = 0;
    nextTime = ctx.currentTime + 0.08;
    tick();
  }

  function stop() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    }
  }

  function toggle() {
    on = !on;
    localStorage.setItem(KEY, on ? "on" : "off");
    if (on) start(); else stop();
    return on;
  }

  return { start, stop, toggle, isOn: () => on };
}
