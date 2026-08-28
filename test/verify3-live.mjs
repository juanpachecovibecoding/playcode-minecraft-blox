import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const URL = "https://neilbusque.github.io/brainblox/?v=" + Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 760 });
const errors=[]; page.on("pageerror",e=>errors.push(e.message)); page.on("console",m=>{if(m.type()==="error")errors.push("c:"+m.text());});
const shown = (id) => page.$eval(id, el => !el.classList.contains("hidden")).catch(()=>false);
const click = (s) => page.evaluate((x)=>document.querySelector(x).click(), s);
await page.goto(URL, { waitUntil:"networkidle2", timeout:30000 });
await sleep(700);
const devStripped = await page.evaluate(()=>typeof window.__bbPlayer==="undefined" && typeof window.__bbQuiz==="undefined");
await page.type("#name-input","Live");
await click("#btn-solo"); await sleep(700);
const hub = await shown("#hub");
// puzzles: real art loads on the subpath
await click('.hub-card[data-act="puzzles"]'); await sleep(1500);
const art = await page.$$eval(".puz-thumb img", imgs => imgs.filter(i=>i.complete && i.naturalWidth>0).length).catch(()=>0);
await page.screenshot({ path: "/tmp/v3-live-puzzles.png" });
await click("#btn-home"); await sleep(400);
// learn
await click('.hub-card[data-act="learn"]'); await sleep(400);
await click('.learn-card[data-key="shapes"]'); await sleep(900);
const learnQuiz = await shown("#quiz");
await click("#btn-home"); await sleep(400);
const backHome = await shown("#hub");
// SW still active
const sw = await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!(r&&(r.active||r.installing||r.waiting));});
console.log(JSON.stringify({ hub, puzzleArtLoaded: art, learnQuiz, backHome, serviceWorker: sw, devHooksStripped: devStripped, errors }));
await browser.close();
