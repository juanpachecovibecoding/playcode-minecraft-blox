// Capture clean "hero" screenshots of the look on desktop + mobile from the start
// position (before moving), so the visuals can be judged.
import puppeteer from "puppeteer-core";

const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const URL = "http://localhost:5173/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--no-sandbox"],
});

async function shot(name, vp, mobile) {
  const page = await browser.newPage();
  if (mobile) {
    await page.emulate({ viewport: { ...vp, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1" });
  } else {
    await page.setViewport({ ...vp, deviceScaleFactor: 1 });
  }
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
  await sleep(400);
  await page.type("#name-input", "Test");
  await page.click("#btn-solo");
  await sleep(1600);
  // nudge forward a touch so the first platforms frame nicely, then stop
  await page.keyboard.down("w");
  await sleep(500);
  await page.keyboard.up("w");
  await sleep(700);
  await page.screenshot({ path: `/tmp/bb-look-${name}.png` });
  await page.close();
  return errs;
}

const e1 = await shot("desktop", { width: 1280, height: 720 }, false);
const e2 = await shot("mobile", { width: 844, height: 390 }, true);
console.log(JSON.stringify({ desktopErrors: e1, mobileErrors: e2 }));
await browser.close();
