import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (p,s)=>p.evaluate(x=>document.querySelector(x)?.click(),s);
// scroll the screen to the bottom, then check the button is fully on-screen
async function reachable(page, screenSel, btnSel) {
  return page.evaluate((sc, bs) => {
    const screen = document.querySelector(sc); const btn = document.querySelector(bs);
    if (!screen || !btn) return { found: false };
    screen.scrollTop = screen.scrollHeight;
    const r = btn.getBoundingClientRect();
    return { found: true, inView: r.bottom <= window.innerHeight + 1 && r.top >= 0 };
  }, screenSel, btnSel);
}
async function go(vp) {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args:["--use-gl=angle","--use-angle=swiftshader","--no-sandbox"] });
  const p = await b.newPage();
  await p.emulate({ viewport:{...vp,isMobile:true,hasTouch:true,deviceScaleFactor:2}, userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile" });
  const out={};
  await p.goto("http://localhost:5173/",{waitUntil:"networkidle2"}); await sleep(500);
  await p.type("#name-input","Mo"); await click(p,"#btn-solo"); await sleep(600);
  // hub: is the foot (level) reachable
  out.hubFoot = await reachable(p, "#hub", ".hub-foot");
  await click(p,'.hub-card[data-act="puzzles"]'); await sleep(800);
  await click(p,".puz-thumb"); await sleep(600);
  out.puzBack = await reachable(p, "#puzzles", ".puz-back");
  await b.close();
  return out;
}
async function goRoom(vp) {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args:["--no-sandbox"] });
  const p = await b.newPage();
  await p.emulate({ viewport:{...vp,isMobile:true,hasTouch:true,deviceScaleFactor:2}, userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile" });
  await p.goto("http://localhost:5173/",{waitUntil:"networkidle2"}); await sleep(500);
  await p.type("#name-input","Mo"); await click(p,"#btn-create"); await sleep(3000);
  const startReach = await reachable(p, "#room", "#room-start");
  await p.screenshot({ path:`/tmp/reach-room-${vp.height}.png` });
  await b.close();
  return startReach;
}
const land = await go({width:780,height:360});
const port = await go({width:390,height:844});
const roomLand = await goRoom({width:780,height:360});
const roomPort = await goRoom({width:390,height:844});
console.log(JSON.stringify({ land, port, roomLand, roomPort }, null, 2));
