import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 700 });
const errors = [];
page.on("pageerror", e => errors.push(e.message));
await page.goto("https://neilbusque.github.io/brainblox/", { waitUntil: "networkidle2", timeout: 30000 });
await sleep(600);
// lobby msg should be empty (multiplayer available) not "rooms need setup"
const lobbyMsg = await page.$eval("#lobby-msg", e => e.textContent.trim()).catch(()=>"(none)");
await page.type("#name-input", "Liam");
await page.click("#btn-solo");
await sleep(1800);
const canvasOk = await page.$eval("#game-root canvas", c => c.width>0 && c.height>0).catch(()=>false);
await page.screenshot({ path: "/tmp/bb-live.png" });
console.log(JSON.stringify({ canvasOk, lobbyMsg, multiplayerEnabled: lobbyMsg === "", errors }, null, 2));
await browser.close();
