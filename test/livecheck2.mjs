import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 680 });
const errors=[]; page.on("pageerror",e=>errors.push(e.message)); page.on("console",m=>{if(m.type()==="error")errors.push("c:"+m.text());});
await page.goto("https://neilbusque.github.io/brainblox/?v="+Date.now(), { waitUntil:"networkidle2", timeout:30000 });
await sleep(700);
const hasModes = await page.$("#mode-arcade") !== null;
const devStripped = await page.evaluate(() => typeof window.__bbPlayer === "undefined" && typeof window.__bbQuiz === "undefined");
// run arcade, answer a few, confirm no errors + a picture question shows
await page.click("#mode-arcade");
await page.type("#name-input","Live");
await page.click("#btn-solo");
let sawPicture=false;
for (let i=0;i<8;i++){ await sleep(700);
  const s = await page.evaluate(()=>({vis:!document.getElementById("quiz").classList.contains("hidden"),
    pic: document.getElementById("quiz-picture").textContent.length>0 || !!document.querySelector("#quiz-choices .choice.emoji")}));
  if(s.vis&&s.pic) sawPicture=true;
  // can't read correct (dev stripped) - just tap first choice to advance
  await page.click("#quiz-choices .choice:nth-child(1)").catch(()=>{});
}
await page.screenshot({ path:"/tmp/v2-live-arcade.png" });
console.log(JSON.stringify({ hasModePicker:hasModes, devHooksStripped:devStripped, sawPictureQuestion:sawPicture, errors }));
await browser.close();
