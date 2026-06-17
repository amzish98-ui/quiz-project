/* ==========================================================
   QuizMaster Pro — quiz.js
   Author: Amir Shahsavari
   Description: All quiz logic — fetching questions from the
   Open Trivia Database API, timer, scoring, leaderboard,
   dark/light mode, and result review.
   External source: Open Trivia DB API — https://opentdb.com
   ========================================================== */

/* ----------------------------------------------------------
   1. STATE — All the data the quiz needs to track
---------------------------------------------------------- */
const state = {
  playerName: 'Player',       // Set when the user types their name
  categoryId: 9,              // OpenTDB category ID
  categoryName: '',           // Readable category name
  difficulty: '',             // '', 'easy', 'medium', or 'hard'
  questions: [],              // Array of question objects from the API
  currentIndex: 0,            // Which question we're on (0-based)
  score: 0,                   // Running point total
  correctCount: 0,            // How many correct answers
  streak: 0,                  // Current correct answer streak
  bestStreak: 0,              // Highest streak this session
  timerSeconds: 20,           // Seconds remaining for current question
  timerInterval: null,        // setInterval reference for the countdown
  answered: false,            // Has the user answered the current question
  reviewLog: [],              // Per-question record for results page
  theme: 'dark',              // 'dark' or 'light'
};

// Fill-in-the-blank questions — stored locally since the API doesn't provide them
// Source: Written manually for this project
const FITB_QUESTIONS = [
  {
    question: 'The chemical symbol for water is __________.',
    answer: 'h2o',
    hint: 'Two hydrogens, one oxygen',
  },
  {
    question: 'The capital city of France is __________.',
    answer: 'paris',
    hint: 'City of Light',
  },
  {
    question: 'The largest planet in our solar system is __________.',
    answer: 'jupiter',
    hint: 'Gas giant with a Great Red Spot',
  },
  {
    question: 'The longest river in the world is the __________.',
    answer: 'nile',
    hint: 'Flows through northeastern Africa',
  },
  {
    question: 'In computing, "CPU" stands for Central Processing __________.',
    answer: 'unit',
    hint: 'The "brain" of a computer',
  },
  {
    question: "In mathematics, the ratio of a circle's circumference to its diameter is called __________.",
    answer: 'pi',
    hint: 'Approximately 3.14159',
  },
];

/* ----------------------------------------------------------
   2. DOM REFERENCES — Grab all the elements we'll need
---------------------------------------------------------- */
const pages = {
  howTo:   document.getElementById('how-to-page'),
  quiz:    document.getElementById('quiz-page'),
  results: document.getElementById('results-page'),
};

const els = {
  // How-to page
  playerName:      document.getElementById('playerName'),
  categorySelect:  document.getElementById('categorySelect'),
  difficultySelect:document.getElementById('difficultySelect'),
  startBtn:        document.getElementById('startBtn'),
  setupError:      document.getElementById('setupError'),

  // Quiz header
  headerCategory:  document.getElementById('headerCategory'),
  progressFill:    document.getElementById('progressFill'),
  progressLabel:   document.getElementById('progressLabel'),

  // Timer
  ringFill:        document.getElementById('ringFill'),
  timerNum:        document.getElementById('timerNum'),

  // Question
  qTypeBadge:      document.getElementById('qTypeBadge'),
  qDiffBadge:      document.getElementById('qDiffBadge'),
  questionCard:    document.getElementById('questionCard'),
  questionText:    document.getElementById('questionText'),
  answersGrid:     document.getElementById('answersGrid'),

  // Fill in the blank
  fitbWrap:        document.getElementById('fitbWrap'),
  fitbInput:       document.getElementById('fitbInput'),
  fitbSubmit:      document.getElementById('fitbSubmit'),

  // Feedback
  feedbackBar:     document.getElementById('feedbackBar'),

  // Sidebar
  leaderboardList:     document.getElementById('leaderboardList'),
  clearLeaderboardBtn: document.getElementById('clearLeaderboardBtn'),
  liveScore:           document.getElementById('liveScore'),
  liveCorrect:         document.getElementById('liveCorrect'),
  liveStreak:          document.getElementById('liveStreak'),

  // Results
  resultEmoji:     document.getElementById('resultEmoji'),
  resultTitle:     document.getElementById('resultTitle'),
  resultSubtitle:  document.getElementById('resultSubtitle'),
  rsFinalScore:    document.getElementById('rsFinalScore'),
  rsCorrect:       document.getElementById('rsCorrect'),
  rsAccuracy:      document.getElementById('rsAccuracy'),
  rsBestStreak:    document.getElementById('rsBestStreak'),
  reviewList:      document.getElementById('reviewList'),
  playAgainBtn:    document.getElementById('playAgainBtn'),
  homeBtn:         document.getElementById('homeBtn'),

  // Loading overlay
  loadingOverlay:  document.getElementById('loadingOverlay'),

  // Theme toggles (two — one per page)
  themeToggle:     document.getElementById('themeToggle'),
  themeToggle2:    document.getElementById('themeToggle2'),
  themeColorMeta:  document.getElementById('themeColorMeta'),
};

/* ----------------------------------------------------------
   3. THEME — Toggle between dark and light
---------------------------------------------------------- */

/**
 * Applies the given theme ('dark' or 'light') to the page
 * and saves it in localStorage so it persists on reload.
 * @param {string} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
  localStorage.setItem('qm_theme', theme);

  // Update emoji on both toggle buttons
  const icon = theme === 'dark' ? '☀️' : '🌙';
  document.querySelectorAll('.theme-toggle .theme-icon').forEach(el => el.textContent = icon);
  // Also update the small toggle that has no child span
  els.themeToggle2.textContent = icon;

  // Match the mobile browser chrome colour to the current theme's surface
  els.themeColorMeta.setAttribute('content', theme === 'dark' ? '#1a1d27' : '#ffffff');
}

/** Flip between dark and light */
function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// Wire up both toggle buttons
els.themeToggle.addEventListener('click', toggleTheme);
els.themeToggle2.addEventListener('click', toggleTheme);

// Load saved theme preference on startup
applyTheme(localStorage.getItem('qm_theme') || 'dark');

/* ----------------------------------------------------------
   4. PAGE NAVIGATION
---------------------------------------------------------- */

/**
 * Show one page and hide the others.
 * @param {string} pageKey — 'howTo', 'quiz', or 'results'
 */
function showPage(pageKey) {
  Object.entries(pages).forEach(([key, el]) => {
    el.classList.toggle('active', key === pageKey);
  });
}

/* ----------------------------------------------------------
   5. LEADERBOARD — saved in localStorage
---------------------------------------------------------- */

/**
 * Reads the leaderboard array from localStorage.
 * @returns {Array} sorted leaderboard entries
 */
function getLeaderboard() {
  return JSON.parse(localStorage.getItem('qm_leaderboard') || '[]');
}

/**
 * Adds a new entry to the leaderboard and keeps only the top 10.
 * @param {string} name
 * @param {number} score
 * @param {string} category
 */
function saveToLeaderboard(name, score, category) {
  const board = getLeaderboard();
  board.push({ name, score, category, date: new Date().toLocaleDateString() });
  board.sort((a, b) => b.score - a.score);        // Highest score first
  board.splice(10);                                 // Keep top 10 only
  localStorage.setItem('qm_leaderboard', JSON.stringify(board));
}

/** Clears the leaderboard from localStorage after user confirmation. */
function clearLeaderboard() {
  if (!confirm('Clear the leaderboard? This cannot be undone.')) return;
  localStorage.removeItem('qm_leaderboard');
  renderLeaderboard();
}

/**
 * Renders the leaderboard inside the quiz sidebar.
 * Highlights the current player's entry.
 */
function renderLeaderboard() {
  const board = getLeaderboard();
  const rankIcons = ['gold', 'silver', 'bronze'];

  // Avatar background colours — shades of the accent colour, cycles through for variety
  const avatarColors = ['#4f6df5', '#3a52d4', '#1e293b', '#475569', '#312e81'];

  if (board.length === 0) {
    els.leaderboardList.innerHTML = '<li class="lb-empty">No scores yet — be the first!</li>';
    return;
  }

  els.leaderboardList.innerHTML = board.map((entry, i) => {
    const initials = entry.name.slice(0, 2).toUpperCase();
    const color = avatarColors[i % avatarColors.length];
    const rankClass = rankIcons[i] || '';
    const isYou = entry.name === state.playerName && i === board.findIndex(e => e.name === state.playerName && e.score === state.score);

    return `
      <li class="lb-item${isYou ? ' is-you' : ''}">
        <span class="lb-rank ${rankClass}">#${i + 1}</span>
        <div class="lb-avatar" style="background:${color}">${initials}</div>
        <div class="lb-info">
          <div class="lb-name">${escapeHtml(entry.name)}</div>
          <div class="lb-score">${entry.score} pts · ${escapeHtml(entry.category)}</div>
        </div>
      </li>
    `;
  }).join('');
}

/* ----------------------------------------------------------
   6. FETCHING QUESTIONS from Open Trivia DB API
   Source: https://opentdb.com/api_config.php
---------------------------------------------------------- */

/**
 * Fetches 7 multiple-choice + true/false questions from the API,
 * then inserts 1 fill-in-the-blank question at a random position.
 * @returns {Promise<Array>} Array of normalised question objects
 */
async function fetchQuestions() {
  const diffParam = state.difficulty ? `&difficulty=${state.difficulty}` : '';

  // The API URL — fetching 9 questions (7 MC + 2 TF)
  // External source: https://opentdb.com
  const url = `https://opentdb.com/api.php?amount=9&category=${state.categoryId}&type=multiple${diffParam}`;

  const response = await fetch(url);

  // If the network or API fails, throw so the caller can handle it
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();

  // response_code 0 = success
  if (data.response_code !== 0) {
    throw new Error('Not enough questions for this combination. Try another category or difficulty.');
  }

  // Normalise each question into a consistent shape
  const apiQuestions = data.results.map(q => ({
    type: q.type === 'boolean' ? 'true-false' : 'multiple',
    difficulty: q.difficulty,
    question: decodeHtml(q.question),
    correct: decodeHtml(q.correct_answer),
    choices: shuffle([
      decodeHtml(q.correct_answer),
      ...q.incorrect_answers.map(decodeHtml),
    ]),
    explanation: null,  // API doesn't provide explanations
  }));

  // Pick one random fill-in-the-blank and insert at a random position
  const fitb = FITB_QUESTIONS[Math.floor(Math.random() * FITB_QUESTIONS.length)];
  const fitbQuestion = {
    type: 'fill-in-the-blank',
    difficulty: 'easy',
    question: fitb.question,
    correct: fitb.answer,     // Stored lowercase for comparison
    choices: [],
    explanation: fitb.hint,
  };

  const insertAt = Math.floor(Math.random() * (apiQuestions.length + 1));
  apiQuestions.splice(insertAt, 0, fitbQuestion);

  return apiQuestions;
}

/* ----------------------------------------------------------
   7. HTML HELPERS
---------------------------------------------------------- */

/**
 * Decodes HTML entities returned by the API (e.g. &amp; → &).
 * @param {string} str
 * @returns {string}
 */
function decodeHtml(str) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
}

/**
 * Escapes user-generated strings before inserting into innerHTML
 * to prevent XSS attacks.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} arr
 * @returns {Array}
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ----------------------------------------------------------
   8. TIMER
---------------------------------------------------------- */

// The SVG ring stroke-dasharray total circumference
const RING_CIRCUMFERENCE = 150.8;

/**
 * Updates the SVG ring and digit display to reflect remaining time.
 * Turns amber at 10s and red at 5s.
 */
function updateTimerDisplay() {
  const ratio = state.timerSeconds / 20;
  const offset = RING_CIRCUMFERENCE * (1 - ratio);

  els.ringFill.style.strokeDashoffset = offset;
  els.timerNum.textContent = state.timerSeconds;

  // Update colour classes
  els.ringFill.classList.toggle('warning', state.timerSeconds <= 10 && state.timerSeconds > 5);
  els.ringFill.classList.toggle('danger',  state.timerSeconds <= 5);
  els.timerNum.classList.toggle('warning', state.timerSeconds <= 10 && state.timerSeconds > 5);
  els.timerNum.classList.toggle('danger',  state.timerSeconds <= 5);
}

/** Starts the 20-second countdown for the current question. */
function startTimer() {
  clearInterval(state.timerInterval);
  state.timerSeconds = 20;
  updateTimerDisplay();

  state.timerInterval = setInterval(() => {
    state.timerSeconds--;
    updateTimerDisplay();

    if (state.timerSeconds <= 0) {
      clearInterval(state.timerInterval);
      // Time's up — treat as wrong answer with no selection
      handleTimeUp();
    }
  }, 1000);
}

/** Stops the countdown. Call this when the user selects an answer. */
function stopTimer() {
  clearInterval(state.timerInterval);
}

/* ----------------------------------------------------------
   9. SCORING
---------------------------------------------------------- */

/**
 * Calculates points for a correct answer.
 * Faster answers score more points.
 * @returns {number} Points earned
 */
function calculatePoints() {
  // Base: 100. Bonus: up to 100 for speed (1 pt per 5s remaining)
  const speedBonus = state.timerSeconds * 5;
  return 100 + speedBonus;
}

/**
 * Updates the live sidebar stats with a bump animation.
 */
function updateLiveStats() {
  els.liveScore.textContent = state.score;
  els.liveCorrect.textContent = state.correctCount;
  els.liveStreak.textContent = state.streak;

  // Trigger bump animation
  [els.liveScore, els.liveCorrect, els.liveStreak].forEach(el => {
    el.classList.remove('bump');
    void el.offsetWidth;   // Force reflow to restart animation
    el.classList.add('bump');
  });
}

/* ----------------------------------------------------------
   10. RENDERING A QUESTION
---------------------------------------------------------- */

/** Renders the current question to the screen. */
function renderQuestion() {
  const q = state.questions[state.currentIndex];
  state.answered = false;

  // Reset scroll to top so mobile users see the new question from the beginning
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Progress bar
  const pct = (state.currentIndex / state.questions.length) * 100;
  els.progressFill.style.width = pct + '%';
  els.progressLabel.textContent = `${state.currentIndex + 1} / ${state.questions.length}`;

  // Type and difficulty badges
  const typeLabels = { 'multiple': 'Multiple Choice', 'true-false': 'True / False', 'fill-in-the-blank': 'Fill in the Blank' };
  els.qTypeBadge.textContent = typeLabels[q.type] || q.type;
  els.qDiffBadge.textContent = q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1);

  // Question text
  els.questionText.textContent = q.question;

  // Clear feedback
  els.feedbackBar.className = 'feedback-bar';
  els.feedbackBar.textContent = '';

  // Show correct input type
  if (q.type === 'fill-in-the-blank') {
    els.answersGrid.style.display = 'none';
    els.fitbWrap.style.display = 'flex';
    els.fitbInput.value = '';
    els.fitbInput.focus(); // works on desktop; mobile keyboard requires a direct tap
    // Pulse the border so mobile users know to tap the field
    els.fitbInput.classList.remove('fitb-pulse');
    void els.fitbInput.offsetWidth; // force reflow to restart animation
    els.fitbInput.classList.add('fitb-pulse');
  } else {
    els.fitbWrap.style.display = 'none';
    els.answersGrid.style.display = 'grid';
    renderChoices(q);
  }

  startTimer();
}

/**
 * Builds and renders the answer buttons for MC / TF questions.
 * @param {Object} q — Question object
 */
function renderChoices(q) {
  const labels = ['A', 'B', 'C', 'D'];
  els.answersGrid.innerHTML = q.choices.map((choice, i) => `
    <button
      type="button"
      class="ans-btn"
      data-answer="${escapeHtml(choice)}"
      aria-label="Option ${labels[i]}: ${escapeHtml(choice)}"
    >
      <span class="ans-btn-inner">
        <span class="ans-label">${labels[i]}</span>
        ${escapeHtml(choice)}
      </span>
    </button>
  `).join('');

  // Attach click events to each button
  els.answersGrid.querySelectorAll('.ans-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleMCAnswer(btn.dataset.answer, btn);
    });
  });
}

/* ----------------------------------------------------------
   11. HANDLING ANSWERS
---------------------------------------------------------- */

/**
 * Processes a multiple-choice or true/false answer selection.
 * @param {string} selected — The text of the chosen answer
 * @param {HTMLElement} clickedBtn — The button that was clicked
 */
function handleMCAnswer(selected, clickedBtn) {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const q = state.questions[state.currentIndex];
  const isCorrect = selected === q.correct;

  // Colour all buttons — green for correct, red for the wrong pick
  els.answersGrid.querySelectorAll('.ans-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.answer === q.correct) {
      btn.classList.add('correct');
    } else if (btn === clickedBtn && !isCorrect) {
      btn.classList.add('wrong');
    }
  });

  processResult(isCorrect, q);
}

/**
 * Processes a fill-in-the-blank submission.
 * Comparison is case-insensitive and ignores extra whitespace.
 */
function handleFITBAnswer() {
  if (state.answered) return;
  const raw = els.fitbInput.value.trim().toLowerCase();
  if (!raw) return;

  state.answered = true;
  stopTimer();

  els.fitbInput.disabled = true;
  els.fitbSubmit.disabled = true;

  const q = state.questions[state.currentIndex];
  const isCorrect = raw === q.correct.toLowerCase();

  processResult(isCorrect, q);
}

/**
 * Called when the timer reaches zero — auto-submits as wrong.
 */
function handleTimeUp() {
  if (state.answered) return;
  state.answered = true;

  const q = state.questions[state.currentIndex];

  // Reveal the correct answer on the buttons
  els.answersGrid.querySelectorAll('.ans-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.answer === q.correct) btn.classList.add('correct');
  });

  els.fitbInput.disabled = true;
  els.fitbSubmit.disabled = true;

  processResult(false, q, true);
}

/**
 * Core result processor — updates score, streak, feedback, and log.
 * @param {boolean} isCorrect
 * @param {Object} q — Current question object
 * @param {boolean} [timedOut=false] — Whether the timer expired
 */
function processResult(isCorrect, q, timedOut = false) {
  let pointsEarned = 0;

  if (isCorrect) {
    pointsEarned = calculatePoints();
    state.score += pointsEarned;
    state.correctCount++;
    state.streak++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;

    showFeedback(true, `✓ Correct! +${pointsEarned} points`);
  } else {
    state.streak = 0;
    const msg = timedOut
      ? `⏰ Time's up! The answer was: ${q.correct}`
      : `✗ Wrong. The answer was: ${q.correct}`;
    showFeedback(false, msg);
  }

  // Log this question for the review section
  state.reviewLog.push({
    question: q.question,
    correct: q.correct,
    isCorrect,
    explanation: q.explanation || null,
  });

  updateLiveStats();

  // Advance to the next question after a short delay
  setTimeout(nextQuestion, 1800);
}

/**
 * Shows a feedback message below the answers.
 * @param {boolean} isCorrect
 * @param {string} message
 */
function showFeedback(isCorrect, message) {
  els.feedbackBar.textContent = message;
  els.feedbackBar.className = `feedback-bar ${isCorrect ? 'show-correct' : 'show-wrong'}`;
}

/* ----------------------------------------------------------
   12. QUESTION NAVIGATION
---------------------------------------------------------- */

/** Advances to the next question, or ends the quiz if done. */
function nextQuestion() {
  state.currentIndex++;

  if (state.currentIndex >= state.questions.length) {
    endQuiz();
  } else {
    renderQuestion();
  }
}

/* ----------------------------------------------------------
   13. STARTING THE QUIZ
---------------------------------------------------------- */

/** Called when the user clicks "Start Quiz" on the how-to page. */
async function startQuiz() {
  // Validate name
  const name = els.playerName.value.trim();
  if (!name) {
    els.playerName.focus();
    els.playerName.style.borderColor = 'var(--wrong)';
    setTimeout(() => (els.playerName.style.borderColor = ''), 2000);
    return;
  }

  // Capture settings
  state.playerName = name;
  state.categoryId = els.categorySelect.value;
  state.categoryName = els.categorySelect.options[els.categorySelect.selectedIndex].text;
  state.difficulty = els.difficultySelect.value;
  state.score = 0;
  state.correctCount = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.currentIndex = 0;
  state.reviewLog = [];

  // Update header
  els.headerCategory.textContent = state.categoryName;

  // Hide any previous error and show loading overlay
  els.setupError.classList.remove('visible');
  els.loadingOverlay.classList.add('visible');

  try {
    state.questions = await fetchQuestions();

    els.loadingOverlay.classList.remove('visible');
    showPage('quiz');
    renderLeaderboard();
    updateLiveStats();
    renderQuestion();

  } catch (err) {
    els.loadingOverlay.classList.remove('visible');
    els.setupError.textContent = `Could not load questions: ${err.message} Please check your connection or try a different category/difficulty.`;
    els.setupError.classList.add('visible');
  }
}

/* ----------------------------------------------------------
   14. ENDING THE QUIZ
---------------------------------------------------------- */

/** Saves the score, renders results, and shows the results page. */
function endQuiz() {
  stopTimer();
  saveToLeaderboard(state.playerName, state.score, state.categoryName);

  // Calculate stats
  const total = state.questions.length;
  const accuracy = Math.round((state.correctCount / total) * 100);

  // Pick an appropriate emoji and title
  let emoji, title;
  if (accuracy === 100) { emoji = '🏆'; title = 'Perfect score!'; }
  else if (accuracy >= 80) { emoji = '🎉'; title = 'Amazing!'; }
  else if (accuracy >= 60) { emoji = '😄'; title = 'Well done!'; }
  else if (accuracy >= 40) { emoji = '🙂'; title = 'Not bad!'; }
  else                      { emoji = '📚'; title = 'Keep practising!'; }

  els.resultEmoji.textContent = emoji;
  els.resultTitle.textContent = title;
  els.resultSubtitle.textContent = `You scored ${state.correctCount} out of ${total}`;

  // Fill in result stats
  els.rsFinalScore.textContent = state.score;
  els.rsCorrect.textContent = `${state.correctCount}/${total}`;
  els.rsAccuracy.textContent = `${accuracy}%`;
  els.rsBestStreak.textContent = state.bestStreak;

  // Build the review list
  els.reviewList.innerHTML = state.reviewLog.map(item => {
    const klass = item.isCorrect ? 'correct' : 'wrong';
    const icon  = item.isCorrect ? '✓' : '✗';
    const expHtml = item.explanation
      ? `<br/>💡 Hint: ${escapeHtml(item.explanation)}`
      : '';
    return `
      <div class="review-item ${klass}">
        <div class="review-q">${icon} ${escapeHtml(item.question)}</div>
        <div class="review-detail">
          <strong>Correct answer: ${escapeHtml(item.correct)}</strong>${expHtml}
        </div>
      </div>
    `;
  }).join('');

  showPage('results');
}

/* ----------------------------------------------------------
   15. RESULTS PAGE BUTTONS
---------------------------------------------------------- */

/** Play again with the same settings. */
els.playAgainBtn.addEventListener('click', startQuiz);

/** Go back to the how-to page to change category. */
els.homeBtn.addEventListener('click', () => showPage('howTo'));

/* ----------------------------------------------------------
   16. EVENT WIRING
---------------------------------------------------------- */

// Start button on how-to page
els.startBtn.addEventListener('click', startQuiz);

// Allow pressing Enter in the name field to start
els.playerName.addEventListener('keydown', e => {
  if (e.key === 'Enter') startQuiz();
});

// Fill-in-the-blank submit button
els.fitbSubmit.addEventListener('click', handleFITBAnswer);

// Fill-in-the-blank Enter key
els.fitbInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleFITBAnswer();
});

// Clear leaderboard button
els.clearLeaderboardBtn.addEventListener('click', clearLeaderboard);
