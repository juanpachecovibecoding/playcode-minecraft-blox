// Bug hunt + laptop (no-touch) diagnostic. Plays the obby on a desktop viewport,
// captures ALL console output + errors, samples the player state over time via a
// debug hook, and checks for common problems: touch controls leaking onto a
// non-touch device, getting stuck, falling repeatedly, NaN positions, etc.
import puppeteer from "puppeteer-core";

const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const URL = "http://localhost:5173/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--no-sandbox", "--window-size=1366,768"],
});
const page = await browser.newPage();
// laptop profile: NO touch
await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false, hasTouch: false });

const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[PAGEERROR] ${e.message}`));

await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
await sleep(400);
await page.type("#name-input", "Laptop");
await page.click("#btn-solo");
await sleep(1200);

// is the touch overlay (wrongly) shown on a non-touch laptop?
const touchShown = await page.$eval("#touch-controls", (el) => !el.classList.contains("hidden")).catch(() => null);

// install a debug sampler that reads the canvas + reports if anything looks frozen.
// We approximate "player progress" by sampling whether the quiz ever opens and
// how the star count changes while we auto-play.
const samples = [];
async function sample(tag) {
  const stars = await page.$eval("#star-count", (e) => Number(e.textContent)).catch(() => -1);
  const quiz = await page.$eval("#quiz", (e) => !e.classList.contains("hidden")).catch(() => false);
  const flash = await page.$eval("#flash", (e) => e.textContent).catch(() => "");
  samples.push({ tag, stars, quiz, flash });
}

// auto-play several gates: forward + jump; answer via dev hook when a quiz opens
await page.keyboard.down("w");
let answered = 0;
let whoops = 0;
for (let i = 0; i < 60; i++) {
  await page.keyboard.press(" ");
  await sleep(380);
  const flash = await page.$eval("#flash", (e) => e.textContent).catch(() => "");
  if (flash.toLowerCase().includes("whoops")) whoops++;
  const quizOpen = await page.$eval("#quiz", (e) => !e.classList.contains("hidden")).catch(() => false);
  if (quizOpen) {
    await page.keyboard.up("w");
    const ci = await page.evaluate(() => window.__bbQuiz?.correctIndex ?? -1);
    if (ci >= 0) {
      await page.click(`#quiz-choices .choice:nth-child(${ci + 1})`);
      answered++;
      await sleep(1100);
    }
    await page.keyboard.down("w");
  }
  if (i % 8 === 0) {
    const ps = await page.evaluate(() => {
      const p = window.__bbPlayer;
      return p ? { x: +p.pos.x.toFixed(1), y: +p.pos.y.toFixed(1), z: +p.pos.z.toFixed(1), g: p.grounded } : null;
    });
    samples.push({ i, ...ps });
  }
  const won = await page.$eval("#win", (e) => !e.classList.contains("hidden")).catch(() => false);
  if (won) { samples.push({ tag: "WON", stars: await page.$eval("#star-count", e=>Number(e.textContent)) }); break; }
}
await page.keyboard.up("w");
await sleep(300);
await page.screenshot({ path: "/tmp/bb-diag.png" });

// resize test (laptop window resize should not break the canvas)
await page.setViewport({ width: 900, height: 600 });
await sleep(400);
const canvasAfterResize = await page.$eval("#game-root canvas", (c) => c.width > 0 && c.height > 0).catch(() => false);

console.log(JSON.stringify({
  touchControlsWronglyShown: touchShown,
  gatesAnswered: answered,
  whoopsFalls: whoops,
  canvasAfterResize,
  samples,
  errors: logs.filter((l) => l.includes("PAGEERROR") || l.includes("[error]")),
  allLogsCount: logs.length,
}, null, 2));

await browser.close();
