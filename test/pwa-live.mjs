import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const URL = "https://neilbusque.github.io/brainblox/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 600 });
const errors=[]; page.on("pageerror",e=>errors.push(e.message));
await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
let sw=false;
for (let i=0;i<24 && !sw;i++){ sw = await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!(r&&(r.active||r.waiting||r.installing));}); if(!sw) await sleep(500); }
const man = await page.evaluate(async()=>{const l=document.querySelector('link[rel="manifest"]');const m=await (await fetch(l.href)).json();return {name:m.name,display:m.display,scope:m.scope,icons:m.icons.length};});
await page.evaluate(()=>navigator.serviceWorker.ready); await sleep(1200);
await page.setOfflineMode(true);
let offline=false;
try { await page.reload({waitUntil:"domcontentloaded",timeout:15000}); offline = await page.$eval("#lobby",e=>!!e).catch(()=>false); } catch(e){ errors.push("offline:"+e.message); }
await page.setOfflineMode(false);
console.log(JSON.stringify({ serviceWorkerActive:sw, manifest:man, loadsOffline:offline, errors }, null, 2));
await browser.close();
