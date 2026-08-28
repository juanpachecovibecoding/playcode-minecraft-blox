import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox","--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"] });
const errors=[];
async function mk(name){ const p=await browser.newPage(); await p.setViewport({width:760,height:560});
  p.on("pageerror",e=>errors.push(name+":"+e.message)); p.on("console",m=>{if(m.type()==="error")errors.push(name+"c:"+m.text());});
  await p.goto("http://localhost:5173/",{waitUntil:"networkidle2",timeout:30000}); await sleep(400); return p; }
const click=(p,s)=>p.evaluate(x=>document.querySelector(x)?.click(),s);
// host creates room
const A=await mk("Host"); await A.type("#name-input","Alice"); await click(A,"#btn-create"); await sleep(3000);
const code=await A.$eval(".room-code span",e=>e.textContent.trim());
// student joins
const B=await mk("Kid"); await B.type("#name-input","Bob"); await B.type("#code-input",code); await click(B,"#btn-join"); await sleep(3500);
// host picks Explore Together + start
await click(A,'.room-mode[data-mode="explore"]'); await sleep(400);
await click(A,"#room-start"); await sleep(4000);
// both should now be in the explore world (canvas) with a remote avatar each
const aCanvas=await A.$eval("#game-root canvas",c=>c.width>0).catch(()=>false);
const bCanvas=await B.$eval("#game-root canvas",c=>c.width>0).catch(()=>false);
// move A so B sees it move; check remote group has a child on each side
await A.keyboard.down("w"); await sleep(1500); await A.keyboard.up("w"); await sleep(1500);
const aBar=await A.$eval("#explore-bar",e=>!e.classList.contains("hidden")).catch(()=>false);
await A.screenshot({path:"/tmp/explore-mp-a.png"});
await B.screenshot({path:"/tmp/explore-mp-b.png"});
console.log(JSON.stringify({ code, aCanvas, bCanvas, aBarShown:aBar, errors },null,2));
await browser.close();
