import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--no-sandbox"] });
const page = await browser.newPage();
await page.emulate({ viewport: { width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1" });
const errors=[]; page.on("pageerror",e=>errors.push(e.message));
await page.goto("http://localhost:5173/", { waitUntil: "networkidle2" });
await sleep(600);
await page.type("#name-input", "Ava");
await page.click("#btn-solo");
await sleep(1600);
await page.keyboard.down("w"); await sleep(1500); await page.keyboard.up("w"); await sleep(600);
await page.screenshot({ path: "/tmp/v2-mobile-obby.png" });
console.log(JSON.stringify({ errors }));
await browser.close();
