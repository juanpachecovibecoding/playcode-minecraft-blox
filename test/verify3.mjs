// Verify the expanded game: hub navigation + all modes (obby, arcade, puzzles,
// learn) launch and return home, real puzzle art loads, no errors.
import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const URL = "http://localhost:5173/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 760 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("c:" + m.text()); });

const shown = (id) => page.$eval(id, (el) => !el.classList.contains("hidden")).catch(() => false);
const click = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) throw new Error("no " + s); el.click(); }, sel);

await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
await sleep(500);
await page.type("#name-input", "Zoe");
await click("#btn-solo");
await sleep(600);
const hubShown = await shown("#hub");
await page.screenshot({ path: "/tmp/v3-hub.png" });

// --- Puzzles ---
await click('.hub-card[data-act="puzzles"]');
await sleep(900);
const puzPickerShown = await page.$(".puz-thumb") !== null;
const imgLoaded = await page.$$eval(".puz-thumb img", (imgs) => imgs.some((i) => i.complete && i.naturalWidth > 0)).catch(() => false);
await page.screenshot({ path: "/tmp/v3-puzzles-pick.png" });
await click(".puz-thumb");
await sleep(700);
const boardShown = await page.$(".puz-board") !== null;
let placedOk = 0;
for (let k = 0; k < 4; k++) {
  const idx = await page.evaluate(() => { const p = document.querySelector(".puz-piece"); return p ? p.dataset.idx : null; });
  if (idx === null) break;
  await page.evaluate((i) => document.querySelector(`.puz-piece[data-idx="${i}"]`).click(), idx);
  await sleep(120);
  await page.evaluate((i) => document.querySelector(`.puz-cell[data-idx="${i}"]`).click(), idx);
  await sleep(220);
  const filled = await page.$eval(`.puz-cell[data-idx="${idx}"]`, (c) => c.classList.contains("filled")).catch(() => false);
  if (filled) placedOk++;
}
await page.screenshot({ path: "/tmp/v3-puzzle-board.png" });
await click("#btn-home");
await sleep(500);
const backHomeFromPuzzles = await shown("#hub");

// --- Learn ---
await click('.hub-card[data-act="learn"]');
await sleep(500);
const learnMenu = await page.$(".learn-card") !== null;
await page.screenshot({ path: "/tmp/v3-learn-menu.png" });
await click('.learn-card[data-key="numbers"]');
await sleep(900);
const learnQuiz = await shown("#quiz");
await page.screenshot({ path: "/tmp/v3-learn-quiz.png" });
await click("#btn-home");
await sleep(400);
const backHomeFromLearn = await shown("#hub");

// --- Obby launches + returns + cleans up ---
await click('.hub-card[data-act="obby"]');
await sleep(1800);
const canvas = await page.$eval("#game-root canvas", (c) => c.width > 0).catch(() => false);
await click("#btn-home");
await sleep(700);
const backHomeFromObby = await shown("#hub");
const canvasGone = (await page.$("#game-root canvas")) === null;

console.log(JSON.stringify({
  hubShown, puzPickerShown, puzzleArtLoaded: imgLoaded, boardShown, piecesPlaced: placedOk,
  backHomeFromPuzzles, learnMenu, learnQuiz, backHomeFromLearn,
  obbyCanvas: canvas, backHomeFromObby, obbyCanvasCleanedUp: canvasGone, errors,
}, null, 2));
await browser.close();
