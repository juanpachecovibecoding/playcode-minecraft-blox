import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const click=(p,s)=>p.evaluate(x=>document.querySelector(x)?.click(),s);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox"] });
const page = await browser.newPage();
// iPhone landscape with touch
await page.emulate({ viewport:{width:844,height:390,isMobile:true,hasTouch:true,deviceScaleFactor:2}, userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1" });
const errors=[]; page.on("pageerror",e=>errors.push(e.message));
// check joystick + jump are visible and within the viewport
async function controlsVisible(){
  return page.evaluate(()=>{
    const tc=document.getElementById("touch-controls");
    const j=document.getElementById("joystick"), b=document.getElementById("jump-btn");
    if(!tc||tc.classList.contains("hidden")) return {shown:false};
    const vis=(el)=>{ if(!el) return false; const r=el.getBoundingClientRect(); const cs=getComputedStyle(el);
      return cs.display!=="none" && el.offsetParent!==null && r.width>10 && r.height>10 && r.bottom<=innerHeight+1 && r.right<=innerWidth+1 && r.left>=-1 && r.top>=-1; };
    return { shown:true, joystick:vis(j), jump:vis(b) };
  });
}
await page.goto("http://localhost:5173/",{waitUntil:"networkidle2",timeout:30000}); await sleep(400);
await page.type("#name-input","Mob"); await click(page,"#btn-solo"); await sleep(2500);
const explore = await controlsVisible();
await page.screenshot({path:"/tmp/mc-explore.png"});
// obby
await page.evaluate(()=>{ const p=window.__bbPlayer; p.pos.x=18*0.74; p.pos.z=0; p.pos.y=1.5; });
await sleep(800); await click(page,"#explore-prompt"); await sleep(2200);
const obby = await controlsVisible();
await page.screenshot({path:"/tmp/mc-obby.png"});
await click(page,"#btn-home"); await sleep(1800);
// coin rush
await page.evaluate(()=>{ const ang=4/7*2*Math.PI; const p=window.__bbPlayer; p.pos.x=Math.cos(ang)*18*0.74; p.pos.z=Math.sin(ang)*18*0.74; p.pos.y=1.5; });
await sleep(800); await click(page,"#explore-prompt"); await sleep(2200);
const coinrush = await controlsVisible();
console.log(JSON.stringify({ explore, obby, coinrush, errors },null,2));
await browser.close();
