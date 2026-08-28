// Classroom (teaching) mode. The room host is the TEACHER: they see a question,
// read it aloud over voice, and the kids (students) tap an answer. The teacher
// sees who answered and who got it right, then advances. The teacher is the
// source of truth - they broadcast the full question object so everyone sees the
// exact same thing (no seed-sync issues).

import { getCategoryQuestion, CATEGORIES } from "./questions.js";
import { createProgress } from "./progress.js";
import { sfx } from "./audio.js";

export function startClassroom(session, opts, onExit) {
  const root = document.getElementById("classroom");
  const progress = createProgress();
  const category = opts.category || "mix";
  const catLabel = CATEGORIES.find((c) => c.key === category)?.name || "Everything";
  const teacher = session.isHost();
  root.classList.remove("hidden");

  const unsubs = [];
  unsubs.push(session.onMsg(onMsg));
  let qIndex = -1;
  let current = null; // teacher's current question
  let answers = new Map(); // studentId -> { choice, correct }
  let scores = new Map(); // studentId -> correctCount
  let answered = false; // student: answered current?
  let revealed = false;

  function muteBtn() {
    return `<button class="icon-btn ${session.isMuted() ? "muted" : "live"}" id="cls-mute">${session.isMuted() ? "🔇" : "🎤"}</button>`;
  }

  if (teacher) renderTeacher();
  else renderWaiting();

  // ---------------- TEACHER ----------------
  function nextQuestion() {
    qIndex++;
    current = getCategoryQuestion(category, Math.min(5, Math.floor(qIndex / 4)));
    answers = new Map();
    revealed = false;
    session.send("q", { qIndex, q: current });
    renderTeacher();
  }

  function renderTeacher() {
    const students = session.members().filter((p) => p.id !== session.myId);
    root.innerHTML = `
      <div class="cls-wrap">
        <div class="cls-head">
          <div class="cls-role">👩‍🏫 Maestra · ${catLabel}</div>
          <div class="cls-head-right">${muteBtn()}<button class="icon-btn" id="cls-end" title="End class">✖</button></div>
        </div>
        ${current ? questionCard(current, revealed, -1) : `<div class="cls-start"><p>¿Listo para enseñar <b>${catLabel}</b>?</p></div>`}
        <div class="cls-roster">
          ${students.length ? students.map((s) => rosterRow(s)).join("") : `<div class="cls-empty">Esperando que los alumnos se unan…</div>`}
        </div>
        <div class="cls-controls">
          ${current && !revealed ? `<button class="btn" id="cls-reveal">👀 Revelar Respuesta</button>` : ""}
          <button class="btn btn-accent btn-big" id="cls-next">${current ? "Siguiente Pregunta →" : "Empezar ▶"}</button>
        </div>
      </div>`;
    wireCommon();
    root.querySelector("#cls-next").addEventListener("click", nextQuestion);
    const rev = root.querySelector("#cls-reveal");
    if (rev) rev.addEventListener("click", () => { revealed = true; session.send("reveal", { qIndex }); renderTeacher(); });
  }

  function rosterRow(s) {
    const a = answers.get(s.id);
    const sc = scores.get(s.id) || 0;
    const status = a ? (revealed ? (a.correct ? "✅" : "❌") : "✋ respondido") : "💭 pensando";
    const dot = `<span class="dot" style="background:#${(s.color || 0x5fc6f0).toString(16).padStart(6, "0")}"></span>`;
    return `<div class="cls-srow">${dot}<span class="cls-sname">${s.name || "Player"}</span><span class="cls-sstatus">${status}</span><span class="cls-sscore">⭐ ${sc}</span></div>`;
  }

  // ---------------- STUDENT ----------------
  function renderWaiting() {
    root.innerHTML = `
      <div class="cls-wrap">
        <div class="cls-head">
          <div class="cls-role">🙋 ¡Escucha a la maestra!</div>
          <div class="cls-head-right">${muteBtn()}<button class="icon-btn" id="cls-end" title="Leave">✖</button></div>
        </div>
        <div class="cls-start"><div class="win-emoji">👂</div><p>¡Prepárate! La maestra empezará pronto.</p></div>
      </div>`;
    wireCommon();
  }

  function renderStudent() {
    root.innerHTML = `
      <div class="cls-wrap">
        <div class="cls-head">
          <div class="cls-role">🙋 ¡Tu turno de responder!</div>
          <div class="cls-head-right">${muteBtn()}<button class="icon-btn" id="cls-end" title="Leave">✖</button></div>
        </div>
        ${questionCard(current, revealed, answered ? answers.get(session.myId)?.choice ?? -1 : -1)}
        <div class="cls-note" id="cls-note">${answered ? "¡Respuesta enviada! ⏳ Esperando a la maestra…" : "¡Toca tu respuesta!"}</div>
      </div>`;
    wireCommon();
    if (!answered) {
      root.querySelectorAll(".choice").forEach((btn, i) =>
        btn.addEventListener("click", () => studentAnswer(i))
      );
    }
  }

  function studentAnswer(i) {
    if (answered) return;
    answered = true;
    const correct = i === current.correctIndex;
    answers.set(session.myId, { choice: i, correct });
    session.send("a", { qIndex, choice: i, correct, name: session.profile.name });
    if (correct) { sfx.correct(); const r = progress.addXp(12); }
    else sfx.wrong();
    renderStudent();
  }

  // ---------------- shared ----------------
  function questionCard(q, showAnswer, myChoice) {
    const tiles = q.choices
      .map((c, i) => {
        let cls = "choice" + (q.choiceEmoji ? " emoji" : "");
        if (showAnswer && i === q.correctIndex) cls += " correct";
        if (showAnswer && myChoice === i && i !== q.correctIndex) cls += " wrong";
        return `<button class="${cls}" ${showAnswer || teacher ? "disabled" : ""}>${c}</button>`;
      })
      .join("");
    return `
      <div class="cls-q">
        <div class="quiz-topic">${q.topic}</div>
        <div class="quiz-picture">${q.picture ? q.picture.repeat(q.picCount || 1) : ""}</div>
        <div class="quiz-prompt">${q.prompt}</div>
        <div class="quiz-choices">${tiles}</div>
      </div>`;
  }

  function wireCommon() {
    const mute = root.querySelector("#cls-mute");
    if (mute) mute.addEventListener("click", () => { session.toggleMute(); (teacher ? renderTeacher : renderStudent)(); });
    root.querySelector("#cls-end").addEventListener("click", () => {
      if (teacher) session.send("endclass", {});
      onExit();
    });
  }

  // ---------------- messages ----------------
  function onMsg(m) {
    if (m.from === session.myId) return;
    if (teacher) {
      if (m.type === "a" && m.qIndex === qIndex) {
        answers.set(m.from, { choice: m.choice, correct: m.correct });
        if (m.correct) scores.set(m.from, (scores.get(m.from) || 0) + 1);
        renderTeacher();
      }
    } else {
      if (m.type === "q") {
        qIndex = m.qIndex;
        current = m.q;
        answered = false;
        revealed = false;
        renderStudent();
      } else if (m.type === "reveal" && m.qIndex === qIndex) {
        revealed = true;
        renderStudent();
      } else if (m.type === "endclass") {
        onExit();
      }
    }
  }

  // re-render rosters when people join/leave
  unsubs.push((() => { let active = true; session.onRoster(() => { if (active && teacher) renderTeacher(); }); return () => { active = false; }; })());

  function destroy() {
    unsubs.forEach((u) => u && u());
    root.innerHTML = "";
    root.classList.add("hidden");
  }

  return { destroy };
}
