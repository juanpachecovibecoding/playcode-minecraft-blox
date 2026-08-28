// Two-client multiplayer test against the REAL Supabase project:
// host creates a room (waiting area), student joins, both see each other, host
// starts a Classroom with a category, teacher presents a question, student
// answers, teacher's roster updates. Captures screenshots.
import puppeteer from "puppeteer-core";
const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const URL = "http://localhost:5173/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--no-sandbox","--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"] });

const errors = [];
async function newClient(name) {
  const page = await browser.newPage();
  await page.setViewport({ width: 760, height: 720 });
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${name} c: ${m.text()}`); });
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
  await sleep(400);
  return page;
}
const click = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) throw new Error("no " + s); el.click(); }, sel);
const text = (page, sel) => page.$eval(sel, (e) => e.textContent.trim()).catch(() => "");
const count = (page, sel) => page.$$eval(sel, (els) => els.length).catch(() => 0);

// --- Host creates room ---
const A = await newClient("Host");
await A.type("#name-input", "Teacher");
await click(A, "#btn-create");
await sleep(3000);
const code = await text(A, ".room-code span");

// --- Student joins ---
const B = await newClient("Student");
await B.type("#name-input", "Kid");
await B.type("#code-input", code);
await click(B, "#btn-join");
await sleep(3500);

const aPlayers = await count(A, ".room-chip");
const bPlayers = await count(B, ".room-chip");
const aIsHost = await A.$(".room-mode") !== null; // host sees mode picker
const bWaiting = await B.$(".room-wait") !== null; // student sees waiting view
await A.screenshot({ path: "/tmp/v4-host-lobby.png" });
await B.screenshot({ path: "/tmp/v4-student-lobby.png" });

// --- Host picks Classroom + a category, then starts ---
await click(A, '.room-mode[data-mode="classroom"]');
await sleep(300);
await click(A, '.room-cat[data-cat="shapes"]');
await sleep(500);
// student should see the selection reflected
const bSel = await text(B, ".room-sel");
await click(A, "#room-start");
await sleep(1500);

// --- Classroom: teacher present, student answers ---
const teacherView = await A.$("#cls-next") !== null; // teacher has Start/Next
await click(A, "#cls-next"); // start / first question
await sleep(1500);
const studentHasQ = await B.$("#classroom .choice") !== null;
await A.screenshot({ path: "/tmp/v4-teacher.png" });
await B.screenshot({ path: "/tmp/v4-student-q.png" });

// student taps an answer
let teacherSawAnswer = false;
if (studentHasQ) {
  await B.evaluate(() => document.querySelector("#classroom .choice").click());
  await sleep(1500);
  // teacher roster should now show an answered/score status (not all "thinking")
  const roster = await A.$$eval(".cls-sstatus", (els) => els.map((e) => e.textContent)).catch(() => []);
  teacherSawAnswer = roster.some((s) => /answered|✅|❌/.test(s));
}
await A.screenshot({ path: "/tmp/v4-teacher-after.png" });

console.log(JSON.stringify({
  code, aPlayers, bPlayers, aIsHost, bWaiting, studentSeesSelection: bSel,
  teacherView, studentGotQuestion: studentHasQ, teacherSawAnswer, errors,
}, null, 2));
await browser.close();
