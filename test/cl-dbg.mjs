import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (p,s)=>p.evaluate(x=>document.querySelector(x)?.click(),s);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox"] });
const page = await browser.newPage(); await page.setViewport({width:760,height:600});
await page.goto("http://localhost:5173/",{waitUntil:"networkidle2"}); await sleep(400);
await page.type("#name-input","D"); await click(page,"#btn-solo"); await sleep(2500);
const r = await page.evaluate(()=>{
  const c = window.__bbPortals.find(p=>p.key==="closet");
  const pl = window.__bbPlayer;
  pl.pos.x = c.x; pl.pos.z = c.z;
  return { hasPlayer: !!pl, hasPortals: !!window.__bbPortals, nPortals: window.__bbPortals.length, closet: c };
});
await sleep(900);
const after = await page.evaluate(()=>({ px: window.__bbPlayer.pos.x.toFixed(1), pz: window.__bbPlayer.pos.z.toFixed(1), py: window.__bbPlayer.pos.y.toFixed(1), promptTxt: document.getElementById("explore-prompt").textContent, promptHidden: document.getElementById("explore-prompt").classList.contains("hidden") }));
console.log(JSON.stringify({ r, after }));
await browser.close();
