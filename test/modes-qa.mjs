import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (p,s)=>p.evaluate(x=>document.querySelector(x)?.click(),s);
const shown = (p,s)=>p.$eval(s,e=>!e.classList.contains("hidden")).catch(()=>false);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 680 });
const errors=[]; page.on("pageerror",e=>errors.push(e.message)); page.on("console",m=>{if(m.type()==="error")errors.push("c:"+m.text());});
await page.goto("http://localhost:5173/",{waitUntil:"networkidle2",timeout:30000});
await sleep(500); await page.type("#name-input","Q"); await click(page,"#btn-solo"); await sleep(2200);

// --- Coin Rush: teleport to its pad, enter ---
await page.evaluate(()=>{ const p=window.__bbPlayer; p.pos.x=-6.66; p.pos.z=-11.55; });
await sleep(700);
const crPrompt = await page.$eval("#explore-prompt",e=>e.textContent).catch(()=>"");
await click(page,"#explore-prompt"); await sleep(1800);
const crHud = await shown(page,"#mode-hud");
const t1 = await page.$eval("#mode-hud",e=>e.textContent).catch(()=>"");
// collect a coin: teleport onto one
const collected1 = await page.evaluate(()=>{ const c=window.__bbCoins?.find(x=>x.visible); const p=window.__bbPlayer; if(c){ p.pos.x=c.position.x; p.pos.z=c.position.z; } return true; });
await sleep(600);
const t2 = await page.$eval("#mode-hud",e=>e.textContent).catch(()=>"");
await page.screenshot({ path:"/tmp/qa-coinrush.png" });
await click(page,"#btn-home"); await sleep(1800);

// --- Maze: teleport to its pad, enter, then teleport to the goal to win ---
await page.evaluate(()=>{ const p=window.__bbPlayer; p.pos.x=6.66; p.pos.z=-11.55; });
await sleep(700);
const mzPrompt = await page.$eval("#explore-prompt",e=>e.textContent).catch(()=>"");
await click(page,"#explore-prompt"); await sleep(1800);
const mzHud = await shown(page,"#mode-hud");
await page.screenshot({ path:"/tmp/qa-maze.png" });
await page.evaluate(()=>{ const p=window.__bbPlayer; p.pos.x=20; p.pos.z=20; p.pos.y=1.5; });
await sleep(900);
const mazeWon = await shown(page,"#mode-result");

console.log(JSON.stringify({ crPrompt, crHud, timerStart:t1, afterCollect:t2, mzPrompt, mzHud, mazeWon, errors },null,2));
await browser.close();
