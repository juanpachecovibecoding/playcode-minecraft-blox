// The multiplayer Room Lobby (waiting room). Owns the shared session (presence +
// voice). Shows the room code + invite link, a live list of who's here, a voice
// toggle, and - for the host - a picker for WHAT everyone plays (Obstacle Course
// or Classroom) and WHICH category the questions come from. When the host starts,
// everyone launches together. Classroom runs as a sub-screen keeping the session
// alive; the obby reconnects with its own world.

import { createSession } from "./session.js";
import { startClassroom } from "./classroom.js";
import { CATEGORIES } from "./questions.js";
import { colorForId } from "./avatar.js";

const MODES = [
  { key: "obby", emoji: "🏃", name: "Carrera de Obstáculos", desc: "Corran el curso juntos" },
  { key: "explore", emoji: "🌍", name: "Explorar juntos", desc: "Pasear y chatear por voz" },
  { key: "classroom", emoji: "👩‍🏫", name: "Aula", desc: "La maestra pregunta, los niños responden" },
];

export function startRoom(choice, cb) {
  const root = document.getElementById("room");
  root.classList.remove("hidden");
  // the generated resort "waiting area" backdrop (buildings + pool)
  const bg = `${import.meta.env.BASE_URL}assets/scenes/waiting.jpg`;
  root.style.background = `url(${bg}) center/cover no-repeat, radial-gradient(circle at 50% 18%, #b89cff, #8e6ef0 60%, #7a5bdc)`;
  root.innerHTML = `<div class="room-wrap"><div class="lobby-card"><div class="win-emoji">🔗</div><h2>Conectando…</h2></div></div>`;

  let session = null;
  let classroom = null;
  let destroyed = false;
  const selected = { mode: "obby", category: "mix" };

  const profile = { id: crypto.randomUUID(), name: choice.name };
  profile.color = colorForId(profile.id);

  createSession(profile, choice.code).then((s) => {
    if (destroyed) { s?.leave(); return; }
    if (!s) { root.innerHTML = `<div class="room-wrap"><div class="lobby-card"><div class="win-emoji">😕</div><h2>No se pudo ingresar</h2><p>Revisa el código e intenta de nuevo.</p></div></div>`; return; }
    session = s;
    session.onMsg(onMsg);
    session.onRoster(() => { if (!classroom) renderLobby(); });
    session.onSpeaking(() => { if (!classroom) renderLobby(); });
    renderLobby();
  });

  function renderLobby() {
    if (!session) return;
    const host = session.host();
    const iAmHost = session.isHost();
    const members = session.members();
    const speaking = session.speaking();
    root.innerHTML = `
      <div class="room-wrap">
        <div class="room-title-tag">🏝️ Área de Espera</div>
        <div class="lobby-card room-card">
          <h1 class="logo room-logo">Sala</h1>
          <div class="room-code"><span>${choice.code}</span></div>
          <button class="btn room-copy" id="room-copy">🔗 Copiar enlace</button>

          <div class="room-players">
            ${members.map((p) => playerChip(p, host, speaking)).join("")}
          </div>

          <div class="room-voice">
            <button class="icon-btn ${session.isMuted() ? "muted" : "live"}" id="room-mute">${session.isMuted() ? "🔇" : "🎤"}</button>
            <span>${session.isMuted() ? "Mic apagado - toca para hablar" : "¡Mic encendido!"}</span>
          </div>

          ${iAmHost ? hostControls() : waitView(host, members)}
        </div>
      </div>`;

    root.querySelector("#room-copy").addEventListener("click", copyLink);
    root.querySelector("#room-mute").addEventListener("click", () => { session.toggleMute(); renderLobby(); });

    if (iAmHost) {
      root.querySelectorAll(".room-mode").forEach((b) =>
        b.addEventListener("click", () => { selected.mode = b.dataset.mode; pushLobby(); renderLobby(); })
      );
      root.querySelectorAll(".room-cat").forEach((b) =>
        b.addEventListener("click", () => { selected.category = b.dataset.cat; pushLobby(); renderLobby(); })
      );
      root.querySelector("#room-start").addEventListener("click", () => startActivity(selected.mode, selected.category, true));
    }
  }

  function playerChip(p, host, speaking) {
    const isHost = p.id === host;
    const isSpeaking = speaking.has(p.id) || (p.id === session.myId && speaking.has("me"));
    const color = "#" + (p.color || 0x5fc6f0).toString(16).padStart(6, "0");
    return `<div class="room-chip ${isSpeaking ? "speaking" : ""}">
      <span class="dot" style="background:${color}"></span>
      ${p.name || "Jugador"}${p.id === session.myId ? " (tú)" : ""} ${isHost ? "👑" : ""}
    </div>`;
  }

  function hostControls() {
    return `
      <div class="room-section">Eres el anfitrión - elige un juego:</div>
      <div class="room-modes">
        ${MODES.map((m) => `<button class="room-mode ${selected.mode === m.key ? "selected" : ""}" data-mode="${m.key}"><span class="rm-emoji">${m.emoji}</span><b>${m.name}</b><small>${m.desc}</small></button>`).join("")}
      </div>
      <div class="room-section">Categoría:</div>
      <div class="room-cats">
        ${CATEGORIES.map((c) => `<button class="room-cat ${selected.category === c.key ? "selected" : ""}" data-cat="${c.key}">${c.emoji} ${c.name}</button>`).join("")}
      </div>
      <button class="btn btn-big btn-accent" id="room-start">▶ Iniciar Juego</button>`;
  }

  function waitView(host, members) {
    const hostName = members.find((m) => m.id === host)?.name || "el anfitrión";
    const mode = MODES.find((m) => m.key === selected.mode);
    const cat = CATEGORIES.find((c) => c.key === selected.category);
    return `<div class="room-wait">
      <div class="room-spin">⏳</div>
      <p>Esperando a <b>${hostName}</b> para empezar…</p>
      <p class="room-sel">${mode ? mode.emoji + " " + mode.name : ""} · ${cat ? cat.emoji + " " + cat.name : ""}</p>
    </div>`;
  }

  // host broadcasts current selection so waiting players see it
  function pushLobby() {
    session.send("lobby", { mode: selected.mode, category: selected.category });
  }

  function startActivity(mode, category, isInitiator) {
    if (isInitiator) session.send("start", { mode, category });
    if (mode === "classroom") {
      mountClassroom(category);
    } else {
      // obby / explore: reconnect with its own world (leave handled by room.destroy)
      const go = () => (mode === "explore" ? cb.launchExplore(choice.code, choice.name) : cb.launchObby(choice.code, choice.name, category));
      if (isInitiator) setTimeout(go, 250); // let the start message flush
      else go();
    }
  }

  function mountClassroom(category) {
    selected.category = category;
    root.classList.add("hidden");
    classroom = startClassroom(session, { category }, onClassExit);
  }
  function onClassExit() {
    classroom?.destroy();
    classroom = null;
    root.classList.remove("hidden");
    renderLobby();
  }

  function onMsg(m) {
    if (m.from === session.myId) return;
    if (m.type === "lobby") {
      selected.mode = m.mode;
      selected.category = m.category;
      if (!classroom) renderLobby();
    } else if (m.type === "start" && !classroom) {
      startActivity(m.mode, m.category, false);
    }
  }

  function copyLink() {
    const link = `${location.origin}${location.pathname}?room=${choice.code}`;
    navigator.clipboard?.writeText(link).then(
      () => flash("Link copied! 🔗"),
      () => flash(link)
    );
  }
  function flash(text) {
    const btn = root.querySelector("#room-copy");
    if (btn) { btn.textContent = text; setTimeout(() => { if (root.querySelector("#room-copy")) root.querySelector("#room-copy").textContent = "🔗 Copiar enlace"; }, 1500); }
  }

  function destroy() {
    destroyed = true;
    classroom?.destroy();
    classroom = null;
    session?.leave();
    root.innerHTML = "";
    root.classList.add("hidden");
  }

  return { destroy };
}
