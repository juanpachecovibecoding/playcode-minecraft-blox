// Contextual world interactions: when you walk near something you can do (a bench
// to sit on, the pool to splash in, the fountain to wish at, an NPC to pet, a
// friend to high-five) a single Action button appears and the "E" key works on
// desktop. This module owns only the proximity pick + the #action-btn DOM + the
// key binding; the actual behavior of each spot is a callback supplied by the
// caller (explore.js), so this stays free of any game/3D knowledge.
//
// A spot is: { pos:{x,z}, range?, icon, label, act(spot) }. Static spots are set
// once; dynamic spots (moving NPCs, other players) come from a per-frame getter.

export function createInteractions() {
  const btn = document.getElementById("action-btn");
  let staticSpots = [];
  let getDynamic = () => [];
  let active = null;
  let enabled = true;

  function setSpots(list) { staticSpots = list || []; }
  function setDynamic(fn) { getDynamic = fn || (() => []); }

  function show(s) {
    if (!btn) return;
    btn.textContent = `${s.icon} ${s.label}`;
    btn.classList.remove("hidden");
  }
  function hide() { btn && btn.classList.add("hidden"); }

  // pick the closest in-range spot each frame; returns it (or null)
  function update(playerPos) {
    if (!enabled) { if (active) { active = null; hide(); } return null; }
    let best = null, bd = Infinity;
    const consider = (s) => {
      const dx = playerPos.x - s.pos.x;
      const dz = playerPos.z - s.pos.z;
      const d = Math.hypot(dx, dz);
      const range = s.range ?? 2.8;
      if (d < range && d < bd) { bd = d; best = s; }
    };
    for (const s of staticSpots) consider(s); // no per-frame concat allocation
    for (const s of getDynamic()) consider(s);
    // compare by identity OR by a stable key so moving NPCs don't re-flash
    const changed = (best && best.key) !== (active && active.key) || (!best !== !active);
    if (changed) {
      active = best;
      if (active) show(active); else hide();
    } else {
      active = best; // keep latest object ref (position moved) without re-render
    }
    return active;
  }

  function act() {
    if (!enabled || !active || !active.act) return;
    active.act(active);
  }

  const onClick = (e) => { e.preventDefault(); e.stopPropagation(); act(); };
  const onKey = (e) => { if (e.key.toLowerCase() === "e" && active) { e.preventDefault(); act(); } };
  if (btn) btn.addEventListener("pointerdown", onClick, { passive: false });
  window.addEventListener("keydown", onKey);

  return {
    setSpots, setDynamic, update, act,
    get active() { return active; },
    setEnabled(v) { enabled = v; if (!v) { active = null; hide(); } },
    destroy() {
      hide();
      if (btn) btn.removeEventListener("pointerdown", onClick);
      window.removeEventListener("keydown", onKey);
    },
  };
}
