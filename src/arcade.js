// Quiz Arcade - a no-jumping activity. A run of 10 rapid emoji questions; correct
// answers earn stars, coins, and XP toward your level, with streak bonuses.
// Reuses the quiz modal, HUD, and progression. Returns { destroy } and calls
// onHome() to go back to the hub.

import "./style.css";
import { getQuestion } from "./questions.js";
import { createQuiz } from "./quiz.js";
import { createHud } from "./hud.js";
import { createProgress } from "./progress.js";
import { sfx, unlockAudio } from "./audio.js";

const TOTAL = 10;

export function startArcade(onHome) {
  unlockAudio();
  const arcade = document.getElementById("arcade");
  const hud = createHud();
  const quiz = createQuiz();
  const progress = createProgress();

  arcade.classList.remove("hidden");
  document.getElementById("hud").classList.remove("hidden");
  document.body.classList.remove("in-3d"); // hide the 3D control layer in this 2D mode
  document.getElementById("room-badge")?.classList.add("hidden");
  document.getElementById("btn-mute")?.classList.add("hidden");
  document.getElementById("btn-home")?.classList.remove("hidden");

  hud.setLevel(progress.info());
  hud.setCoins(0);

  const qEl = document.getElementById("arcade-q");
  const totalEl = document.getElementById("arcade-total");
  const result = document.getElementById("arcade-result");
  const head = arcade.querySelector(".arcade-head");
  totalEl.textContent = String(TOTAL);
  head.classList.remove("hidden");
  result.classList.add("hidden");

  let stars = 0, coins = 0, streak = 0, aborted = false;

  function awardXp(amount) {
    const res = progress.addXp(amount);
    hud.setLevel(res.info);
    if (res.leveledUp) { hud.popLevel(); hud.showFlash(`¡Nivel ${res.level}! 🎉`, 1100); sfx.levelup(); }
  }

  async function run() {
    let correctCount = 0;
    for (let i = 0; i < TOTAL && !aborted; i++) {
      qEl.textContent = String(i + 1);
      const correct = await quiz.ask(getQuestion(Math.floor(i / 3)), { progress: i / TOTAL });
      if (aborted) return;
      if (correct) {
        correctCount++; streak++; stars++; coins += 2;
        hud.addStar(); hud.setCoins(coins); sfx.correct(); awardXp(15);
        if (streak % 3 === 0) { stars++; hud.addStar(); awardXp(15); hud.showFlash(`¡${streak} seguidas! Bonus ⭐`, 1100); }
      } else { streak = 0; sfx.wrong(); }
      await sleep(350);
    }
    if (!aborted) showResult(correctCount);
  }

  function showResult(correctCount) {
    head.classList.add("hidden");
    document.getElementById("arcade-result-emoji").textContent = correctCount >= 8 ? "🏆" : correctCount >= 5 ? "🎉" : "👍";
    document.getElementById("arcade-result-title").textContent = correctCount >= 8 ? "¡Increíble!" : correctCount >= 5 ? "¡Muy bien!" : "¡Buen intento!";
    document.getElementById("arcade-result-sub").innerHTML =
      `¡Contestaste bien <b>${correctCount} / ${TOTAL}</b>!<br>⭐ ${stars} estrellas · 🪙 ${coins} monedas · Nivel ${progress.info().level}`;
    result.classList.remove("hidden");
    sfx.win();
  }

  const againBtn = document.getElementById("btn-arcade-again");
  const menuBtn = document.getElementById("btn-arcade-menu");
  const onAgain = () => { result.classList.add("hidden"); head.classList.remove("hidden"); stars = 0; coins = 0; streak = 0; hud.setStars(0); hud.setCoins(0); run(); };
  const onMenu = () => onHome();
  againBtn.addEventListener("click", onAgain);
  menuBtn.addEventListener("click", onMenu);

  run();

  function destroy() {
    aborted = true;
    againBtn.removeEventListener("click", onAgain);
    menuBtn.removeEventListener("click", onMenu);
    arcade.classList.add("hidden");
    result.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("btn-home")?.classList.add("hidden");
  }

  return { destroy };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
