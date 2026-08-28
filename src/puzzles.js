// Jigsaw Puzzles mode. Uses the real generated illustrations. A picture is cut
// into an NxN grid; pieces are shuffled into a tray. Tap a tray piece to pick it
// up, tap a board cell to drop it (tap-to-place is far more reliable on touch
// than dragging). Correct pieces lock in; finish the picture to win + earn XP.

import { createProgress } from "./progress.js";
import { sfx, unlockAudio } from "./audio.js";

// The real illustrations live in public/assets/puzzles and are served at the
// app base (works for both "/" on Vercel and "/brainblox/" on GitHub Pages).
const LABELS = { lion: "León", rocket: "Cohete", boat: "Velero", car: "Auto de carreras", house: "Casa acogedora", fish: "Pez feliz" };
const BASE = import.meta.env.BASE_URL;
const PICS = ["lion", "rocket", "boat", "car", "house", "fish"].map((name) => ({
  name,
  url: `${BASE}assets/puzzles/${name}.png`,
}));

export function startPuzzles(onHome) {
  unlockAudio();
  const root = document.getElementById("puzzles");
  const progress = createProgress();
  root.classList.remove("hidden");
  document.getElementById("hud")?.classList.add("hidden");
  document.getElementById("btn-home")?.classList.remove("hidden");

  let cleanupFns = [];
  function on(el, ev, fn) {
    el.addEventListener(ev, fn);
    cleanupFns.push(() => el.removeEventListener(ev, fn));
  }

  showPicker();

  function showPicker() {
    root.innerHTML = `
      <div class="puz-wrap">
        <h1 class="puz-title">🧩 Elige un rompecabezas</h1>
        <div class="puz-pick">
          ${PICS.map((p) => `<button class="puz-thumb" data-name="${p.name}"><img src="${p.url}" alt="${LABELS[p.name] || p.name}"/><span>${LABELS[p.name] || p.name}</span></button>`).join("")}
        </div>
        <div class="puz-diff">
          <span>Piezas:</span>
          <button class="puz-dbtn selected" data-n="3">Fácil</button>
          <button class="puz-dbtn" data-n="4">Medio</button>
        </div>
      </div>`;
    let n = 3;
    root.querySelectorAll(".puz-dbtn").forEach((b) =>
      on(b, "click", () => {
        root.querySelectorAll(".puz-dbtn").forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
        n = Number(b.dataset.n);
      })
    );
    root.querySelectorAll(".puz-thumb").forEach((b) =>
      on(b, "click", () => {
        const pic = PICS.find((p) => p.name === b.dataset.name);
        startBoard(pic, n);
      })
    );
  }

  function startBoard(pic, n) {
    const total = n * n;
    const order = shuffle([...Array(total).keys()]);
    root.innerHTML = `
      <div class="puz-wrap">
        <h1 class="puz-title">${LABELS[pic.name] || pic.name}</h1>
        <div class="puz-game">
          <div class="puz-board" style="--n:${n}"></div>
          <div class="puz-tray"></div>
        </div>
        <button class="btn puz-back">↩ Otros rompecabezas</button>
        <div class="puz-feedback" id="puz-feedback"></div>
      </div>`;
    const board = root.querySelector(".puz-board");
    const tray = root.querySelector(".puz-tray");
    on(root.querySelector(".puz-back"), "click", showPicker);

    // build board cells (drop targets) with a faint guide image
    const cells = [];
    for (let i = 0; i < total; i++) {
      const cell = document.createElement("div");
      cell.className = "puz-cell";
      cell.dataset.idx = i;
      cell.style.backgroundImage = `url(${pic.url})`;
      cell.style.backgroundSize = `${n * 100}% ${n * 100}%`;
      cell.style.backgroundPosition = posFor(i, n);
      board.appendChild(cell);
      cells.push(cell);
      on(cell, "click", () => onCellTap(i));
    }

    // build shuffled tray pieces
    function makePiece(idx) {
      const piece = document.createElement("div");
      piece.className = "puz-piece";
      piece.dataset.idx = idx;
      piece.style.backgroundImage = `url(${pic.url})`;
      piece.style.backgroundSize = `${n * 100}% ${n * 100}%`;
      piece.style.backgroundPosition = posFor(idx, n);
      on(piece, "click", () => onPieceTap(piece));
      return piece;
    }
    order.forEach((idx) => tray.appendChild(makePiece(idx)));

    let selected = null;
    let placed = 0;
    function onPieceTap(piece) {
      if (selected) selected.classList.remove("selected");
      selected = selected === piece ? null : piece;
      if (selected) selected.classList.add("selected");
    }
    function onCellTap(cellIdx) {
      const cell = cells[cellIdx];
      if (cell.classList.contains("filled")) return;
      if (!selected) return;
      const pieceIdx = Number(selected.dataset.idx);
      if (pieceIdx === cellIdx) {
        // correct! lock it in
        cell.classList.add("filled");
        cell.classList.add("pop");
        selected.remove();
        selected = null;
        placed++;
        sfx.coin();
        if (placed === total) win();
      } else {
        // wrong spot - gentle shake
        selected.classList.remove("selected");
        const s = selected;
        s.classList.add("shake");
        setTimeout(() => s.classList.remove("shake"), 400);
        selected = null;
        sfx.wrong();
      }
    }

    function win() {
      const fb = root.querySelector("#puz-feedback");
      fb.textContent = "¡Lo lograste! 🎉";
      fb.className = "puz-feedback good";
      sfx.win();
      progress.addXp(40);
      // confetti via simple emoji burst
      burst(root);
      setTimeout(() => {
        const again = document.createElement("button");
        again.className = "btn btn-accent puz-again";
        again.textContent = "Siguiente rompecabezas →";
        on(again, "click", showPicker);
        fb.after(again);
      }, 700);
    }
  }

  function destroy() {
    cleanupFns.forEach((f) => f());
    cleanupFns = [];
    root.innerHTML = "";
    root.classList.add("hidden");
    document.getElementById("btn-home")?.classList.add("hidden");
  }

  return { destroy };
}

function posFor(idx, n) {
  const col = idx % n;
  const row = Math.floor(idx / n);
  const x = n === 1 ? 0 : (col / (n - 1)) * 100;
  const y = n === 1 ? 0 : (row / (n - 1)) * 100;
  return `${x}% ${y}%`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function burst(root) {
  const emojis = ["🎉", "⭐", "🎊", "✨", "🏆"];
  for (let i = 0; i < 18; i++) {
    const e = document.createElement("div");
    e.className = "puz-confetti";
    e.textContent = emojis[i % emojis.length];
    e.style.left = 30 + Math.random() * 40 + "%";
    e.style.animationDelay = Math.random() * 0.3 + "s";
    root.appendChild(e);
    setTimeout(() => e.remove(), 2000);
  }
}
