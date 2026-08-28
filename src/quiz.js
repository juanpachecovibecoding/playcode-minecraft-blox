// Owns the quiz modal. `ask(question, opts)` shows the question (with a big emoji
// picture when present), renders the answer tiles (emoji or words), updates a
// progress bar, and resolves true/false after the kid taps. A friendly mascot
// reacts to the answer. Knows nothing about the 3D world.

const MASCOTS = ["🦊", "🐼", "🐵", "🐰", "🐯", "🐨"];

export function createQuiz() {
  const root = document.getElementById("quiz");
  const topicEl = document.getElementById("quiz-topic");
  const pictureEl = document.getElementById("quiz-picture");
  const promptEl = document.getElementById("quiz-prompt");
  const choicesEl = document.getElementById("quiz-choices");
  const feedbackEl = document.getElementById("quiz-feedback");
  const mascotEl = document.getElementById("quiz-mascot");
  const progressFill = document.getElementById("quiz-progress-fill");

  let mascotIdx = 0;

  function ask(question, opts = {}) {
    return new Promise((resolve) => {
      topicEl.textContent = question.topic;
      promptEl.textContent = question.prompt;
      feedbackEl.textContent = "";
      feedbackEl.className = "quiz-feedback";
      choicesEl.innerHTML = "";

      // picture: a single big emoji, or repeated for counting questions
      if (question.picture) {
        const n = question.picCount || 1;
        pictureEl.textContent = question.picture.repeat(n);
      } else {
        pictureEl.textContent = "";
      }

      // mascot rotates each question for variety
      mascotEl.textContent = MASCOTS[mascotIdx++ % MASCOTS.length];

      // progress bar (0..1) toward finishing
      if (progressFill) progressFill.style.width = `${Math.round((opts.progress || 0) * 100)}%`;

      question.choices.forEach((choice, i) => {
        const btn = document.createElement("button");
        btn.className = "choice" + (question.choiceEmoji ? " emoji" : "");
        btn.textContent = choice;
        btn.addEventListener("click", () => pick(i, btn));
        choicesEl.appendChild(btn);
      });

      root.classList.remove("hidden");

      // Dev-only test hook (stripped from production builds).
      if (import.meta.env.DEV) window.__bbQuiz = { choices: question.choices, correctIndex: question.correctIndex };

      function pick(i, btn) {
        const buttons = [...choicesEl.querySelectorAll(".choice")];
        buttons.forEach((b) => (b.disabled = true));
        const correct = i === question.correctIndex;
        if (correct) {
          btn.classList.add("correct");
          feedbackEl.textContent = "¡Sí! ¡Muy bien! 🎉";
          feedbackEl.className = "quiz-feedback good";
          mascotEl.textContent = "🎉";
          setTimeout(() => finish(true), 800);
        } else {
          btn.classList.add("wrong");
          buttons[question.correctIndex].classList.add("correct");
          feedbackEl.textContent = "¡Ups! Inténtalo de nuevo.";
          feedbackEl.className = "quiz-feedback bad";
          mascotEl.textContent = "🙈";
          setTimeout(() => finish(false), 1300);
        }
      }

      function finish(result) {
        root.classList.add("hidden");
        resolve(result);
      }
    });
  }

  return { ask, isOpen: () => !root.classList.contains("hidden") };
}
