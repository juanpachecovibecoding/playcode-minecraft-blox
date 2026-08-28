// Minecraft Voxel Texture & Material Generator
// Produces authentic 16x16 pixel-art CanvasTextures with NearestFilter.
// Shared material cache ensures low memory footprint and high WebGL performance.

import * as THREE from "three";

const texCache = new Map();
const matCache = new Map();

function makePixelTex(key, drawFn, size = 16) {
  if (texCache.has(key)) return texCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, texture);
  return texture;
}

function pnoise(x, y, seed = 0) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

export function getDirtTex() {
  return makePixelTex("dirt", (ctx, s) => {
    const colors = ["#866043", "#765338", "#6c4c32", "#946c4d", "#5b3e28"];
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = pnoise(x, y, 1);
        ctx.fillStyle = colors[Math.floor(n * colors.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

export function getGrassTopTex() {
  return makePixelTex("grass_top", (ctx, s) => {
    const greens = ["#598a2c", "#629931", "#538129", "#6ca937", "#4b7524"];
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = pnoise(x, y, 2);
        ctx.fillStyle = greens[Math.floor(n * greens.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

export function getGrassSideTex() {
  return makePixelTex("grass_side", (ctx, s) => {
    const dirtColors = ["#866043", "#765338", "#6c4c32", "#946c4d", "#5b3e28"];
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = pnoise(x, y, 1);
        ctx.fillStyle = dirtColors[Math.floor(n * dirtColors.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    const greens = ["#598a2c", "#629931", "#538129", "#6ca937"];
    for (let x = 0; x < s; x++) {
      const drip = 3 + Math.floor(pnoise(x, 0, 3) * 3);
      for (let y = 0; y < drip; y++) {
        const n = pnoise(x, y, 4);
        ctx.fillStyle = greens[Math.floor(n * greens.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

export function getStoneTex() {
  return makePixelTex("stone", (ctx, s) => {
    const grays = ["#737373", "#616161", "#848484", "#525252", "#909090"];
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = pnoise(x, y, 5);
        ctx.fillStyle = grays[Math.floor(n * grays.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

export function getCobblestoneTex() {
  return makePixelTex("cobblestone", (ctx, s) => {
    ctx.fillStyle = "#3e3e3e";
    ctx.fillRect(0, 0, s, s);
    const stoneColors = ["#7a7a7a", "#686868", "#8b8b8b", "#585858"];
    const patches = [
      [1, 1, 6, 4], [8, 1, 7, 3], [1, 6, 5, 5], [7, 5, 8, 4],
      [1, 12, 6, 3], [8, 10, 7, 5]
    ];
    for (const [px, py, pw, ph] of patches) {
      for (let y = py; y < py + ph && y < s; y++) {
        for (let x = px; x < px + pw && x < s; x++) {
          const n = pnoise(x, y, 6);
          ctx.fillStyle = stoneColors[Math.floor(n * stoneColors.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  });
}

export function getStoneBrickTex() {
  return makePixelTex("stone_brick", (ctx, s) => {
    ctx.fillStyle = "#3b3b3b";
    ctx.fillRect(0, 0, s, s);
    const brickGrays = ["#7e7e7e", "#707070", "#8c8c8c", "#606060"];
    const drawBrick = (x0, y0, w, h) => {
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          const n = pnoise(x, y, 7);
          ctx.fillStyle = brickGrays[Math.floor(n * brickGrays.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    };
    drawBrick(1, 1, 6, 6);
    drawBrick(8, 1, 7, 6);
    drawBrick(1, 9, 7, 6);
    drawBrick(9, 9, 6, 6);
  });
}

export function getOakLogSideTex() {
  return makePixelTex("oak_log_side", (ctx, s) => {
    const barks = ["#6b5335", "#5a4327", "#4c371d", "#7c6240", "#3a2a15"];
    for (let x = 0; x < s; x++) {
      const colBase = Math.floor(pnoise(x, 0, 8) * barks.length);
      for (let y = 0; y < s; y++) {
        const n = pnoise(x, y, 9);
        const idx = Math.abs((colBase + Math.floor(n * 2)) % barks.length);
        ctx.fillStyle = barks[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

export function getOakLogTopTex() {
  return makePixelTex("oak_log_top", (ctx, s) => {
    ctx.fillStyle = "#6b5335";
    ctx.fillRect(0, 0, s, s);
    const ringColors = ["#ab8d64", "#9b7d55", "#ba9d73", "#896d47"];
    for (let y = 1; y < s - 1; y++) {
      for (let x = 1; x < s - 1; x++) {
        const dx = x - 7.5;
        const dy = y - 7.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ring = Math.floor(dist * 1.5) % ringColors.length;
        const n = pnoise(x, y, 10);
        ctx.fillStyle = ringColors[(ring + Math.floor(n * 1.5)) % ringColors.length];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

export function getOakPlanksTex() {
  return makePixelTex("oak_planks", (ctx, s) => {
    ctx.fillStyle = "#684e2a";
    ctx.fillRect(0, 0, s, s);
    const woodColors = ["#b8945f", "#a6824e", "#c5a36e", "#977340"];
    for (let row = 0; row < 4; row++) {
      const y0 = row * 4;
      const h = 3;
      for (let y = y0; y < y0 + h; y++) {
        for (let x = 0; x < s; x++) {
          const n = pnoise(x, y, 11 + row);
          ctx.fillStyle = woodColors[Math.floor(n * woodColors.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
      const seamX = (row % 2 === 0) ? 7 : 11;
      ctx.fillStyle = "#684e2a";
      ctx.fillRect(seamX, y0, 1, h);
    }
  });
}

export function getOakLeavesTex() {
  return makePixelTex("oak_leaves", (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const greens = ["#397926", "#458f2e", "#2e631e", "#51a436", "#245217"];
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = pnoise(x, y, 12);
        if (n > 0.18) {
          ctx.fillStyle = greens[Math.floor((n - 0.18) / 0.82 * greens.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  });
}

export function getSandTex() {
  return makePixelTex("sand", (ctx, s) => {
    const sands = ["#dbd3a0", "#d0c68f", "#e6ddad", "#c3b87f", "#ebe4be"];
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = pnoise(x, y, 13);
        ctx.fillStyle = sands[Math.floor(n * sands.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

export function getWaterTex() {
  return makePixelTex("water", (ctx, s) => {
    const blues = ["#2f6bd9", "#3b78e7", "#4e88ee", "#275ec9", "#5b92f4"];
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = pnoise(x, y, 14);
        ctx.fillStyle = blues[Math.floor(n * blues.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

export function getObsidianTex() {
  return makePixelTex("obsidian", (ctx, s) => {
    const obColors = ["#161024", "#201633", "#2c1c46", "#100a1c", "#382259"];
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = pnoise(x, y, 15);
        ctx.fillStyle = obColors[Math.floor(n * obColors.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

export function getNetherPortalTex() {
  return makePixelTex("nether_portal", (ctx, s) => {
    const purples = ["#8924d6", "#a63df2", "#6e17b0", "#bf5cf7", "#520c87"];
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = pnoise(x, y, 16);
        ctx.fillStyle = purples[Math.floor(n * purples.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

export function getGlowstoneTex() {
  return makePixelTex("glowstone", (ctx, s) => {
    const glows = ["#fed667", "#f3b73e", "#ffeb8e", "#e29c2a", "#fff4b8"];
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = pnoise(x, y, 17);
        ctx.fillStyle = glows[Math.floor(n * glows.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

export function getDiamondBlockTex() {
  return makePixelTex("diamond_block", (ctx, s) => {
    ctx.fillStyle = "#3ab8a8";
    ctx.fillRect(0, 0, s, s);
    const cyans = ["#5fedd9", "#7af5e4", "#48cbba", "#9dfbf0", "#3eb3a3"];
    for (let y = 1; y < s - 1; y++) {
      for (let x = 1; x < s - 1; x++) {
        const n = pnoise(x, y, 18);
        ctx.fillStyle = cyans[Math.floor(n * cyans.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = "#bdfefa";
    ctx.fillRect(2, 2, 3, 3);
  });
}

export function getGoldBlockTex() {
  return makePixelTex("gold_block", (ctx, s) => {
    ctx.fillStyle = "#cfa018";
    ctx.fillRect(0, 0, s, s);
    const golds = ["#f8d93c", "#fde55e", "#ebc624", "#fff082", "#d9ad14"];
    for (let y = 1; y < s - 1; y++) {
      for (let x = 1; x < s - 1; x++) {
        const n = pnoise(x, y, 19);
        ctx.fillStyle = golds[Math.floor(n * golds.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = "#fff8b3";
    ctx.fillRect(2, 2, 3, 3);
  });
}

export function getEmeraldBlockTex() {
  return makePixelTex("emerald_block", (ctx, s) => {
    ctx.fillStyle = "#0c943c";
    ctx.fillRect(0, 0, s, s);
    const ems = ["#17dd62", "#2eef78", "#0eb94e", "#56f996", "#088032"];
    for (let y = 1; y < s - 1; y++) {
      for (let x = 1; x < s - 1; x++) {
        const n = pnoise(x, y, 20);
        ctx.fillStyle = ems[Math.floor(n * ems.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = "#a1fec2";
    ctx.fillRect(2, 2, 3, 3);
  });
}

export function getCraftingTableTopTex() {
  return makePixelTex("crafting_top", (ctx, s) => {
    ctx.fillStyle = "#7b5b32";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#ba9663";
    ctx.fillRect(2, 2, 12, 12);
    ctx.strokeStyle = "#5a3e1d";
    ctx.lineWidth = 1;
    ctx.strokeRect(3.5, 3.5, 9, 9);
    ctx.beginPath();
    ctx.moveTo(6.5, 3.5); ctx.lineTo(6.5, 12.5);
    ctx.moveTo(9.5, 3.5); ctx.lineTo(9.5, 12.5);
    ctx.moveTo(3.5, 6.5); ctx.lineTo(12.5, 6.5);
    ctx.moveTo(3.5, 9.5); ctx.lineTo(12.5, 9.5);
    ctx.stroke();
  });
}

export function getCraftingTableSideTex() {
  return makePixelTex("crafting_side", (ctx, s) => {
    ctx.fillStyle = "#a27c49";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#5a3e1d";
    ctx.fillRect(0, 0, s, 2);
    ctx.fillRect(0, s - 2, s, 2);
    ctx.fillStyle = "#dcdcdc";
    ctx.fillRect(3, 4, 3, 7);
    ctx.fillRect(9, 5, 4, 3);
  });
}

export function getBookshelfTex() {
  return makePixelTex("bookshelf", (ctx, s) => {
    ctx.fillStyle = "#8d6a3b";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#4a351b";
    ctx.fillRect(0, 7, s, 2);
    const bookColors = ["#b03a2e", "#2874a6", "#239b56", "#b7950b", "#7d3c98", "#d35400"];
    for (let row = 0; row < 2; row++) {
      const y0 = row === 0 ? 1 : 9;
      let curX = 1;
      while (curX < s - 1) {
        const bw = 1 + (curX % 2);
        const col = bookColors[(curX + row * 3) % bookColors.length];
        ctx.fillStyle = col;
        ctx.fillRect(curX, y0, bw, 6);
        ctx.fillStyle = "#fdfefe";
        ctx.fillRect(curX, y0, bw, 1);
        curX += bw + 1;
      }
    }
  });
}

export function getFlowerRedTex() {
  return makePixelTex("flower_red", (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = "#488e2b";
    ctx.fillRect(7, 6, 2, 10);
    ctx.fillStyle = "#d92727";
    ctx.fillRect(5, 2, 6, 5);
    ctx.fillStyle = "#f54747";
    ctx.fillRect(6, 3, 4, 3);
    ctx.fillStyle = "#300808";
    ctx.fillRect(7, 4, 2, 2);
  });
}

export function getFlowerYellowTex() {
  return makePixelTex("flower_yellow", (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = "#488e2b";
    ctx.fillRect(7, 6, 2, 10);
    ctx.fillStyle = "#ffd52b";
    ctx.fillRect(5, 2, 6, 5);
    ctx.fillStyle = "#fff066";
    ctx.fillRect(6, 3, 4, 3);
    ctx.fillStyle = "#b88c00";
    ctx.fillRect(7, 4, 2, 2);
  });
}

export function getSunTex() {
  return makePixelTex("mc_sun", (ctx, s) => {
    ctx.fillStyle = "#fff4a8";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(3, 3, s - 6, s - 6);
  }, 32);
}

export function getMoonTex() {
  return makePixelTex("mc_moon", (ctx, s) => {
    ctx.fillStyle = "#e0e6ed";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(4, 4, s - 8, s - 8);
    ctx.fillStyle = "#9ba9ba";
    ctx.fillRect(6, 8, 4, 4);
    ctx.fillRect(16, 14, 6, 6);
    ctx.fillRect(18, 6, 4, 4);
  }, 32);
}

export function getBlockMaterial(type, opts = {}) {
  const key = `${type}_${JSON.stringify(opts)}`;
  if (matCache.has(key)) return matCache.get(key);

  let mat;
  switch (type) {
    case "dirt":
      mat = new THREE.MeshLambertMaterial({ map: getDirtTex(), ...opts }); break;
    case "grass_top":
      mat = new THREE.MeshLambertMaterial({ map: getGrassTopTex(), ...opts }); break;
    case "grass_side":
      mat = new THREE.MeshLambertMaterial({ map: getGrassSideTex(), ...opts }); break;
    case "stone":
      mat = new THREE.MeshLambertMaterial({ map: getStoneTex(), ...opts }); break;
    case "cobblestone":
      mat = new THREE.MeshLambertMaterial({ map: getCobblestoneTex(), ...opts }); break;
    case "stone_brick":
      mat = new THREE.MeshLambertMaterial({ map: getStoneBrickTex(), ...opts }); break;
    case "oak_log_side":
      mat = new THREE.MeshLambertMaterial({ map: getOakLogSideTex(), ...opts }); break;
    case "oak_log_top":
      mat = new THREE.MeshLambertMaterial({ map: getOakLogTopTex(), ...opts }); break;
    case "oak_planks":
      mat = new THREE.MeshLambertMaterial({ map: getOakPlanksTex(), ...opts }); break;
    case "oak_leaves":
      mat = new THREE.MeshLambertMaterial({
        map: getOakLeavesTex(),
        transparent: true,
        alphaTest: 0.4,
        side: THREE.DoubleSide,
        ...opts
      }); break;
    case "sand":
      mat = new THREE.MeshLambertMaterial({ map: getSandTex(), ...opts }); break;
    case "water":
      mat = new THREE.MeshLambertMaterial({
        map: getWaterTex(),
        transparent: true,
        opacity: 0.75,
        ...opts
      }); break;
    case "obsidian":
      mat = new THREE.MeshLambertMaterial({ map: getObsidianTex(), ...opts }); break;
    case "nether_portal":
      mat = new THREE.MeshBasicMaterial({
        map: getNetherPortalTex(),
        transparent: true,
        opacity: 0.85,
        ...opts
      }); break;
    case "glowstone":
      mat = new THREE.MeshBasicMaterial({
        map: getGlowstoneTex(),
        ...opts
      }); break;
    case "diamond_block":
      mat = new THREE.MeshLambertMaterial({ map: getDiamondBlockTex(), ...opts }); break;
    case "gold_block":
      mat = new THREE.MeshLambertMaterial({ map: getGoldBlockTex(), ...opts }); break;
    case "emerald_block":
      mat = new THREE.MeshLambertMaterial({ map: getEmeraldBlockTex(), ...opts }); break;
    case "bookshelf":
      mat = new THREE.MeshLambertMaterial({ map: getBookshelfTex(), ...opts }); break;
    case "crafting_side":
      mat = new THREE.MeshLambertMaterial({ map: getCraftingTableSideTex(), ...opts }); break;
    case "crafting_top":
      mat = new THREE.MeshLambertMaterial({ map: getCraftingTableTopTex(), ...opts }); break;
    default:
      mat = new THREE.MeshLambertMaterial({ color: 0x888888, ...opts }); break;
  }
  matCache.set(key, mat);
  return mat;
}

export function createVoxelBlock(type, sx = 1, sy = 1, sz = 1) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  let materials;

  if (type === "grass") {
    const side = getBlockMaterial("grass_side");
    const top = getBlockMaterial("grass_top");
    const bot = getBlockMaterial("dirt");
    materials = [side, side, top, bot, side, side];
  } else if (type === "log") {
    const side = getBlockMaterial("oak_log_side");
    const top = getBlockMaterial("oak_log_top");
    materials = [side, side, top, top, side, side];
  } else if (type === "crafting_table") {
    const side = getBlockMaterial("crafting_side");
    const top = getBlockMaterial("crafting_top");
    const bot = getBlockMaterial("oak_planks");
    materials = [side, side, top, bot, side, side];
  } else if (type === "bookshelf") {
    const side = getBlockMaterial("bookshelf");
    const top = getBlockMaterial("oak_planks");
    materials = [side, side, top, top, side, side];
  } else {
    materials = getBlockMaterial(type);
  }

  const mesh = new THREE.Mesh(geo, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
