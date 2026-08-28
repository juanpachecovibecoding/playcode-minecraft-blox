// Completability check: an auto-player that holds forward, jumps whenever it is
// grounded (so it hops off ledges like a person would), and answers each quiz
// correctly via the dev hook. Confirms the whole obby can be finished to the win.
import puppeteer from "puppeteer-core";

const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const URL = "http://localhost:5173/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 640 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
await sleep(400);
await page.type("#name-input", "Runner");
await page.click("#btn-solo");
await sleep(1200);

await page.keyboard.down("w");
let won = false;
let stars = 0;
let maxZ = 0;
for (let i = 0; i < 260 && !won; i++) {
  const st = await page.evaluate(() => {
    const p = window.__bbPlayer;
    const quiz = !document.getElementById("quiz").classList.contains("hidden");
    const win = !document.getElementById("win").classList.contains("hidden");
    return { g: p?.grounded, z: p ? p.pos.z : 0, quiz, win, correct: window.__bbQuiz?.correctIndex ?? -1 };
  });
  maxZ = Math.max(maxZ, st.z);
  if (st.win) { won = true; break; }
  if (st.quiz) {
    await page.keyboard.up("w");
    if (st.correct >= 0) await page.click(`#quiz-choices .choice:nth-child(${st.correct + 1})`);
    await sleep(1100);
    await page.keyboard.down("w");
    stars = await page.$eval("#star-count", (e) => Number(e.textContent));
    continue;
  }
  if (st.g) await page.keyboard.press(" "); // hop off each ledge
  await sleep(140);
}
await page.keyboard.up("w");
stars = await page.$eval("#star-count", (e) => Number(e.textContent));
await page.screenshot({ path: "/tmp/bb-complete.png" });
console.log(JSON.stringify({ won, stars, maxZ: +maxZ.toFixed(1), errors }, null, 2));
await browser.close();
