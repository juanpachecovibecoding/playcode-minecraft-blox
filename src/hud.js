// Manages the 2D overlay: star count, transient flash messages, the win screen,
// the room badge + player list (for multiplayer), and the play-again button.
// Pure DOM - no game or 3D knowledge.

export function createHud() {
  const starCount = document.getElementById("star-count");
  const coinCount = document.getElementById("coin-count");
  const levelNum = document.getElementById("level-num");
  const xpFill = document.getElementById("xp-fill");
  const flash = document.getElementById("flash");
  const winScreen = document.getElementById("win");
  const winStarCount = document.getElementById("win-star-count");
  const winCoinCount = document.getElementById("win-coin-count");
  const winLevelNum = document.getElementById("win-level-num");
  const roomBadge = document.getElementById("room-badge");
  const roomCodeLabel = document.getElementById("room-code-label");
  const playerList = document.getElementById("player-list");
  const powerups = document.getElementById("powerups");

  let stars = 0;
  let coins = 0;
  let flashTimer = null;

  const starsEl = starCount.parentElement;
  const coinsEl = coinCount.parentElement;
  const levelEl = levelNum.closest(".pill");

  function pop(el) {
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  function setStars(n) {
    stars = n;
    starCount.textContent = String(n);
  }
  function addStar() {
    setStars(stars + 1);
    pop(starsEl);
  }
  function setCoins(n) {
    coins = n;
    coinCount.textContent = String(n);
    pop(coinsEl);
  }
  // level info: { level, frac }
  function setLevel(infoOrLevel, frac) {
    const level = typeof infoOrLevel === "object" ? infoOrLevel.level : infoOrLevel;
    const f = typeof infoOrLevel === "object" ? infoOrLevel.frac : frac;
    levelNum.textContent = String(level);
    if (xpFill) xpFill.style.width = `${Math.round((f || 0) * 100)}%`;
  }
  function popLevel() {
    pop(levelEl);
  }

  // power-up chips: array of { icon, label }
  function setPowerups(list) {
    if (!powerups) return;
    powerups.innerHTML = "";
    for (const p of list) {
      const chip = document.createElement("div");
      chip.className = "pwr-chip";
      chip.textContent = `${p.icon} ${p.label}`;
      powerups.appendChild(chip);
    }
  }

  function showFlash(msg, ms = 1200) {
    flash.textContent = msg;
    flash.classList.add("show");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => flash.classList.remove("show"), ms);
  }

  function showWin(level) {
    winStarCount.textContent = String(stars);
    if (winCoinCount) winCoinCount.textContent = String(coins);
    if (winLevelNum) winLevelNum.textContent = String(level || 1);
    winScreen.classList.remove("hidden");
  }
  function hideWin() {
    winScreen.classList.add("hidden");
  }

  function showRoom(code) {
    roomCodeLabel.textContent = code;
    roomBadge.classList.remove("hidden");
  }

  // players: array of { id, name, color, speaking }
  function setPlayers(players) {
    playerList.innerHTML = "";
    for (const p of players) {
      const chip = document.createElement("div");
      chip.className = "player-chip" + (p.speaking ? " speaking" : "");
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = "#" + p.color.toString(16).padStart(6, "0");
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(p.name));
      playerList.appendChild(chip);
    }
  }

  return {
    setStars, addStar, setCoins, setLevel, popLevel, setPowerups,
    showFlash, showWin, hideWin, showRoom, setPlayers,
    getStars: () => stars, getCoins: () => coins,
  };
}
