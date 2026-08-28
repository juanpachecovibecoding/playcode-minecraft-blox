// Mobile audit: walk every screen on a portrait phone AND a short landscape
// phone, measure vertical overflow, check the primary action button is reachable,
// and screenshot. Flags screens that overflow without scrolling.
import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const URL = "http://localhost:5173/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (page, s) => page.evaluate((x) => document.querySelector(x)?.click(), s);

// can the user scroll the element / page to reach the bottom? returns overflow info
async function measure(page, screenSel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { missing: true };
    const vh = window.innerHeight;
    const r = el.getBoundingClientRect();
    // find the deepest scroll container
    const sc = el.scrollHeight > el.clientHeight ? el : el.querySelector("*");
    return {
      innerH: vh,
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
      overflows: el.scrollHeight > el.clientHeight + 2,
      canScroll: getComputedStyle(el).overflowY === "auto" || getComputedStyle(el).overflowY === "scroll",
    };
  }, screenSel);
}
async function btnInView(page, sel) {
  return page.evaluate((s) => {
    const b = document.querySelector(s);
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), inView: r.bottom <= window.innerHeight + 1 && r.top >= -1 };
  }, sel);
}

async function run(label, vp) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
    args: ["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--no-sandbox"] });
  const page = await browser.newPage();
  await page.emulate({ viewport: { ...vp, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1" });
  const out = {};
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
  await sleep(500);
  await page.type("#name-input", "Mo");
  await click(page, "#btn-solo"); await sleep(600);
  await page.screenshot({ path: `/tmp/ma-${label}-hub.png` });
  out.hub = { ...(await measure(page, "#hub")), startBtn: null };

  // puzzles picker + board
  await click(page, '.hub-card[data-act="puzzles"]'); await sleep(900);
  out.puzzlesPick = await measure(page, "#puzzles");
  await page.screenshot({ path: `/tmp/ma-${label}-puz-pick.png` });
  await click(page, ".puz-thumb"); await sleep(600);
  out.puzzleBoard = await measure(page, "#puzzles");
  out.puzzleBack = await btnInView(page, ".puz-back");
  await page.screenshot({ path: `/tmp/ma-${label}-puz-board.png` });
  await click(page, "#btn-home"); await sleep(400);

  // learn menu
  await click(page, '.hub-card[data-act="learn"]'); await sleep(400);
  out.learn = await measure(page, "#learn");
  await page.screenshot({ path: `/tmp/ma-${label}-learn.png` });
  await click(page, "#btn-home"); await sleep(300);

  await browser.close();
  return out;
}

async function runRoom(label, vp) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.emulate({ viewport: { ...vp, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1" });
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
  await sleep(500);
  await page.type("#name-input", "Mo");
  await click(page, "#btn-create"); await sleep(3000);
  const room = await measure(page, "#room");
  const startBtn = await btnInView(page, "#room-start");
  await page.screenshot({ path: `/tmp/ma-${label}-room.png` });
  await browser.close();
  return { room, startBtn };
}

const portrait = await run("port", { width: 390, height: 844 });
const land = await run("land", { width: 780, height: 360 });
const portRoom = await runRoom("port", { width: 390, height: 844 });
const landRoom = await runRoom("land", { width: 780, height: 360 });
console.log(JSON.stringify({ portrait, land, portRoom, landRoom }, null, 2));
