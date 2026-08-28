// Verify PWA: service worker registers + activates, manifest is valid + linked,
// icons load, and the app still loads OFFLINE after the SW caches it.
import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const URL = "http://localhost:4173/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 600 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });

// wait for the service worker to take control
let swActive = false;
for (let i = 0; i < 20 && !swActive; i++) {
  swActive = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return !!(reg && (reg.active || reg.waiting || reg.installing));
  });
  if (!swActive) await sleep(500);
}

// manifest details + icon reachability
const manifestInfo = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return { linked: false };
  const res = await fetch(link.href);
  const m = await res.json();
  const iconRes = await fetch(new URL(m.icons[0].src, location.href));
  return { linked: true, name: m.name, display: m.display, icons: m.icons.length, iconOk: iconRes.ok, startUrl: m.start_url };
});

// wait until the SW is actually controlling (cache populated), then test offline
await page.evaluate(() => navigator.serviceWorker.ready);
await sleep(800);
await page.setOfflineMode(true);
let offlineOk = false;
try {
  await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
  offlineOk = await page.$eval("#lobby", (el) => !!el).catch(() => false);
} catch (e) {
  errors.push("offline reload: " + e.message);
}
await page.setOfflineMode(false);

console.log(JSON.stringify({ swActive, manifestInfo, offlineLoads: offlineOk, errors }, null, 2));
await browser.close();
