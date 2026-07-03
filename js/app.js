const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const turnText = document.getElementById('turn-text');
const turnDot = document.getElementById('turn-dot');
const messageEl = document.getElementById('message');
const newGameBtn = document.getElementById('new-game');
const sizeSelect = document.getElementById('size-select');
const undoBtn = document.getElementById('undo-btn');
const resetScoreBtn = document.getElementById('reset-score-btn');
const scoreBlueEl = document.getElementById('score-blue');
const scoreGreenEl = document.getElementById('score-green');
const progressBlueFill = document.getElementById('progress-blue-fill');
const progressGreenFill = document.getElementById('progress-green-fill');
const progressBlueVal = document.getElementById('progress-blue-val');
const progressGreenVal = document.getElementById('progress-green-val');

let game = null;
let scoreBlue = 0;
let scoreGreen = 0;
let winDirection = 'lr';
let startingPlayer = 0;

let aiEnabled = false;
let humanPlayer = 0;
let aiPlayer = 1;
let aiDifficulty = 'medium';
let aiThinking = false;

let dragModeEnabled = true;
let dragStartPoint = null;
let currentPreviewEdge = null;
let dragEventHandlers = null;

const DIRECTION_LABELS = {
  lr: { name: 'Left ↔ Right', short: '↔', bar: 'lr' },
  tb: { name: 'Top ↔ Bottom', short: '↕', bar: 'tb' },
};

function resizeCanvas() {
  const container = document.getElementById('board-container');
  const rect = container.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  canvas.width = size;
  canvas.height = size;
  if (game) drawBoard(ctx, canvas, game);
}

function initGame(size) {
  game = createGame(size, size, winDirection, startingPlayer);
  startingPlayer = 1 - startingPlayer;
  messageEl.textContent = '';
  undoBtn.disabled = true;
  updateUI();
  resizeCanvas();
  updateDirectionBtn();

  if (aiEnabled && game.currentPlayer === aiPlayer) {
    setTimeout(() => startAIThinking(), 100);
  }
}

function updateScoreDisplay() {
  scoreBlueEl.textContent = scoreBlue;
  scoreGreenEl.textContent = scoreGreen;
}

function updateProgressDisplay() {
  const max = winDirection === 'lr' ? game.cols - 1 : game.rows - 1;
  const w0 = getProgress(game, 0);
  const w1 = getProgress(game, 1);
  const pct0 = max > 0 ? Math.round((w0 / max) * 100) : 0;
  const pct1 = max > 0 ? Math.round((w1 / max) * 100) : 0;
  progressBlueFill.style.width = Math.min(pct0, 100) + '%';
  progressGreenFill.style.width = Math.min(pct1, 100) + '%';
  progressBlueVal.textContent = w0 + '/' + max;
  progressGreenVal.textContent = w1 + '/' + max;
}

function updateUI() {
  undoBtn.disabled = game.moves.length === 0 || aiThinking;
  const dirLabel = DIRECTION_LABELS[winDirection].name;

  if (game.winner !== null) {
    if (game.winner === -1) {
      turnText.textContent = 'Draw!';
      turnText.style.cursor = 'default';
      turnDot.style.background = '#888';
      turnDot.style.boxShadow = '0 0 10px rgba(136,136,136,0.5)';
      messageEl.textContent = 'Board full — draw by progress!';
    } else {
      const name = game.winner === 0 ? 'Blue' : 'Green';
      turnText.textContent = `${name} wins!`;
      turnText.style.cursor = 'default';
      turnDot.style.background = game.winner === 0 ? '#3498DB' : '#2ECC71';
      turnDot.style.boxShadow = `0 0 10px ${game.winner === 0 ? '#3498DB' : '#2ECC71'}`;
      messageEl.textContent = `${name} connected ${dirLabel}!`;
    }
  } else {
    const name = game.currentPlayer === 0 ? 'Blue' : 'Green';
    const label = game.moves.length === 0 ? ' (first)' : ':';
    turnText.textContent = `${name}${label}`;
    turnText.style.cursor = game.moves.length === 0 ? 'pointer' : 'default';
    turnDot.style.background = game.currentPlayer === 0 ? '#3498DB' : '#2ECC71';
    turnDot.style.boxShadow = `0 0 8px ${game.currentPlayer === 0 ? '#3498DB' : '#2ECC71'}`;
    messageEl.textContent = '';
  }

  updateScoreDisplay();
  updateProgressDisplay();
}

function updateDirectionBtn() {
  const btn = document.getElementById('direction-toggle');
  btn.textContent = '⟳';
  btn.title = winDirection === 'lr' ? 'Switch to Top ↔ Bottom' : 'Switch to Left ↔ Right';
}

function afterPlaceEdge() {
  drawBoard(ctx, canvas, game);
  updateUI();

  if (game.winner !== null && game.winner >= 0) {
    if (game.scoredBy === -1) {
      game.scoredBy = game.winner;
      if (game.winner === 0) scoreBlue++;
      else scoreGreen++;
    } else if (game.scoredBy !== game.winner) {
      if (game.scoredBy === 0) scoreBlue--;
      else scoreGreen--;
      game.scoredBy = game.winner;
      if (game.winner === 0) scoreBlue++;
      else scoreGreen++;
    }
    updateScoreDisplay();
  }

  if (aiEnabled && !aiThinking && game.winner === null && game.currentPlayer === aiPlayer) {
    startAIThinking();
  }
}

function startAIThinking() {
  aiThinking = true;
  undoBtn.disabled = true;
  messageEl.textContent = '🤖 AI thinking...';

  scheduleAIMove(game, aiPlayer, aiDifficulty, (move) => {
    if (move) {
      placeEdge(game, move.row, move.col, move.orientation);
    }
    aiThinking = false;
    afterPlaceEdge();
  });
}

function handleBoardInteraction(e) {
  if (game.winner !== null || dragModeEnabled || aiThinking) return;

  const rect = canvas.getBoundingClientRect();
  let cx, cy;
  if (e.touches) {
    cx = e.touches[0].clientX;
    cy = e.touches[0].clientY;
    e.preventDefault();
  } else {
    cx = e.clientX;
    cy = e.clientY;
  }
  const x = cx - rect.left;
  const y = cy - rect.top;

  const edge = findEdgeAt(canvas, game, x, y);
  if (!edge) return;

  placeEdge(game, edge.row, edge.col, edge.orientation);
  afterPlaceEdge();
}

function setupDragEventHandlers() {
  if (!game || game.winner !== null) return;
  
  dragEventHandlers = {
    move: handleDragMove.bind(this),
    end: handleDragEnd.bind(this)
  };
  
  document.addEventListener('mousemove', dragEventHandlers.move);
  document.addEventListener('touchmove', dragEventHandlers.move, { passive: false });
  document.addEventListener('mouseup', dragEventHandlers.end);
  document.addEventListener('touchend', dragEventHandlers.end);
}

function cleanupDragEventHandlers() {
  if (dragEventHandlers) {
    document.removeEventListener('mousemove', dragEventHandlers.move);
    document.removeEventListener('touchmove', dragEventHandlers.move);
    document.removeEventListener('mouseup', dragEventHandlers.end);
    document.removeEventListener('touchend', dragEventHandlers.end);
    dragEventHandlers = null;
  }
  
  dragStartPoint = null;
  currentPreviewEdge = null;
}

function handleDragStart(e) {
  if (game.winner !== null || !dragModeEnabled || aiThinking) return;
  
  const rect = canvas.getBoundingClientRect();
  let startX, startY;
  
  if (e.touches) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    e.preventDefault();
  } else {
    startX = e.clientX;
    startY = e.clientY;
  }
  
  const x = startX - rect.left;
  const y = startY - rect.top;
  
  dragStartPoint = findNearestPoint(canvas, x, y);
  
  if (dragStartPoint) {
    currentPreviewEdge = null;
    canvas.classList.remove('grab');
    canvas.classList.add('dragging');
    setupDragEventHandlers();
  }
}

function isEdgeAdjacentToPoint(edge, point) {
  const { row, col, orientation } = edge;
  if (orientation === 'h') {
    return row === point.row && (col === point.col || col === point.col - 1);
  }
  if (orientation === 'v') {
    return col === point.col && (row === point.row || row === point.row - 1);
  }
  return false;
}

function handleDragMove(e) {
  if (!dragStartPoint || game.winner !== null) return;
  
  const rect = canvas.getBoundingClientRect();
  let currentX, currentY;
  
  if (e.touches) {
    currentX = e.touches[0].clientX;
    currentY = e.touches[0].clientY;
    e.preventDefault();
  } else {
    currentX = e.clientX;
    currentY = e.clientY;
  }
  
  const x = currentX - rect.left;
  const y = currentY - rect.top;
  
  const edge = findEdgeAt(canvas, game, x, y);
  const valid = edge && isEdgeAdjacentToPoint(edge, dragStartPoint);
  if (valid) currentPreviewEdge = edge;
  
  drawBoardWithPreview(ctx, canvas, game, dragStartPoint, currentPreviewEdge);
}

function handleDragEnd(e) {
  if (!dragStartPoint || game.winner !== null || aiThinking) return;
  
  const edge = currentPreviewEdge;
  
  canvas.classList.remove('dragging');
  canvas.classList.add('grab');
  cleanupDragEventHandlers();
  
  if (edge) {
    placeEdge(game, edge.row, edge.col, edge.orientation);
    afterPlaceEdge();
  } else {
    drawBoard(ctx, canvas, game);
  }
}

function toggleDragMode() {
  dragModeEnabled = !dragModeEnabled;
  localStorage.setItem('dragMode', dragModeEnabled ? '1' : '0');
  const btn = document.getElementById('mode-toggle');
  
  if (dragModeEnabled) {
    btn.classList.add('active');
    btn.textContent = 'Drag';
    canvas.classList.remove('dragging');
    canvas.classList.add('grab');
  } else {
    btn.classList.remove('active');
    btn.textContent = 'Click';
    canvas.classList.remove('dragging', 'grab');
    cleanupDragEventHandlers();
  }
  
  updateModeIndicator();
}

function loadDragMode() {
  const saved = localStorage.getItem('dragMode');
  if (saved === '0') {
    if (dragModeEnabled) toggleDragMode();
    else applyClickVisuals();
  } else if (saved === '1') {
    if (!dragModeEnabled) toggleDragMode();
    else applyDragVisuals();
  } else {
    localStorage.setItem('dragMode', '1');
    applyDragVisuals();
  }
}

function applyDragVisuals() {
  const btn = document.getElementById('mode-toggle');
  btn.classList.add('active');
  btn.textContent = 'Drag';
  canvas.classList.remove('dragging');
  canvas.classList.add('grab');
  updateModeIndicator();
}

function applyClickVisuals() {
  const btn = document.getElementById('mode-toggle');
  btn.classList.remove('active');
  btn.textContent = 'Click';
  canvas.classList.remove('dragging', 'grab');
  cleanupDragEventHandlers();
  updateModeIndicator();
}

function updateModeIndicator() {
  const messageEl = document.getElementById('message');
  if (dragModeEnabled) {
    messageEl.textContent = 'Drag: Click a dot and drag to an edge';
    messageEl.style.background = 'rgba(52, 152, 219, 0.1)';
  } else {
    messageEl.textContent = '';
    messageEl.style.background = 'transparent';
  }
}

function resetDragState() {
  cleanupDragEventHandlers();
  if (dragModeEnabled) {
    canvas.classList.remove('dragging');
    canvas.classList.add('grab');
  } else {
    canvas.classList.remove('dragging', 'grab');
  }
}

function toggleWinDirection() {
  const newDir = winDirection === 'lr' ? 'tb' : 'lr';
  winDirection = newDir;
  game.winDirection = newDir;
  localStorage.setItem('winDirection', winDirection);
  canvas.classList.add('rotating');
  rotateGameState(game);
  drawBoard(ctx, canvas, game);
  updateUI();
  updateDirectionBtn();
  resetDragState();
  setTimeout(() => canvas.classList.remove('rotating'), 250);
}

function loadWinDirection() {
  const saved = localStorage.getItem('winDirection');
  if (saved === 'lr' || saved === 'tb') {
    winDirection = saved;
  } else {
    winDirection = 'lr';
    localStorage.setItem('winDirection', 'lr');
  }
}

const aiToggle = document.getElementById('ai-toggle');
const aiDifficultySelect = document.getElementById('ai-difficulty');
const aiOptions = document.getElementById('ai-options');
const aiSideBtn = document.getElementById('ai-side-btn');

function toggleAI() {
  aiEnabled = !aiEnabled;
  if (aiEnabled) {
    aiToggle.textContent = 'On';
    aiToggle.classList.remove('off');
    aiToggle.classList.add('on');
    aiOptions.classList.remove('hidden');
    if (game && game.winner === null && game.currentPlayer === aiPlayer) {
      setTimeout(() => startAIThinking(), 100);
    }
  } else {
    aiToggle.textContent = 'Off';
    aiToggle.classList.remove('on');
    aiToggle.classList.add('off');
    aiOptions.classList.add('hidden');
  }
}

function changeAIDifficulty() {
  aiDifficulty = aiDifficultySelect.value;
}

function toggleHumanSide() {
  humanPlayer = 1 - humanPlayer;
  aiPlayer = 1 - humanPlayer;
  updateAISideButton();
  if (game) {
    initGame(parseInt(sizeSelect.value));
  }
}

function updateAISideButton() {
  aiSideBtn.textContent = humanPlayer === 0 ? 'Play as 🔵' : 'Play as 🟢';
}

function loadAIState() {
  if (aiEnabled && game && game.winner === null && game.currentPlayer === aiPlayer) {
    setTimeout(() => startAIThinking(), 100);
  }
}

aiToggle.addEventListener('click', toggleAI);
aiDifficultySelect.addEventListener('change', changeAIDifficulty);
aiSideBtn.addEventListener('click', toggleHumanSide);

// Event listeners
canvas.addEventListener('click', handleBoardInteraction);
canvas.addEventListener('touchstart', handleBoardInteraction, { passive: false });

canvas.addEventListener('mousedown', handleDragStart);
canvas.addEventListener('touchstart', handleDragStart, { passive: false });

document.getElementById('mode-toggle').addEventListener('click', toggleDragMode);
document.getElementById('direction-toggle').addEventListener('click', toggleWinDirection);

resetScoreBtn.addEventListener('click', () => {
  scoreBlue = 0;
  scoreGreen = 0;
  startingPlayer = 0;
  updateScoreDisplay();
  resetDragState();
});

turnText.addEventListener('click', () => {
  if (!game || game.moves.length !== 0 || game.winner !== null || aiThinking) return;
  game.currentPlayer = 1 - game.currentPlayer;
  startingPlayer = game.currentPlayer;
  updateUI();
  resetDragState();
  if (aiEnabled && game.currentPlayer === aiPlayer) {
    startAIThinking();
  }
});

undoBtn.addEventListener('click', () => {
  undoMove(game);
  drawBoard(ctx, canvas, game);
  updateUI();
  resetDragState();
});

newGameBtn.addEventListener('click', () => {
  initGame(parseInt(sizeSelect.value));
  resetDragState();
});

sizeSelect.addEventListener('change', () => {
  initGame(parseInt(sizeSelect.value));
  resetDragState();
});

window.addEventListener('resize', resizeCanvas);

const progressBar = document.getElementById('progress-bar');
const toggleProgressBtn = document.getElementById('toggle-progress-btn');

toggleProgressBtn.addEventListener('click', () => {
  const hidden = progressBar.classList.toggle('hidden');
  toggleProgressBtn.dataset.visible = hidden ? '0' : '1';
});

loadWinDirection();
initGame(parseInt(sizeSelect.value));
loadDragMode();
loadAIState();
