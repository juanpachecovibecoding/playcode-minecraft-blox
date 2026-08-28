// Visual + behavioral smoke test. Launches Chrome, loads the game, auto-plays the
// obby (run forward + jump on a cadence) until the first quiz appears, answers it
// correctly, and verifies a star is earned. Captures screenshots. Not part of CI.
import puppeteer from "puppeteer-core";

const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const URL = "http://localhost:5173/";
const OUT = "/tmp/bb";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--no-sandbox", "--window-size=1280,800"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
await sleep(400);

await page.type("#name-input", "Maya");
await page.click("#btn-solo");
await sleep(1200);

const quizVisible = () => page.$eval("#quiz", (el) => !el.classList.contains("hidden")).catch(() => false);

// auto-play: hold forward, hop on a cadence, until the first quiz pops
await page.keyboard.down("w");
let reached = false;
for (let i = 0; i < 22 && !reached; i++) {
  await page.keyboard.press(" ");
  await sleep(420);
  if (await quizVisible()) reached = true;
}
await page.keyboard.up("w");
await sleep(200);
await page.screenshot({ path: `${OUT}-quiz.png` });

// Answer the quiz correctly (dev hook tells us which choice is right) and verify
// a star is earned and the gate fades open.
let starEarned = false;
if (reached) {
  const correctIdx = await page.evaluate(() => window.__bbQuiz?.correctIndex ?? -1);
  if (correctIdx >= 0) {
    await page.click(`#quiz-choices .choice:nth-child(${correctIdx + 1})`);
    await sleep(1200);
    const stars = await page.$eval("#star-count", (e) => Number(e.textContent));
    starEarned = stars > 0;
  }
}
await sleep(400);
await page.screenshot({ path: `${OUT}-after.png` });

const canvasOk = await page.$eval("#game-root canvas", (c) => c.width > 0 && c.height > 0).catch(() => false);
console.log(JSON.stringify({ canvasOk, reachedCheckpoint: reached, starEarned, errors }, null, 2));
await browser.close();
