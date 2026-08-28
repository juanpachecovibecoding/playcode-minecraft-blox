// Unifies keyboard, on-screen touch, and drag-to-look input into two shapes the
// game loop reads each frame:
//   getInput() -> { fwd, right, jump }  camera-relative move intent in -1..1;
//                 main.js rotates it into world space using the camera yaw.
//                 `jump` is edge-triggered (true only the frame it was pressed).
//   getLook()  -> { dx, dy }            accumulated look-drag in pixels since the
//                 last read (consumed on read); the loop feeds it to camera.rotate.
//
// Pointer handling lives on a full-screen #input-layer that sits BELOW the
// buttons, so taps on Jump/Emote/Action are never stolen for look or move.
// Touch: lower-left = a floating joystick that springs up under the thumb; the
// rest of the screen = look-drag. Mouse: left-drag anywhere = look-drag.

export function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

const RADIUS = 56; // px travel of the joystick knob
const LOOK_SENS_X = 0.0052; // radians of yaw per px dragged
const LOOK_SENS_Y = 0.0040; // radians of pitch per px dragged

export function createControls() {
  const touch = isTouchDevice();
  if (touch) document.body.classList.add("touch");
  document.body.classList.add("in-3d"); // reveals the control layer (CSS-gated)
  const keys = new Set();
  let jumpQueued = false;
  let enabled = true;

  // ---- keyboard ----
  const down = (e) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    keys.add(k);
    if (k === " ") jumpQueued = true;
  };
  const up = (e) => keys.delete(e.key.toLowerCase());
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);

  // ---- pointer router (touch joystick/look + mouse look) ----
  const layer = document.getElementById("input-layer");
  const stick = document.getElementById("joystick");
  const knob = document.getElementById("joystick-knob");
  const jumpBtn = document.getElementById("jump-btn");

  const joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 }; // x,y -1..1
  const look = { id: null, lastX: 0, lastY: 0, dx: 0, dy: 0 };

  function placeStick(x, y) {
    if (!stick) return;
    stick.style.left = `${x}px`;
    stick.style.top = `${y}px`;
    stick.classList.add("live");
  }
  function setKnob(dx, dy) {
    if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  function resetJoy() {
    joy.active = false; joy.id = null; joy.x = 0; joy.y = 0;
    setKnob(0, 0);
    stick && stick.classList.remove("live");
  }

  // decide what a fresh pointer means: lower-left quadrant on touch = joystick,
  // everywhere else = look-drag (so the upper-left can still look around).
  function roleFor(e) {
    if (e.pointerType === "mouse") return e.button === 0 ? "look" : null;
    const lowerLeft = e.clientX < window.innerWidth * 0.5 && e.clientY > window.innerHeight * 0.5;
    return lowerLeft && !joy.active ? "joy" : "look";
  }

  const onDown = (e) => {
    if (!enabled) return;
    const role = roleFor(e);
    if (!role) return;
    layer.setPointerCapture?.(e.pointerId);
    if (role === "joy") {
      joy.active = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY;
      placeStick(e.clientX, e.clientY); setKnob(0, 0);
    } else {
      look.id = e.pointerId; look.lastX = e.clientX; look.lastY = e.clientY;
    }
    e.preventDefault();
  };
  const onMove = (e) => {
    if (e.pointerId === joy.id && joy.active) {
      let dx = e.clientX - joy.ox;
      let dy = e.clientY - joy.oy;
      const dist = Math.hypot(dx, dy);
      if (dist > RADIUS) { dx = (dx / dist) * RADIUS; dy = (dy / dist) * RADIUS; }
      setKnob(dx, dy);
      joy.x = dx / RADIUS;       // right +
      joy.y = -dy / RADIUS;      // up(screen) -> forward +
      e.preventDefault();
    } else if (e.pointerId === look.id) {
      look.dx += e.clientX - look.lastX;
      look.dy += e.clientY - look.lastY;
      look.lastX = e.clientX; look.lastY = e.clientY;
      e.preventDefault();
    }
  };
  const onUp = (e) => {
    if (e.pointerId === joy.id) resetJoy();
    if (e.pointerId === look.id) look.id = null;
  };

  if (layer) {
    layer.addEventListener("pointerdown", onDown, { passive: false });
    layer.addEventListener("pointermove", onMove, { passive: false });
    layer.addEventListener("pointerup", onUp);
    layer.addEventListener("pointercancel", onUp);
  }

  // jump button: its own listener; stop the event so it never starts a look-drag
  const onJump = (e) => { jumpQueued = true; navigator.vibrate?.(12); e.preventDefault(); e.stopPropagation(); };
  if (jumpBtn) jumpBtn.addEventListener("pointerdown", onJump, { passive: false });

  // ---- reads ----
  function getInput() {
    if (!enabled) { jumpQueued = false; return { fwd: 0, right: 0, jump: false }; }
    let fwd = 0, right = 0;
    if (keys.has("w") || keys.has("arrowup")) fwd += 1;
    if (keys.has("s") || keys.has("arrowdown")) fwd -= 1;
    if (keys.has("d") || keys.has("arrowright")) right += 1;
    if (keys.has("a") || keys.has("arrowleft")) right -= 1;
    fwd += joy.y; right += joy.x;
    fwd = Math.max(-1, Math.min(1, fwd));
    right = Math.max(-1, Math.min(1, right));
    const jump = jumpQueued; jumpQueued = false;
    return { fwd, right, jump };
  }

  // look deltas mapped to camera rotation (radians), consumed on read.
  // drag right -> turn right; drag up -> tilt to look up.
  function getLook() {
    const out = { dx: look.dx * LOOK_SENS_X, dy: look.dy * LOOK_SENS_Y };
    look.dx = 0; look.dy = 0;
    return out;
  }

  return {
    getInput,
    getLook,
    setEnabled(v) {
      enabled = v;
      if (!v) { resetJoy(); look.id = null; look.dx = 0; look.dy = 0; }
    },
    destroy() {
      document.body.classList.remove("in-3d");
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      if (layer) {
        layer.removeEventListener("pointerdown", onDown);
        layer.removeEventListener("pointermove", onMove);
        layer.removeEventListener("pointerup", onUp);
        layer.removeEventListener("pointercancel", onUp);
      }
      if (jumpBtn) jumpBtn.removeEventListener("pointerdown", onJump);
    },
  };
}
