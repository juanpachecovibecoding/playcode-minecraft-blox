// Emote system: a Roblox-style radial wheel of avatar expressions. The 😄 button
// pops the wheel; tapping an emote plays it on your avatar for a few seconds (or
// until you move). The active emote key is what the game loop feeds to
// avatar.update() and broadcasts over the net, so friends see your emotes too.
//
// Pure-ish state machine (tick/current/play) is split from the DOM wheel so the
// timing logic can be unit-tested. onPlay fires once per emote so callers can add
// sound + multiplayer broadcast.

import { sfx } from "./audio.js";

export const EMOTES = [
  { key: "wave", icon: "👋", label: "Wave", dur: 2.0 },
  { key: "dance", icon: "🕺", label: "Dance", dur: 3.2 },
  { key: "cheer", icon: "🎉", label: "Cheer", dur: 1.8 },
  { key: "laugh", icon: "😂", label: "Laugh", dur: 2.2 },
  { key: "point", icon: "👉", label: "Point", dur: 1.8 },
  { key: "sit", icon: "🪑", label: "Sit", dur: 8.0 },
];

const DUR = Object.fromEntries(EMOTES.map((e) => [e.key, e.dur]));

// the bare state machine, no DOM. exported for tests + reuse.
export function createEmoteState() {
  let key = null;
  let remaining = 0;
  return {
    play(k) {
      if (!DUR[k]) return;
      key = k;
      remaining = DUR[k];
    },
    tick(dt, moving) {
      if (!key) return;
      if (moving) { key = null; remaining = 0; return; } // walking ends any emote
      remaining -= dt;
      if (remaining <= 0) { key = null; remaining = 0; }
    },
    current() { return key; },
    clear() { key = null; remaining = 0; },
  };
}

// full thing: state machine + the radial wheel wired to #emote-btn / #emote-wheel
export function createEmotes({ onPlay } = {}) {
  const state = createEmoteState();
  const btn = document.getElementById("emote-btn");
  const wheel = document.getElementById("emote-wheel");
  let open = false;
  let enabled = true;

  function play(key, { silent = false } = {}) {
    state.play(key);
    if (!silent) { sfx.emote && sfx.emote(); navigator.vibrate?.(10); onPlay && onPlay(key); }
  }

  function build() {
    if (!wheel) return;
    wheel.innerHTML = "";
    const n = EMOTES.length;
    EMOTES.forEach((e, i) => {
      // fan across the UPPER half-circle (PI..2PI) so options rise up + sideways
      // from the button - never straight down onto the Jump button.
      const a = Math.PI + (i / (n - 1)) * Math.PI;
      const r = 82;
      const b = document.createElement("button");
      b.className = "emote-opt";
      b.style.left = `calc(50% + ${Math.cos(a) * r}px)`;
      b.style.top = `calc(50% + ${Math.sin(a) * r}px)`;
      b.innerHTML = `<span class="emote-ic">${e.icon}</span><span class="emote-lbl">${e.label}</span>`;
      b.addEventListener("pointerdown", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        play(e.key);
        setOpen(false);
      });
      wheel.appendChild(b);
    });
  }

  function setOpen(v) {
    open = v;
    if (wheel) {
      // anchor the wheel over the emote button's live position so it lines up in
      // both layouts (desktop: button at the edge; touch: button left of Jump).
      if (v && btn) {
        const r = btn.getBoundingClientRect();
        wheel.style.left = `${r.left + r.width / 2}px`;
        wheel.style.top = `${r.top - 6}px`;
      }
      wheel.classList.toggle("open", v);
    }
    if (btn) btn.classList.toggle("active", v);
  }

  const onBtn = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!enabled) return;
    setOpen(!open);
  };
  // tap elsewhere closes the wheel
  const onAway = (e) => {
    if (!open) return;
    if (e.target.closest("#emote-wheel") || e.target.closest("#emote-btn")) return;
    setOpen(false);
  };

  if (btn) { build(); btn.classList.remove("hidden"); btn.addEventListener("pointerdown", onBtn, { passive: false }); }
  window.addEventListener("pointerdown", onAway, true);

  return {
    play,
    tick(dt, moving) {
      state.tick(dt, moving);
      if (moving && open) setOpen(false);
    },
    current() { return state.current(); },
    setEnabled(v) { enabled = v; if (!v) { setOpen(false); state.clear(); } },
    destroy() {
      setOpen(false);
      if (btn) { btn.classList.add("hidden"); btn.removeEventListener("pointerdown", onBtn); }
      window.removeEventListener("pointerdown", onAway, true);
    },
  };
}
