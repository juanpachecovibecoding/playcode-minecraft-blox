// Persistent player profile: a coin wallet plus avatar customization (body color
// + hat) and which shop items have been bought. All in localStorage so it sticks
// across sessions. Coins are earned in gameplay and spent in the Closet.

const K_COINS = "bb_coins";
const K_COLOR = "bb_color";
const K_HAT = "bb_hat";
const K_OWNED = "bb_owned";

const FREE_HATS = ["none", "cap"]; // owned by default
const DEFAULT_COLOR = 0x5cc6f0;

export function getCoins() {
  return Number(localStorage.getItem(K_COINS) || 0) || 0;
}
export function addCoins(n) {
  const v = getCoins() + n;
  try { localStorage.setItem(K_COINS, String(v)); } catch { /* ignore */ }
  return v;
}
export function spendCoins(n) {
  if (getCoins() < n) return false;
  try { localStorage.setItem(K_COINS, String(getCoins() - n)); } catch { /* ignore */ }
  return true;
}

export function getColor() {
  return Number(localStorage.getItem(K_COLOR)) || DEFAULT_COLOR;
}
export function setColor(c) {
  try { localStorage.setItem(K_COLOR, String(c)); } catch { /* ignore */ }
}
export function getHat() {
  return localStorage.getItem(K_HAT) || "none";
}
export function setHat(h) {
  try { localStorage.setItem(K_HAT, h); } catch { /* ignore */ }
}

function ownedList() {
  try { return JSON.parse(localStorage.getItem(K_OWNED) || "[]"); } catch { return []; }
}
export function owns(item) {
  return FREE_HATS.includes(item) || ownedList().includes(item);
}
export function buy(item, price) {
  if (owns(item)) return true;
  if (!spendCoins(price)) return false;
  const o = ownedList();
  o.push(item);
  try { localStorage.setItem(K_OWNED, JSON.stringify(o)); } catch { /* ignore */ }
  return true;
}
