// ============================================================
//  BrainBlox question content - Spanish Version
//  ----------------------------------------------------------
//  Questions come in a few flavors, all multiple-choice (tap to answer):
//    - Math       : auto-generated (+, -, x), scaled by difficulty
//    - Pictures   : emoji-based - name it, count it, tap the match, find the
//                   category. Generated from the PICTURES table below, so the
//                   answer is always guaranteed correct.
//    - Text bank  : curated reading/science/geography (the BANK array)
//
//  Each returned question is { topic, prompt, choices, correctIndex,
//    picture?, picCount?, choiceEmoji? }:
//    picture     - a big emoji (or string) shown above the prompt
//    picCount    - if set, the picture emoji is repeated this many times (counting)
//    choiceEmoji - true when the answer tiles are emoji instead of words
//
//  TO ADD YOUR OWN: add to BANK (text questions) or PICTURES (emoji words).
// ============================================================

// emoji + the word for it + a category, used to build picture questions.
export const PICTURES = [
  // animales
  { e: "🐶", name: "Perro", cat: "animal" },
  { e: "🐱", name: "Gato", cat: "animal" },
  { e: "🦁", name: "León", cat: "animal" },
  { e: "🐘", name: "Elefante", cat: "animal" },
  { e: "🐸", name: "Rana", cat: "animal" },
  { e: "🐝", name: "Abeja", cat: "animal" },
  { e: "🐢", name: "Tortuga", cat: "animal" },
  { e: "🐠", name: "Pez", cat: "animal" },
  { e: "🦆", name: "Pato", cat: "animal" },
  { e: "🦋", name: "Mariposa", cat: "animal" },
  { e: "🐧", name: "Pingüino", cat: "animal" },
  { e: "🐴", name: "Caballo", cat: "animal" },
  // comida
  { e: "🍎", name: "Manzana", cat: "food" },
  { e: "🍌", name: "Plátano", cat: "food" },
  { e: "🍓", name: "Fresa", cat: "food" },
  { e: "🍕", name: "Pizza", cat: "food" },
  { e: "🍦", name: "Helado", cat: "food" },
  { e: "🥕", name: "Zanahoria", cat: "food" },
  { e: "🍪", name: "Galleta", cat: "food" },
  { e: "🍉", name: "Sandía", cat: "food" },
  { e: "🌽", name: "Maíz", cat: "food" },
  { e: "🍇", name: "Uvas", cat: "food" },
  // vehículos
  { e: "🚗", name: "Auto", cat: "vehicle" },
  { e: "🚌", name: "Autobús", cat: "vehicle" },
  { e: "✈️", name: "Avión", cat: "vehicle" },
  { e: "🚀", name: "Cohete", cat: "vehicle" },
  { e: "🚲", name: "Bicicleta", cat: "vehicle" },
  { e: "🚂", name: "Tren", cat: "vehicle" },
  { e: "⛵", name: "Barco", cat: "vehicle" },
  { e: "🚒", name: "Camión de bomberos", cat: "vehicle" },
  // naturaleza
  { e: "🌳", name: "Árbol", cat: "nature" },
  { e: "🌸", name: "Flor", cat: "nature" },
  { e: "☀️", name: "Sol", cat: "nature" },
  { e: "🌙", name: "Luna", cat: "nature" },
  { e: "⭐", name: "Estrella", cat: "nature" },
  { e: "🌈", name: "Arcoíris", cat: "nature" },
  { e: "❄️", name: "Copo de nieve", cat: "nature" },
  { e: "🍄", name: "Hongo", cat: "nature" },
  // cosas
  { e: "⚽", name: "Pelota de fútbol", cat: "thing" },
  { e: "🎈", name: "Globo", cat: "thing" },
  { e: "🎁", name: "Regalo", cat: "thing" },
  { e: "🪁", name: "Cometa", cat: "thing" },
  { e: "🧸", name: "Oso de peluche", cat: "thing" },
  { e: "🎸", name: "Guitarra", cat: "thing" },
  { e: "🔑", name: "Llave", cat: "thing" },
  { e: "⏰", name: "Reloj", cat: "thing" },
];

const CATEGORY_LABEL = {
  animal: "animal",
  food: "alimento que se come",
  vehicle: "medio de transporte",
  nature: "elemento de la naturaleza",
  thing: "objeto o juguete"
};

export const BANK = [
  // ---- Lectura / Ortografía ----
  { topic: "Lectura", prompt: "¿Qué palabra significa un perro bebé?", choices: ["Cachorro", "Gatito", "Ternero", "Pollito"], correctIndex: 0, minLevel: 0 },
  { topic: "Lectura", prompt: "¿Qué palabra está escrita correctamente?", choices: ["Amigo", "Hamigo", "Amiggo", "Amygo"], correctIndex: 0, minLevel: 0 },
  { topic: "Lectura", prompt: "¿Qué es lo opuesto de 'caliente'?", choices: ["Tibio", "Frío", "Rápido", "Grande"], correctIndex: 1, minLevel: 0 },
  { topic: "Lectura", prompt: "¿Qué palabra rima con 'gato'?", choices: ["Perro", "Pato", "Taza", "Sol"], correctIndex: 1, minLevel: 0 },
  { topic: "Lectura", prompt: "¿Qué es lo opuesto de 'feliz'?", choices: ["Triste", "Alegre", "Divertido", "Alto"], correctIndex: 0, minLevel: 0 },
  { topic: "Lectura", prompt: "¿Qué palabra significa 'muy grande'?", choices: ["Diminuto", "Enorme", "Suave", "Lento"], correctIndex: 1, minLevel: 0 },
  { topic: "Lectura", prompt: "¿Qué palabra está escrita correctamente?", choices: ["Porque", "Porke", "Por que", "Porqué"], correctIndex: 0, minLevel: 1 },
  { topic: "Lectura", prompt: "¿Qué palabra está en plural (más de uno)?", choices: ["Gato", "Perros", "Casa", "Árbol"], correctIndex: 1, minLevel: 1 },

  // ---- Ciencias ----
  { topic: "Ciencias", prompt: "¿Qué necesitan las plantas para crecer?", choices: ["Dulces", "Luz solar", "Juguetes", "Piedras"], correctIndex: 1, minLevel: 0 },
  { topic: "Ciencias", prompt: "¿Cuántas patas tiene una araña?", choices: ["6", "8", "4", "10"], correctIndex: 1, minLevel: 0 },
  { topic: "Ciencias", prompt: "¿Qué hacen las abejas?", choices: ["Leche", "Miel", "Pan", "Seda"], correctIndex: 1, minLevel: 0 },
  { topic: "Ciencias", prompt: "Una oruga se convierte en una...", choices: ["Araña", "Mariposa", "Pájaro", "Pez"], correctIndex: 1, minLevel: 0 },
  { topic: "Ciencias", prompt: "¿Cuántos días hay en una semana?", choices: ["5", "7", "10", "12"], correctIndex: 1, minLevel: 0 },
  { topic: "Ciencias", prompt: "¿Qué respiramos para mantenernos vivos?", choices: ["Agua", "Aire", "Arena", "Jugo"], correctIndex: 1, minLevel: 0 },
  { topic: "Ciencias", prompt: "¿Qué estación del año es la más fría?", choices: ["Verano", "Invierno", "Primavera", "Otoño"], correctIndex: 1, minLevel: 0 },

  // ---- Geografía ----
  { topic: "Geografía", prompt: "¿Cuál es la capital de Francia?", choices: ["París", "Roma", "Londres", "Madrid"], correctIndex: 0, minLevel: 1 },
  { topic: "Geografía", prompt: "¿Cuántos continentes hay?", choices: ["5", "7", "10", "3"], correctIndex: 1, minLevel: 1 },
  { topic: "Geografía", prompt: "¿Cómo llamamos a una elevación de tierra muy alta?", choices: ["Valle", "Montaña", "Campo", "Cueva"], correctIndex: 1, minLevel: 0 },
  { topic: "Geografía", prompt: "¿Qué lugar está cubierto de hielo y nieve?", choices: ["Antártida", "África", "India", "México"], correctIndex: 0, minLevel: 2 },
];

// ---------- small helpers ----------
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}
function sampleDistinct(arr, n, exclude, rng) {
  const pool = arr.filter((x) => x !== exclude);
  shuffle(pool, rng);
  return pool.slice(0, n);
}
function getFirstLetter(name) {
  const first = name[0].toUpperCase();
  if (first === "Á") return "A";
  if (first === "É") return "E";
  if (first === "Í") return "I";
  if (first === "Ó") return "O";
  if (first === "Ú") return "U";
  return first;
}

// ---------- math ----------
function buildNumberChoices(answer, rng) {
  const set = new Set([answer]);
  let guard = 0;
  while (set.size < 4 && guard++ < 50) {
    const delta = (1 + Math.floor(rng() * 5)) * (rng() < 0.5 ? -1 : 1);
    const cand = answer + delta;
    if (cand >= 0) set.add(cand);
  }
  let pad = answer + 10;
  while (set.size < 4) set.add(pad++);
  return shuffle([...set], rng);
}

function makeMath(level, rng) {
  const r = (n) => Math.floor(rng() * n);
  let a, b, op, answer;
  if (level >= 4 && rng() < 0.6) {
    a = 2 + r(8);
    b = 2 + r(8);
    op = "×";
    answer = a * b;
  } else {
    const max = level <= 1 ? 12 : level <= 3 ? 25 : 50;
    a = 1 + r(max);
    b = 1 + r(max);
    if (rng() < 0.5) {
      op = "+";
      answer = a + b;
    } else {
      if (b > a) [a, b] = [b, a];
      op = "−";
      answer = a - b;
    }
  }
  const choices = buildNumberChoices(answer, rng);
  return { topic: "Matemáticas", prompt: `${a} ${op} ${b} = ?`, choices: choices.map(String), correctIndex: choices.indexOf(answer) };
}

// ---------- picture questions ----------
function makeCount(level, rng) {
  const item = pick(PICTURES, rng);
  const n = 2 + Math.floor(rng() * (level <= 1 ? 5 : 8)); // 2..6 or 2..9
  const choices = buildNumberChoices(n, rng).map(String);
  return {
    topic: "Contar",
    prompt: "¿Cuántos ves?",
    picture: item.e,
    picCount: n,
    choices,
    correctIndex: choices.indexOf(String(n)),
  };
}

function makeNamePicture(rng) {
  const item = pick(PICTURES, rng);
  const distractors = sampleDistinct(PICTURES, 3, item, rng).map((p) => p.name);
  const choices = shuffle([item.name, ...distractors], rng);
  return {
    topic: "Imágenes",
    prompt: "¿Qué es esto?",
    picture: item.e,
    choices,
    correctIndex: choices.indexOf(item.name),
  };
}

function makeTapPicture(rng) {
  const item = pick(PICTURES, rng);
  const distractors = sampleDistinct(PICTURES, 3, item, rng).map((p) => p.e);
  const choices = shuffle([item.e, ...distractors], rng);
  return {
    topic: "Imágenes",
    prompt: `¡Toca: ${item.name.toLowerCase()}!`,
    choices,
    choiceEmoji: true,
    correctIndex: choices.indexOf(item.e),
  };
}

function makeCategory(rng) {
  const cat = pick(["animal", "food", "vehicle", "nature", "thing"], rng);
  const inCat = PICTURES.filter((p) => p.cat === cat);
  const outCat = PICTURES.filter((p) => p.cat !== cat);
  const correct = pick(inCat, rng);
  const distractors = shuffle([...outCat], rng).slice(0, 3).map((p) => p.e);
  const choices = shuffle([correct.e, ...distractors], rng);
  return {
    topic: "Imágenes",
    prompt: `¿Cuál es un/a ${CATEGORY_LABEL[cat]}?`,
    choices,
    choiceEmoji: true,
    correctIndex: choices.indexOf(correct.e),
  };
}

const PICTURE_MAKERS = [makeCount, makeNamePicture, makeTapPicture, makeCategory];

// ---------- Learn zone (Khan-style): letters, numbers, shapes, colors ----------
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const SHAPES = [
  { e: "🔵", name: "Círculo" }, { e: "🟦", name: "Cuadrado" }, { e: "🔺", name: "Triángulo" },
  { e: "⭐", name: "Estrella" }, { e: "❤️", name: "Corazón" }, { e: "🔷", name: "Rombo" },
];
const COLORS = [
  { e: "🔴", name: "Rojo" }, { e: "🟠", name: "Naranja" }, { e: "🟡", name: "Amarillo" },
  { e: "🟢", name: "Verde" }, { e: "🔵", name: "Azul" }, { e: "🟣", name: "Morado" },
];

function fourLetters(correct, rng) {
  const set = new Set([correct]);
  while (set.size < 4) set.add(ALPHA[Math.floor(rng() * 26)]);
  return shuffle([...set], rng);
}

function makeLetterQ(rng) {
  if (rng() < 0.5) {
    // "🍎 Apple starts with which letter?"
    const item = pick(PICTURES, rng);
    const letter = getFirstLetter(item.name);
    const choices = fourLetters(letter, rng);
    return { topic: "Letras", prompt: `¿${item.name} comienza con...?`, picture: item.e, choices, choiceEmoji: true, correctIndex: choices.indexOf(letter) };
  }
  // "Tap the letter B"
  const letter = ALPHA[Math.floor(rng() * 26)];
  const choices = fourLetters(letter, rng);
  return { topic: "Letras", prompt: `Toca la letra ${letter}`, choices, choiceEmoji: true, correctIndex: choices.indexOf(letter) };
}

function makeNumberQ(level, rng) {
  const roll = rng();
  if (roll < 0.4) return makeCount(level, rng);
  if (roll < 0.7) {
    // "What comes after 6?"
    const n = 1 + Math.floor(rng() * 18);
    const choices = buildNumberChoices(n + 1, rng).map(String);
    return { topic: "Números", prompt: `¿Qué número viene después de ${n}?`, choices, correctIndex: choices.indexOf(String(n + 1)) };
  }
  // "Tap the number 7"
  const n = Math.floor(rng() * 20);
  const choices = buildNumberChoices(n, rng).map(String);
  return { topic: "Números", prompt: `Toca el número ${n}`, choices, choiceEmoji: true, correctIndex: choices.indexOf(String(n)) };
}

function fromTable(table, rng) {
  if (rng() < 0.5) {
    // "Tap the Circle!" -> emoji choices
    const item = pick(table, rng);
    const distract = sampleDistinct(table, 3, item, rng).map((s) => s.e);
    const choices = shuffle([item.e, ...distract], rng);
    return { prompt: `¡Toca el/la ${item.name.toLowerCase()}!`, choices, choiceEmoji: true, correctIndex: choices.indexOf(item.e), picture: null };
  }
  // "What is this? 🔺" -> word choices
  const item = pick(table, rng);
  const distract = sampleDistinct(table, 3, item, rng).map((s) => s.name);
  const choices = shuffle([item.name, ...distract], rng);
  return { prompt: "¿Qué es esto?", picture: item.e, choices, correctIndex: choices.indexOf(item.name) };
}
function makeShapeQ(rng) {
  return { topic: "Figuras", ...fromTable(SHAPES, rng) };
}
function makeColorQ(rng) {
  return { topic: "Colores", ...fromTable(COLORS, rng) };
}

// A question for a Learn subject ("letters" | "numbers" | "shapes" | "colors").
export function getLearnQuestion(subject, level = 0, rng = Math.random) {
  if (subject === "letters") return makeLetterQ(rng);
  if (subject === "numbers") return makeNumberQ(level, rng);
  if (subject === "shapes") return makeShapeQ(rng);
  if (subject === "colors") return makeColorQ(rng);
  return getQuestion(level, rng);
}

// ---------- categories (used to pick the subject in multiplayer rooms) ----------
export const CATEGORIES = [
  { key: "mix", emoji: "🎲", name: "Todo" },
  { key: "math", emoji: "➕", name: "Matemáticas" },
  { key: "pictures", emoji: "🖼️", name: "Imágenes" },
  { key: "letters", emoji: "🔤", name: "Letras" },
  { key: "numbers", emoji: "🔢", name: "Números" },
  { key: "shapes", emoji: "🔷", name: "Figuras" },
  { key: "colors", emoji: "🎨", name: "Colores" },
  { key: "reading", emoji: "📖", name: "Lectura" },
  { key: "science", emoji: "🔬", name: "Ciencia" },
  { key: "geography", emoji: "🌍", name: "Geografía" },
];

function bankByTopic(topic, level, rng) {
  const pool = BANK.filter((q) => q.topic === topic && (q.minLevel || 0) <= level);
  const all = pool.length ? pool : BANK.filter((q) => q.topic === topic);
  if (!all.length) return getQuestion(level, rng);
  const p = pick(all, rng);
  return { topic: p.topic, prompt: p.prompt, choices: [...p.choices], correctIndex: p.correctIndex };
}

// One question for a chosen category key.
export function getCategoryQuestion(category, level = 0, rng = Math.random) {
  switch (category) {
    case "math": return makeMath(level, rng);
    case "pictures": { const m = pick(PICTURE_MAKERS, rng); return m === makeCount ? m(level, rng) : m(rng); }
    case "letters": return makeLetterQ(rng);
    case "numbers": return makeNumberQ(level, rng);
    case "shapes": return makeShapeQ(rng);
    case "colors": return makeColorQ(rng);
    case "reading": return bankByTopic("Lectura", level, rng);
    case "science": return bankByTopic("Ciencias", level, rng);
    case "geography": return bankByTopic("Geografía", level, rng);
    default: return getQuestion(level, rng);
  }
}

// Return a question for the given difficulty level. Heavily weighted toward
// visual picture questions (kids love them), with math and text mixed in.
export function getQuestion(level = 0, rng = Math.random) {
  const roll = rng();
  if (roll < 0.5) {
    // picture question
    const maker = pick(PICTURE_MAKERS, rng);
    return maker === makeCount ? maker(level, rng) : maker(rng);
  }
  if (roll < 0.8) return makeMath(level, rng);
  // text bank
  const eligible = BANK.filter((q) => (q.minLevel || 0) <= level);
  const p = pick(eligible.length ? eligible : BANK, rng);
  return { topic: p.topic, prompt: p.prompt, choices: [...p.choices], correctIndex: p.correctIndex };
}
