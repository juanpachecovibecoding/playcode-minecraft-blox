// Generate BrainBlox PWA icons (PNG) from a branded SVG, rendered crisply via
// headless Chrome. Produces a "badge" icon (rounded, transparent corners) and a
// "full-bleed" maskable/apple icon (sky fills the square, art in the safe zone).
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const CHROME = "/Users/neilbusque/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const OUT = new URL("../public/", import.meta.url).pathname;

// a little stacked-blocks tower (matches the obby), optionally rounded/full-bleed
function svg({ rounded, bleed }) {
  const corner = rounded ? 110 : 0;
  // maskable safe zone: shrink the art toward the center
  const s = bleed ? 0.72 : 1;
  const tx = (1 - s) * 256;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6fbeff"/><stop offset="1" stop-color="#cdecff"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="${corner}" fill="url(#sky)"/>
    <g transform="translate(${tx},${tx}) scale(${s})">
      <ellipse cx="256" cy="392" rx="150" ry="26" fill="#1b2a52" opacity="0.12"/>
      <rect x="146" y="312" width="220" height="74" rx="24" fill="#ff8e72"/>
      <rect x="166" y="250" width="180" height="66" rx="22" fill="#5fc6f0"/>
      <rect x="186" y="194" width="140" height="60" rx="20" fill="#5fd69a"/>
      <rect x="206" y="146" width="100" height="52" rx="18" fill="#ffd45e"/>
      <circle cx="256" cy="116" r="30" fill="#ffd23f" stroke="#fff" stroke-width="6"/>
      <circle cx="246" cy="110" r="5" fill="#1b2a52"/><circle cx="266" cy="110" r="5" fill="#1b2a52"/>
      <path d="M244 124 q12 10 24 0" stroke="#1b2a52" stroke-width="4" fill="none" stroke-linecap="round"/>
    </g>
  </svg>`;
}

async function render(page, markup, size, file, opaque) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><html><body style="margin:0">${markup.replace('viewBox="0 0 512 512"', `width="${size}" height="${size}" viewBox="0 0 512 512"`)}</body></html>`,
    { waitUntil: "domcontentloaded" }
  );
  await new Promise((r) => setTimeout(r, 120));
  const buf = await page.screenshot({ omitBackground: !opaque, type: "png", clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(OUT + file, buf);
  console.log("wrote", file, size + "x" + size);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();

await render(page, svg({ rounded: true, bleed: false }), 192, "icon-192.png", false);
await render(page, svg({ rounded: true, bleed: false }), 512, "icon-512.png", false);
await render(page, svg({ rounded: false, bleed: true }), 512, "icon-maskable-512.png", true);
await render(page, svg({ rounded: false, bleed: true }), 180, "apple-touch-180.png", true);

await browser.close();
