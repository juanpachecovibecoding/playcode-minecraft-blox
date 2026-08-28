import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (p,s)=>p.evaluate(x=>document.querySelector(x)?.click(),s);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox"] });
const page = await browser.newPage(); await page.setViewport({width:1000,height:640});
await page.goto("http://localhost:5173/",{waitUntil:"networkidle2"}); await sleep(500);
await page.type("#name-input","Q"); await click(page,"#btn-solo"); await sleep(2200);
await page.evaluate(()=>{ const p=window.__bbPlayer; p.pos.x=-6.66; p.pos.z=-11.55; });
await sleep(700); await click(page,"#explore-prompt"); await sleep(1800);
const before = await page.$eval("#mode-hud",e=>e.textContent);
// teleport onto each of the first 3 coins in turn, setting y to match
for (let k=0;k<3;k++){
  await page.evaluate((i)=>{ const c=window.__bbCoins.filter(x=>x.visible)[0]; const p=window.__bbPlayer; if(c){p.pos.x=c.position.x;p.pos.z=c.position.z;p.pos.y=c.position.y;} }, k);
  await sleep(500);
}
const after = await page.$eval("#mode-hud",e=>e.textContent);
console.log(JSON.stringify({ before, after }));
await browser.close();
