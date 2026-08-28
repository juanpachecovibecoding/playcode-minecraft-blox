// Player progression: XP and levels that persist across sessions (localStorage),
// so a kid keeps leveling up every time they play. Each level needs a little more
// XP than the last. XP comes from correct answers, coins, gates, and wins.

const KEY = "bb_xp";

function levelInfo(totalXp) {
  let level = 1;
  let acc = 0;
  let need = 100; // xp from level 1 -> 2
  while (totalXp >= acc + need) {
    acc += need;
    level++;
    need = 50 + level * 50; // 2->3 needs 150, 3->4 needs 200, ...
  }
  const into = totalXp - acc;
  return { level, into, need, frac: Math.max(0, Math.min(1, into / need)) };
}

export function createProgress() {
  let xp = Number(localStorage.getItem(KEY) || 0) || 0;

  function info() {
    return levelInfo(xp);
  }

  // add XP; returns { leveledUp, level, info }
  function addXp(amount) {
    const before = levelInfo(xp).level;
    xp += amount;
    try {
      localStorage.setItem(KEY, String(xp));
    } catch {
      /* storage may be unavailable - fine, just no persistence */
    }
    const now = levelInfo(xp);
    return { leveledUp: now.level > before, level: now.level, info: now };
  }

  return { addXp, info, getXp: () => xp };
}
