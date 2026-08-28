// The start screen. Collects the player's name and whether to play solo (which
// opens the hub / world-select) or create / join a room (multiplayer obby).
// Resolves once with { mode, name, code }. Reads ?room=CODE from the URL so an
// invite link drops you straight onto Join.

import { MULTIPLAYER_AVAILABLE } from "./net.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing 0/O/1/I/L

function randomCode(len = 5) {
  let s = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) s += ALPHABET[arr[i] % ALPHABET.length];
  return s;
}

export function showLobby() {
  return new Promise((resolve) => {
    const lobby = document.getElementById("lobby");
    const nameInput = document.getElementById("name-input");
    const codeInput = document.getElementById("code-input");
    const btnSolo = document.getElementById("btn-solo");
    const btnCreate = document.getElementById("btn-create");
    const btnJoin = document.getElementById("btn-join");
    const msg = document.getElementById("lobby-msg");

    nameInput.value = localStorage.getItem("bb_name") || "";
    btnSolo.textContent = "🌍 Play";

    const url = new URL(location.href);
    const preCode = (url.searchParams.get("room") || "").toUpperCase();
    if (preCode) codeInput.value = preCode;

    if (!MULTIPLAYER_AVAILABLE) msg.textContent = "Puedes jugar solo. Las salas necesitan una configuración rápida.";

    function name() {
      const n = nameInput.value.trim().slice(0, 12);
      const final = n || "Jugador";
      localStorage.setItem("bb_name", final);
      return final;
    }
    function done(choice) {
      lobby.classList.add("hidden");
      resolve(choice);
    }

    btnSolo.addEventListener("click", () => done({ mode: "solo", name: name() }));

    btnCreate.addEventListener("click", () => {
      if (!MULTIPLAYER_AVAILABLE) { msg.textContent = "Las salas aún no están listas - ¡intenta Jugar!"; return; }
      done({ mode: "multi", name: name(), code: randomCode() });
    });

    btnJoin.addEventListener("click", () => {
      const code = codeInput.value.trim().toUpperCase();
      if (!code) { msg.textContent = "¡Escribe un código de sala!"; return; }
      if (!MULTIPLAYER_AVAILABLE) { msg.textContent = "Las salas aún no están listas - ¡intenta Jugar!"; return; }
      done({ mode: "multi", name: name(), code });
    });
  });
}
