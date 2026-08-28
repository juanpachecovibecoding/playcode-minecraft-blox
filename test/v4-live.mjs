import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"] });
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 760 });
const errors=[]; page.on("pageerror",e=>errors.push(e.message)); page.on("console",m=>{if(m.type()==="error")errors.push("c:"+m.text());});
await page.goto("https://neilbusque.github.io/brainblox/?v="+Date.now(), { waitUntil:"networkidle2", timeout:30000 });
await sleep(700);
await page.type("#name-input","HostLive");
await page.evaluate(()=>document.querySelector("#btn-create").click());
await sleep(3500);
const code = await page.$eval(".room-code span", e=>e.textContent.trim()).catch(()=>"");
const hostControls = await page.$(".room-mode")!==null;
const cats = await page.$$eval(".room-cat", els=>els.length).catch(()=>0);
// confirm the resort backdrop image actually loaded
const bgLoaded = await page.evaluate(async () => {
  const el = document.getElementById("room");
  const m = (el.style.background||"").match(/url\(["']?([^"')]+)/);
  if (!m) return false;
  const r = await fetch(m[1]); return r.ok;
});
await page.screenshot({ path: "/tmp/v4-live-room.png" });
const dev = await page.evaluate(()=>typeof window.__bbPlayer==="undefined" && typeof window.__bbQuiz==="undefined");
console.log(JSON.stringify({ roomCode: code, hostControls, categoryChips: cats, backdropLoaded: bgLoaded, devHooksStripped: dev, errors }));
await browser.close();
