import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click=(p,s)=>p.evaluate(x=>document.querySelector(x)?.click(),s);
const shown=(p,s)=>p.$eval(s,e=>!e.classList.contains("hidden")).catch(()=>false);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox"] });
const page = await browser.newPage(); await page.setViewport({width:1000,height:680});
const errors=[]; page.on("pageerror",e=>errors.push(e.message)); page.on("console",m=>{if(m.type()==="error")errors.push("c:"+m.text());});
await page.goto("http://localhost:5173/",{waitUntil:"networkidle2",timeout:30000}); await sleep(300);
await page.evaluate(()=>{ localStorage.setItem("bb_coins","300"); localStorage.removeItem("bb_hat"); localStorage.removeItem("bb_owned"); localStorage.setItem("bb_color","5752048"); });
await page.reload({waitUntil:"networkidle2"}); await sleep(400);
await page.type("#name-input","Stylist"); await click(page,"#btn-solo"); await sleep(2500);
// teleport to the closet pad (zone 6 of 7, ring 18, pad*0.74)
await page.evaluate(()=>{ const ang=6/7*2*Math.PI; const p=window.__bbPlayer; p.pos.x=Math.cos(ang)*18*0.74; p.pos.z=Math.sin(ang)*18*0.74; p.pos.y=1.5; });
await sleep(900);
const prompt = await page.$eval("#explore-prompt",e=>({txt:e.textContent,hidden:e.classList.contains("hidden")})).catch(()=>({}));
await click(page,"#explore-prompt"); await sleep(1200);
const closetShown = await shown(page,"#closet");
await page.screenshot({path:"/tmp/qa-closet.png"});
// pick a color + buy/wear a locked hat (crown)
await click(page,'.cc-swatch[data-c="16747122"]'); // 0xff8e72 orange
await sleep(300);
await click(page,'.ch-tile[data-h="crown"]'); await sleep(500);
const after = await page.evaluate(()=>({color:localStorage.getItem("bb_color"),hat:localStorage.getItem("bb_hat"),coins:localStorage.getItem("bb_coins"),owned:localStorage.getItem("bb_owned")}));
await click(page,"#closet-done"); await sleep(2000);
const backExplore = await page.$eval("#game-root canvas",c=>c.width>0).catch(()=>false);
await page.screenshot({path:"/tmp/qa-closet-avatar.png"});
console.log(JSON.stringify({ prompt, closetShown, after, backExplore, errors },null,2));
await browser.close();
