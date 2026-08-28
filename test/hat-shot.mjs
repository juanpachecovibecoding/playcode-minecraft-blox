import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click=(p,s)=>p.evaluate(x=>document.querySelector(x)?.click(),s);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox"] });
const page = await browser.newPage(); await page.setViewport({width:900,height:620});
await page.goto("http://localhost:5173/",{waitUntil:"networkidle2"}); await sleep(300);
await page.evaluate(()=>{ localStorage.setItem("bb_hat","crown"); localStorage.setItem("bb_color","16747122"); localStorage.setItem("bb_owned",'["crown"]'); });
await page.reload({waitUntil:"networkidle2"}); await sleep(400);
await page.type("#name-input","Hat"); await click(page,"#btn-solo"); await sleep(2500);
// teleport to obby pad (zone 0, ang 0) and enter for a closer camera
await page.evaluate(()=>{ const p=window.__bbPlayer; p.pos.x=18*0.74; p.pos.z=0; p.pos.y=1.5; });
await sleep(800); await click(page,"#explore-prompt"); await sleep(2500);
await page.screenshot({path:"/tmp/qa-hat.png"});
const hat = await page.evaluate(()=>localStorage.getItem("bb_hat"));
console.log(JSON.stringify({ hat }));
await browser.close();
