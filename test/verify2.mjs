// Capture screenshots of all the new v2 features + check for errors:
// lobby (mode picker), a picture/emoji question, obby HUD (coins+level), arcade.
import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const URL = "http://localhost:5173/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--no-sandbox"] });

const errors = [];
function watch(page, tag) {
  page.on("pageerror", e => errors.push(`${tag}: ${e.message}`));
  page.on("console", m => { if (m.type()==="error") errors.push(`${tag} console: ${m.text()}`); });
}

// 1) Lobby with mode picker
const lp = await browser.newPage();
await lp.setViewport({ width: 1000, height: 700 });
watch(lp, "lobby");
await lp.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
await sleep(700);
await lp.screenshot({ path: "/tmp/v2-lobby.png" });

// 2) Quiz Arcade: pick arcade, start, capture a question (likely a picture one)
await lp.click("#mode-arcade");
await sleep(200);
await lp.type("#name-input", "Mia");
await lp.click("#btn-solo");
// keep asking until we catch a PICTURE question (has #quiz-picture text or emoji tiles)
let pic = false;
for (let i = 0; i < 14 && !pic; i++) {
  await sleep(700);
  const info = await lp.evaluate(() => {
    const vis = !document.getElementById("quiz").classList.contains("hidden");
    const picTxt = document.getElementById("quiz-picture").textContent;
    const emojiTiles = !!document.querySelector("#quiz-choices .choice.emoji");
    return { vis, hasPic: picTxt.length > 0 || emojiTiles, correct: window.__bbQuiz?.correctIndex ?? -1 };
  });
  if (info.vis && info.hasPic) { pic = true; await lp.screenshot({ path: "/tmp/v2-arcade-picture.png" }); }
  if (info.vis && info.correct >= 0) { await lp.click(`#quiz-choices .choice:nth-child(${info.correct + 1})`); }
}
await sleep(600);
await lp.screenshot({ path: "/tmp/v2-arcade.png" });
await lp.close();

// 3) Obby: capture HUD with coins/level + character; collect coins
const gp = await browser.newPage();
await gp.setViewport({ width: 1100, height: 680 });
watch(gp, "obby");
await gp.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
await sleep(700);
// obby is default selected; play alone
await gp.type("#name-input", "Leo");
await gp.click("#btn-solo");
await sleep(1500);
await gp.keyboard.down("w");
await sleep(2600); // run forward, collect coins
await gp.keyboard.up("w");
await sleep(500);
const hud = await gp.evaluate(() => ({
  coins: document.getElementById("coin-count").textContent,
  level: document.getElementById("level-num").textContent,
  xpWidth: document.getElementById("xp-fill").style.width,
}));
await gp.screenshot({ path: "/tmp/v2-obby.png" });
await gp.close();

console.log(JSON.stringify({ caughtPictureQuestion: pic, obbyHud: hud, errors }, null, 2));
await browser.close();
