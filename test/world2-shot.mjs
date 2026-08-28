import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (p,s)=>p.evaluate(x=>document.querySelector(x)?.click(),s);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox"] });
const page = await browser.newPage(); await page.setViewport({width:1100,height:680});
const errors=[]; page.on("pageerror",e=>errors.push(e.message)); page.on("console",m=>{if(m.type()==="error")errors.push("c:"+m.text());});
await page.goto("http://localhost:5173/",{waitUntil:"networkidle2"}); await sleep(500);
await page.type("#name-input","Ex"); await click(page,"#btn-solo"); await sleep(3000);
// rotate view by walking a bit and look around
await page.evaluate(()=>{ const p=window.__bbPlayer; p.pos.x=0; p.pos.z=-2; });
await sleep(800);
await page.screenshot({ path:"/tmp/world2-a.png" });
// move toward the pool/playground side
await page.evaluate(()=>{ const p=window.__bbPlayer; p.pos.x=-9; p.pos.z=9; });
await sleep(1200);
await page.screenshot({ path:"/tmp/world2-b.png" });
const npcCount = await page.evaluate(()=>document.querySelectorAll("canvas").length);
console.log(JSON.stringify({ errors }));
await browser.close();
