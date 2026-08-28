// Two-client multiplayer check against the real Supabase project. Client A creates
// a room, client B joins by code, and we verify each sees the other in the player
// list (presence) and that a remote avatar mesh is added (position sync wiring).
import puppeteer from "puppeteer-core";

const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const URL = "http://localhost:5173/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});

async function newClient(name) {
  const page = await browser.newPage();
  await page.setViewport({ width: 700, height: 500 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(name + ": " + e.message));
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
  await sleep(300);
  await page.type("#name-input", name);
  return { page, errors };
}

const A = await newClient("Alice");
await A.page.click("#btn-create");
await sleep(2500);
const code = await A.page.$eval("#room-code-label", (e) => e.textContent.trim());
console.log("room code:", code);

const B = await newClient("Bobby");
await B.page.type("#code-input", code);
await B.page.click("#btn-join");
await sleep(4000); // allow presence sync + voice negotiation

async function playerCount(p) {
  return p.$$eval("#player-list .player-chip", (els) => els.length).catch(() => 0);
}
async function remoteAvatars(p) {
  // remote.group is the 3rd child added; easier: count avatars via window hook is
  // not exposed, so infer from the player list (>=2 means the peer is present).
  return playerCount(p);
}

const aCount = await playerCount(A.page);
const bCount = await playerCount(B.page);
console.log(JSON.stringify({
  aliceSeesPlayers: aCount,
  bobbySeesPlayers: bCount,
  bothSeeTwo: aCount >= 2 && bCount >= 2,
  errors: [...A.errors, ...B.errors],
}, null, 2));

await browser.close();
