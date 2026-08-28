// Fullscreen toggle. On Android/desktop it uses the Fullscreen API. iOS Safari
// has NO fullscreen API for normal elements, so there we pop a friendly tip that
// explains "Add to Home Screen" (the PWA manifest launches fullscreen). Also
// keeps the canvas filling the visible viewport as the mobile browser bars hide.

export function setupFullscreen(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  const el = document.documentElement;
  const hasApi = !!(el.requestFullscreen || el.webkitRequestFullscreen);
  const standalone =
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  // already installed/fullscreen as a PWA -> the button is pointless
  if (standalone) btn.classList.add("hidden");

  function isFs() {
    return document.fullscreenElement || document.webkitFullscreenElement;
  }

  async function enter() {
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch {
      /* ignore */
    }
    try {
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape");
    } catch {
      /* orientation lock not allowed - fine */
    }
  }

  async function exit() {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch {
      /* ignore */
    }
  }

  btn.addEventListener("click", () => {
    if (hasApi) {
      if (isFs()) exit();
      else enter();
    } else {
      // iOS: show the add-to-home-screen tip
      document.getElementById("fs-tip")?.classList.remove("hidden");
    }
  });

  document.getElementById("btn-tip-close")?.addEventListener("click", () => {
    document.getElementById("fs-tip")?.classList.add("hidden");
  });
}
