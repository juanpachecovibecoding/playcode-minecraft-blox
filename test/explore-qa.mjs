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
await sleep(500);
await page.type("#name-input","Explorer");
await click(page,"#btn-solo");
await sleep(2500); // let the world build + textures load
const worldCanvas = await page.$eval("#game-root canvas", c=>c.width>0).catch(()=>false);
await page.screenshot({ path:"/tmp/explore-world.png" });

// teleport onto the Obstacle Course pad and confirm the Enter prompt
await page.evaluate(()=>{ const p=window.__bbPlayer; if(p){ p.pos.x=13; p.pos.z=0; } });
await sleep(700);
const promptShown = await shown(page,"#explore-prompt");
const promptText = await page.$eval("#explore-prompt",e=>e.textContent).catch(()=>"");
await page.screenshot({ path:"/tmp/explore-prompt.png" });

// enter -> obby should load (HUD appears, home button appears)
await click(page,"#explore-prompt");
await sleep(2000);
const hudShown = await shown(page,"#hud");
const homeShown = await shown(page,"#btn-home");
// back to world
await click(page,"#btn-home");
await sleep(1800);
const backWorld = await page.$eval("#game-root canvas", c=>c.width>0).catch(()=>false);

// soon portal: teleport to coin-rush pad (angle 240deg -> (-9,-15.6)*0.74)
await page.evaluate(()=>{ const p=window.__bbPlayer; if(p){ p.pos.x=-6.7; p.pos.z=-11.5; } });
await sleep(700);
const soonText = await page.$eval("#explore-prompt",e=>e.textContent).catch(()=>"");

console.log(JSON.stringify({ worldCanvas, promptShown, promptText, enteredObbyHud:hudShown, homeShown, backToWorld:backWorld, soonText, errors },null,2));
await browser.close();
