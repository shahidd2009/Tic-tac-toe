'use strict';

/* ============================================================
   X & O — Game Engine
   ============================================================ */

/* ---------- State ---------- */
const state = {
  board: Array(9).fill(null),      // 'X' | 'O' | null
  currentPlayer: 'X',
  mode: 'pvp',                     // 'pvp' | 'pvc'
  difficulty: 'medium',            // 'easy' | 'medium' | 'hard'
  gameActive: true,
  soundOn: true,
  gameNumber: 1,
  scores: { X: 0, O: 0, draw: 0 },
  stats: { total: 0, streak: 0, streakPlayer: null },
  aiThinking: false,
};

const WIN_LINES = [
  [0,1,2], [3,4,5], [6,7,8],   // rows
  [0,3,6], [1,4,7], [2,5,8],   // columns
  [0,4,8], [2,4,6],            // diagonals
];

/* ---------- DOM references ---------- */
const boardEl = document.getElementById('board');
const cells = Array.from(document.querySelectorAll('.cell'));
const winLineSvg = document.getElementById('winLineEl');

const turnGlyph = document.getElementById('turnGlyph');
const turnText = document.getElementById('turnText');

const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');
const scoreDrawEl = document.getElementById('scoreDraw');
const scoreOLabel = document.getElementById('scoreOLabel');

const statsTotal = document.getElementById('statsTotal');
const statsStreak = document.getElementById('statsStreak');
const gameNumberEl = document.getElementById('gameNumber');

const modePvpBtn = document.getElementById('modePvp');
const modePvcBtn = document.getElementById('modePvc');
const difficultySelect = document.getElementById('difficultySelect');
const diffBtns = Array.from(document.querySelectorAll('.diff-btn'));

const newGameBtn = document.getElementById('newGameBtn');
const resetScoreBtn = document.getElementById('resetScoreBtn');
const soundToggle = document.getElementById('soundToggle');
const playNowBtn = document.getElementById('playNowBtn');

const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const modalEyebrow = document.getElementById('modalEyebrow');
const playAgainBtn = document.getElementById('playAgainBtn');

const confirmOverlay = document.getElementById('confirmOverlay');
const cancelResetBtn = document.getElementById('cancelResetBtn');
const confirmResetBtn = document.getElementById('confirmResetBtn');

/* ============================================================
   Sound engine (WebAudio — no external files needed)
   ============================================================ */
let audioCtx = null;
function getAudioCtx(){
  if (!audioCtx){
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.12, delay = 0){
  if (!state.soundOn) return;
  try{
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const startTime = ctx.currentTime + delay;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }catch(e){ /* audio not available — fail silently */ }
}

const sfx = {
  move: (isX) => playTone(isX ? 660 : 520, 0.12, 'triangle', 0.1),
  win: () => {
    playTone(523.25, 0.15, 'sine', 0.13, 0);
    playTone(659.25, 0.15, 'sine', 0.13, 0.14);
    playTone(783.99, 0.28, 'sine', 0.14, 0.28);
  },
  draw: () => {
    playTone(300, 0.2, 'sawtooth', 0.08, 0);
    playTone(260, 0.3, 'sawtooth', 0.08, 0.15);
  },
  click: () => playTone(340, 0.08, 'square', 0.06),
  toggle: () => playTone(440, 0.1, 'sine', 0.08),
};

/* ============================================================
   Rendering
   ============================================================ */
function renderBoard(){
  cells.forEach((cell, i) => {
    const value = state.board[i];
    cell.classList.remove('is-x', 'is-o', 'is-winner');
    if (value === 'X'){
      cell.textContent = 'X';
      cell.classList.add('is-x');
    } else if (value === 'O'){
      cell.textContent = 'O';
      cell.classList.add('is-o');
    } else {
      cell.textContent = '';
    }
  });
}

function updateTurnIndicator(){
  const isX = state.currentPlayer === 'X';
  turnGlyph.textContent = state.currentPlayer;
  turnGlyph.classList.toggle('is-o', !isX);

  if (!state.gameActive){
    return;
  }

  if (state.mode === 'pvc' && !isX){
    turnText.textContent = state.aiThinking ? "Computer is thinking…" : "Computer's Turn";
  } else {
    turnText.textContent = `Player ${state.currentPlayer}'s Turn`;
  }
}

function updateScoreboard(){
  animateScoreValue(scoreXEl, state.scores.X);
  animateScoreValue(scoreOEl, state.scores.O);
  animateScoreValue(scoreDrawEl, state.scores.draw);
}

function animateScoreValue(el, newValue){
  if (el.textContent !== String(newValue)){
    el.textContent = newValue;
    el.classList.remove('is-bumped');
    // force reflow to restart animation
    void el.offsetWidth;
    el.classList.add('is-bumped');
  }
}

function updateStats(){
  statsTotal.textContent = state.stats.total;
  if (state.stats.streak > 1 && state.stats.streakPlayer){
    statsStreak.textContent = `${state.stats.streakPlayer} x${state.stats.streak}`;
  } else {
    statsStreak.textContent = '—';
  }
}

function updateGameNumber(){
  gameNumberEl.textContent = String(state.gameNumber).padStart(2, '0');
}

function updateModeLabels(){
  scoreOLabel.textContent = state.mode === 'pvc' ? 'Computer' : 'Player O';
}

/* ============================================================
   Game logic
   ============================================================ */
function checkResult(board = state.board){
  for (const line of WIN_LINES){
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]){
      return { winner: board[a], line };
    }
  }
  if (board.every(cell => cell !== null)){
    return { winner: 'draw', line: null };
  }
  return null;
}

function handleCellClick(e){
  const index = Number(e.currentTarget.dataset.index);

  if (!state.gameActive || state.board[index] !== null || state.aiThinking) return;
  if (state.mode === 'pvc' && state.currentPlayer === 'O') return; // block manual O in PvC

  makeMove(index);
}

function makeMove(index){
  state.board[index] = state.currentPlayer;
  sfx.move(state.currentPlayer === 'X');
  renderBoard();

  const result = checkResult();
  if (result){
    endRound(result);
    return;
  }

  switchTurn();

  // Trigger AI move if applicable
  if (state.mode === 'pvc' && state.currentPlayer === 'O' && state.gameActive){
    state.aiThinking = true;
    updateTurnIndicator();
    boardEl.classList.add('is-locked');
    const thinkDelay = 450 + Math.random() * 350;
    setTimeout(() => {
      const aiIndex = getAIMove();
      state.aiThinking = false;
      boardEl.classList.remove('is-locked');
      if (aiIndex !== null && state.gameActive){
        makeMove(aiIndex);
      }
    }, thinkDelay);
  }
}

function switchTurn(){
  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  updateTurnIndicator();
}

function endRound(result){
  state.gameActive = false;
  state.stats.total += 1;

  if (result.winner === 'draw'){
    state.scores.draw += 1;
    state.stats.streak = 0;
    state.stats.streakPlayer = null;
    sfx.draw();
  } else {
    state.scores[result.winner] += 1;
    if (state.stats.streakPlayer === result.winner){
      state.stats.streak += 1;
    } else {
      state.stats.streak = 1;
      state.stats.streakPlayer = result.winner;
    }
    highlightWin(result.line);
    sfx.win();
    launchConfetti(result.winner);
  }

  updateScoreboard();
  updateStats();

  setTimeout(() => showResultModal(result), result.winner === 'draw' ? 500 : 700);
}

function highlightWin(line){
  line.forEach(i => cells[i].classList.add('is-winner'));
  drawWinLine(line);
}

/* Maps a winning line to SVG coordinates on a 300x300 viewBox mirroring the 3x3 grid */
function drawWinLine(line){
  const key = line.join(',');
  const coordMap = {
    '0,1,2': [30, 50, 270, 50],
    '3,4,5': [30, 150, 270, 150],
    '6,7,8': [30, 250, 270, 250],
    '0,3,6': [50, 30, 50, 270],
    '1,4,7': [150, 30, 150, 270],
    '2,5,8': [250, 30, 250, 270],
    '0,4,8': [35, 35, 265, 265],
    '2,4,6': [265, 35, 35, 265],
  };
  const coords = coordMap[key];
  if (!coords) return;
  const [x1, y1, x2, y2] = coords;
  winLineSvg.setAttribute('x1', x1);
  winLineSvg.setAttribute('y1', y1);
  winLineSvg.setAttribute('x2', x2);
  winLineSvg.setAttribute('y2', y2);
  winLineSvg.classList.remove('is-drawn');
  void winLineSvg.getBBox();
  winLineSvg.classList.add('is-drawn');
}

function clearWinLine(){
  winLineSvg.classList.remove('is-drawn');
  winLineSvg.removeAttribute('x1');
}

/* ============================================================
   AI Opponent
   ============================================================ */
function getAIMove(){
  const board = state.board;
  const empty = board.reduce((acc, v, i) => { if (v === null) acc.push(i); return acc; }, []);
  if (empty.length === 0) return null;

  if (state.difficulty === 'easy'){
    // Mostly random, occasionally smart
    if (Math.random() < 0.75){
      return empty[Math.floor(Math.random() * empty.length)];
    }
    return findBestMove(board, 'O');
  }

  if (state.difficulty === 'medium'){
    // Block/win when obvious, otherwise mostly random with some strategy
    const winMove = findWinningMove(board, 'O');
    if (winMove !== null) return winMove;
    const blockMove = findWinningMove(board, 'X');
    if (blockMove !== null) return blockMove;
    if (Math.random() < 0.5){
      return empty[Math.floor(Math.random() * empty.length)];
    }
    return findBestMove(board, 'O');
  }

  // Hard: unbeatable via minimax
  return findBestMove(board, 'O');
}

function findWinningMove(board, player){
  for (const [a, b, c] of WIN_LINES){
    const line = [board[a], board[b], board[c]];
    const countPlayer = line.filter(v => v === player).length;
    const countEmpty = line.filter(v => v === null).length;
    if (countPlayer === 2 && countEmpty === 1){
      const idx = [a, b, c][line.indexOf(null)];
      return idx;
    }
  }
  return null;
}

function findBestMove(board, player){
  const opponent = player === 'O' ? 'X' : 'O';

  // Prefer center, then corners, then edges as tie-breakers with minimax
  let bestScore = -Infinity;
  let bestMove = null;
  const priorityOrder = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  const emptyIndices = priorityOrder.filter(i => board[i] === null);

  for (const i of emptyIndices){
    const newBoard = board.slice();
    newBoard[i] = player;
    const score = minimax(newBoard, 0, false, player, opponent);
    if (score > bestScore){
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

function minimax(board, depth, isMaximizing, player, opponent){
  const result = checkResult(board);
  if (result){
    if (result.winner === player) return 10 - depth;
    if (result.winner === opponent) return depth - 10;
    return 0; // draw
  }

  const empty = board.reduce((acc, v, i) => { if (v === null) acc.push(i); return acc; }, []);

  if (isMaximizing){
    let best = -Infinity;
    for (const i of empty){
      board[i] = player;
      best = Math.max(best, minimax(board, depth + 1, false, player, opponent));
      board[i] = null;
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of empty){
      board[i] = opponent;
      best = Math.min(best, minimax(board, depth + 1, true, player, opponent));
      board[i] = null;
    }
    return best;
  }
}

/* ============================================================
   Modal
   ============================================================ */
function showResultModal(result){
  modalTitle.classList.remove('is-x', 'is-o', 'is-draw');

  if (result.winner === 'draw'){
    modalEyebrow.textContent = 'Round over';
    modalTitle.textContent = "IT'S A DRAW!";
    modalTitle.classList.add('is-draw');
    modalSubtitle.textContent = 'Evenly matched. Run it back?';
  } else {
    const isComputer = state.mode === 'pvc' && result.winner === 'O';
    modalEyebrow.textContent = isComputer ? 'The machine prevails' : 'Round over';
    modalTitle.textContent = `${result.winner} WINS!`;
    modalTitle.classList.add(result.winner === 'X' ? 'is-x' : 'is-o');
    modalSubtitle.textContent = isComputer
      ? 'The computer connected three. Better luck this time.'
      : 'Three in a row. Clean sweep.';
  }

  modalOverlay.classList.add('is-open');
}

function hideResultModal(){
  modalOverlay.classList.remove('is-open');
}

/* ============================================================
   Game flow controls
   ============================================================ */
function startNewGame({ incrementCounter = true } = {}){
  state.board = Array(9).fill(null);
  state.currentPlayer = 'X';
  state.gameActive = true;
  state.aiThinking = false;

  if (incrementCounter) state.gameNumber += 1;

  renderBoard();
  clearWinLine();
  boardEl.classList.remove('is-locked');
  updateTurnIndicator();
  updateGameNumber();
  hideResultModal();
}

function resetScores(){
  state.scores = { X: 0, O: 0, draw: 0 };
  state.stats = { total: 0, streak: 0, streakPlayer: null };
  state.gameNumber = 1;
  updateScoreboard();
  updateStats();
  updateGameNumber();
}

function setMode(mode){
  state.mode = mode;
  modePvpBtn.classList.toggle('is-active', mode === 'pvp');
  modePvpBtn.setAttribute('aria-selected', mode === 'pvp');
  modePvcBtn.classList.toggle('is-active', mode === 'pvc');
  modePvcBtn.setAttribute('aria-selected', mode === 'pvc');
  difficultySelect.hidden = mode !== 'pvc';
  updateModeLabels();
  startNewGame({ incrementCounter: false });
}

function setDifficulty(level){
  state.difficulty = level;
  diffBtns.forEach(btn => btn.classList.toggle('is-active', btn.dataset.difficulty === level));
}

/* ============================================================
   Event listeners
   ============================================================ */
cells.forEach(cell => cell.addEventListener('click', handleCellClick));

modePvpBtn.addEventListener('click', () => { sfx.click(); setMode('pvp'); });
modePvcBtn.addEventListener('click', () => { sfx.click(); setMode('pvc'); });

diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    sfx.click();
    setDifficulty(btn.dataset.difficulty);
    startNewGame({ incrementCounter: false });
  });
});

newGameBtn.addEventListener('click', () => { sfx.click(); startNewGame(); });

resetScoreBtn.addEventListener('click', () => {
  sfx.click();
  confirmOverlay.classList.add('is-open');
});

cancelResetBtn.addEventListener('click', () => {
  sfx.click();
  confirmOverlay.classList.remove('is-open');
});

confirmResetBtn.addEventListener('click', () => {
  sfx.toggle();
  resetScores();
  confirmOverlay.classList.remove('is-open');
});

confirmOverlay.addEventListener('click', (e) => {
  if (e.target === confirmOverlay) confirmOverlay.classList.remove('is-open');
});

soundToggle.addEventListener('click', () => {
  state.soundOn = !state.soundOn;
  soundToggle.setAttribute('aria-pressed', String(state.soundOn));
  if (state.soundOn) sfx.toggle();
});

playAgainBtn.addEventListener('click', () => { sfx.click(); startNewGame(); });

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) startNewGame();
});

playNowBtn.addEventListener('click', () => { sfx.click(); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape'){
    if (modalOverlay.classList.contains('is-open')) startNewGame();
    if (confirmOverlay.classList.contains('is-open')) confirmOverlay.classList.remove('is-open');
  }
});

/* ============================================================
   Background particle canvas
   ============================================================ */
(function initBackgroundParticles(){
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let width, height;

  function resize(){
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createParticles(){
    const count = Math.min(70, Math.floor((width * height) / 22000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      hue: Math.random() > 0.5 ? 'cyan' : 'pink',
      alpha: Math.random() * 0.5 + 0.2,
    }));
  }

  function draw(){
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.hue === 'cyan'
        ? `rgba(0, 229, 255, ${p.alpha})`
        : `rgba(255, 60, 172, ${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('resize', () => { resize(); createParticles(); });
  resize();
  createParticles();
  if (!prefersReducedMotion){
    requestAnimationFrame(draw);
  } else {
    draw(); // draw a single static frame
  }
})();

/* ============================================================
   Winning celebration confetti
   ============================================================ */
function launchConfetti(winner){
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const baseColor = winner === 'X' ? [0, 229, 255] : [255, 60, 172];
  const colors = [baseColor, [124, 92, 237], [34, 197, 94], [248, 250, 252]];

  const pieces = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.5,
    size: Math.random() * 7 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    speedY: Math.random() * 2.5 + 2,
    speedX: (Math.random() - 0.5) * 2.5,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    life: 0,
    maxLife: 160 + Math.random() * 60,
  }));

  let frame = 0;
  const maxFrames = 220;

  function tick(){
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.speedY += 0.02;
      p.rotation += p.rotationSpeed;
      p.life++;

      const fade = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = fade;
      ctx.fillStyle = `rgb(${p.color[0]}, ${p.color[1]}, ${p.color[2]})`;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });

    if (frame < maxFrames){
      requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(tick);
}

/* ============================================================
   Init
   ============================================================ */
function init(){
  updateModeLabels();
  renderBoard();
  updateTurnIndicator();
  updateScoreboard();
  updateStats();
  updateGameNumber();
  difficultySelect.hidden = true;
}

init();
