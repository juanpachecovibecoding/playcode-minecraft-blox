// The Closet - avatar customization + hat shop. Pick your character's color, and
// equip hats. Some hats are free; others cost coins you earn in the games. Your
// choices persist (profile.js) and apply to your character everywhere.

import * as profile from "./profile.js";
import { sfx } from "./audio.js";

const COLORS = [0x5cc6f0, 0xff8e72, 0x5fd69a, 0xffd45e, 0xbfa1ff, 0xff94bc, 0xff5d5d, 0x52e0c4, 0x6b7a99, 0xffffff];
const HATS = [
  { key: "none", emoji: "🚫", name: "Ninguno", price: 0 },
  { key: "cap", emoji: "🧢", name: "Gorra", price: 0 },
  { key: "party", emoji: "🎉", name: "Fiesta", price: 30 },
  { key: "beanie", emoji: "🧶", name: "Gorro", price: 40 },
  { key: "propeller", emoji: "🚁", name: "Hélice", price: 60 },
  { key: "crown", emoji: "👑", name: "Corona", price: 80 },
  { key: "wizard", emoji: "🧙", name: "Mago", price: 100 },
];
const HAT_PREVIEW = { none: "", cap: "🧢", party: "🎉", beanie: "🧶", propeller: "🚁", crown: "👑", wizard: "🧙" };

export function startCloset(onHome) {
  const root = document.getElementById("closet");
  root.classList.remove("hidden");
  document.getElementById("btn-home")?.classList.remove("hidden");
  render();

  function render() {
    const color = profile.getColor();
    const hat = profile.getHat();
    const coins = profile.getCoins();
    root.innerHTML = `
      <div class="closet-wrap">
        <h1 class="closet-title">👕 My Closet</h1>
        <div class="closet-coins">🪙 <span>${coins}</span></div>
        <div class="closet-preview">
          <div class="cp-char" style="background:#${color.toString(16).padStart(6, "0")}">
            <div class="cp-hat">${HAT_PREVIEW[hat] || ""}</div>
            <div class="cp-face">^‿^</div>
          </div>
        </div>
        <div class="closet-section">Color</div>
        <div class="closet-colors">
          ${COLORS.map((c) => `<button class="cc-swatch ${c === color ? "sel" : ""}" data-c="${c}" style="background:#${c.toString(16).padStart(6, "0")}"></button>`).join("")}
        </div>
        <div class="closet-section">Sombreros</div>
        <div class="closet-hats">
          ${HATS.map((h) => {
            const owned = profile.owns(h.key);
            const sel = h.key === hat;
            return `<button class="ch-tile ${sel ? "sel" : ""} ${owned ? "" : "locked"}" data-h="${h.key}" data-p="${h.price}">
              <span class="ch-emoji">${h.emoji}</span><span class="ch-name">${h.name}</span>
              <span class="ch-tag">${owned ? (sel ? "Puesto" : "Poner") : "🪙 " + h.price}</span>
            </button>`;
          }).join("")}
        </div>
        <div class="closet-msg" id="closet-msg"></div>
        <button class="btn btn-big btn-accent" id="closet-done">Listo</button>
      </div>`;

    root.querySelectorAll(".cc-swatch").forEach((b) => b.addEventListener("click", () => { profile.setColor(Number(b.dataset.c)); sfx.coin(); render(); }));
    root.querySelectorAll(".ch-tile").forEach((b) => b.addEventListener("click", () => pickHat(b.dataset.h, Number(b.dataset.p))));
    root.querySelector("#closet-done").addEventListener("click", () => onHome());
  }

  function pickHat(key, price) {
    if (profile.owns(key)) { profile.setHat(key); sfx.coin(); render(); return; }
    if (profile.buy(key, price)) { profile.setHat(key); sfx.levelup(); render(); }
    else { sfx.wrong(); const m = document.getElementById("closet-msg"); if (m) { m.textContent = "¡No tienes suficientes monedas - juega para ganar más!"; setTimeout(() => { if (document.getElementById("closet-msg")) document.getElementById("closet-msg").textContent = ""; }, 1800); } }
  }

  function destroy() {
    root.innerHTML = "";
    root.classList.add("hidden");
    document.getElementById("btn-home")?.classList.add("hidden");
  }
  return { destroy };
}
