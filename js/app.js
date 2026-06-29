const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const turnText = document.getElementById('turn-text');
const turnDot = document.getElementById('turn-dot');
const messageEl = document.getElementById('message');
const newGameBtn = document.getElementById('new-game');
const sizeSelect = document.getElementById('size-select');
const undoBtn = document.getElementById('undo-btn');
const resetScoreBtn = document.getElementById('reset-score-btn');
const scoreAzulEl = document.getElementById('score-azul');
const scoreVermelhoEl = document.getElementById('score-vermelho');
const progressAzulFill = document.getElementById('progress-azul-fill');
const progressVermelhoFill = document.getElementById('progress-vermelho-fill');
const progressAzulVal = document.getElementById('progress-azul-val');
const progressVermelhoVal = document.getElementById('progress-vermelho-val');

let game = null;
let scoreAzul = 0;
let scoreVermelho = 0;

let dragModeEnabled = false;
let dragStartPoint = null;
let currentPreviewEdge = null;
let dragEventHandlers = null;

function resizeCanvas() {
  const container = document.getElementById('board-container');
  const rect = container.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  canvas.width = size;
  canvas.height = size;
  if (game) drawBoard(ctx, canvas, game);
}

function initGame(size) {
  game = createGame(size, size);
  messageEl.textContent = '';
  undoBtn.disabled = true;
  updateUI();
  resizeCanvas();
}

function updateScoreDisplay() {
  scoreAzulEl.textContent = scoreAzul;
  scoreVermelhoEl.textContent = scoreVermelho;
}

function updateProgressDisplay() {
  const max = game.cols - 1;
  const w0 = getProgress(game, 0);
  const w1 = getProgress(game, 1);
  const pct0 = max > 0 ? Math.round((w0 / max) * 100) : 0;
  const pct1 = max > 0 ? Math.round((w1 / max) * 100) : 0;
  progressAzulFill.style.width = Math.min(pct0, 100) + '%';
  progressVermelhoFill.style.width = Math.min(pct1, 100) + '%';
  progressAzulVal.textContent = w0 + '/' + max;
  progressVermelhoVal.textContent = w1 + '/' + max;
}

function updateUI() {
  undoBtn.disabled = game.moves.length === 0;

  if (game.winner !== null) {
    const name = game.winner === 0 ? 'Azul' : 'Vermelho';
    turnText.textContent = `${name} venceu!`;
    turnDot.style.background = game.winner === 0 ? '#3498DB' : '#E74C3C';
    messageEl.textContent = `${name} conectou Esquerda ↔ Direita!`;
  } else {
    const name = game.currentPlayer === 0 ? 'Azul' : 'Vermelho';
    turnText.textContent = `${name}: Esquerda ↔ Direita`;
    turnDot.style.background = game.currentPlayer === 0 ? '#3498DB' : '#E74C3C';
    messageEl.textContent = '';
  }

  updateScoreDisplay();
  updateProgressDisplay();
}

function handleBoardInteraction(e) {
  if (game.winner !== null || dragModeEnabled) return;

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
  if (game.winner !== null) {
    if (game.scoredBy === -1) {
      game.scoredBy = game.winner;
      if (game.winner === 0) scoreAzul++;
      else scoreVermelho++;
    } else if (game.scoredBy !== game.winner) {
      if (game.scoredBy === 0) scoreAzul--;
      else scoreVermelho--;
      game.scoredBy = game.winner;
      if (game.winner === 0) scoreAzul++;
      else scoreVermelho++;
    }
  }
  drawBoard(ctx, canvas, game);
  updateUI();
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
  if (game.winner !== null || !dragModeEnabled) return;
  
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
    canvas.classList.add('dragging');
    setupDragEventHandlers();
  }
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
  currentPreviewEdge = edge;
  
  drawBoardWithPreview(ctx, canvas, game, dragStartPoint, edge);
}

function handleDragEnd(e) {
  if (!dragStartPoint || game.winner !== null) return;
  
  const edge = currentPreviewEdge;
  
  if (edge) {
    placeEdge(game, edge.row, edge.col, edge.orientation);
    updateGameState();
  }
  
  canvas.classList.remove('dragging');
  cleanupDragEventHandlers();
  drawBoard(ctx, canvas, game);
}

function updateGameState() {
  drawBoard(ctx, canvas, game);
  updateUI();
  
  if (game.winner !== null) {
    if (game.scoredBy === -1) {
      game.scoredBy = game.winner;
      if (game.winner === 0) scoreAzul++;
      else scoreVermelho++;
    } else if (game.scoredBy !== game.winner) {
      if (game.scoredBy === 0) scoreAzul--;
      else scoreVermelho--;
      game.scoredBy = game.winner;
      if (game.winner === 0) scoreAzul++;
      else scoreVermelho++;
    }
    updateScoreDisplay();
  }
}

function toggleDragMode() {
  dragModeEnabled = !dragModeEnabled;
  const modeDragBtn = document.getElementById('mode-drag');
  const modeToggleBtn = document.getElementById('mode-toggle');
  
  if (dragModeEnabled) {
    modeDragBtn.classList.add('active');
    modeToggleBtn.classList.remove('active');
    canvas.classList.add('dragging');
  } else {
    modeDragBtn.classList.remove('active');
    modeToggleBtn.classList.add('active');
    canvas.classList.remove('dragging');
    cleanupDragEventHandlers();
  }
  
  updateModeIndicator();
}

function updateModeIndicator() {
  const messageEl = document.getElementById('message');
  if (dragModeEnabled) {
    messageEl.textContent = 'Arraste: Clique num ponto e arraste para uma aresta';
    messageEl.style.background = 'rgba(52, 152, 219, 0.1)';
  } else {
    messageEl.textContent = '';
    messageEl.style.background = 'transparent';
  }
}

function resetDragState() {
  cleanupDragEventHandlers();
  dragModeEnabled = false;
  const modeDragBtn = document.getElementById('mode-drag');
  const modeToggleBtn = document.getElementById('mode-toggle');
  modeDragBtn.classList.remove('active');
  modeToggleBtn.classList.add('active');
  canvas.classList.remove('dragging');
}

// Event listeners
canvas.addEventListener('click', handleBoardInteraction);
canvas.addEventListener('touchstart', handleBoardInteraction, { passive: false });

canvas.addEventListener('mousedown', handleDragStart);
canvas.addEventListener('touchstart', handleDragStart, { passive: false });

const modeToggleBtn = document.getElementById('mode-toggle');
const modeDragBtn = document.getElementById('mode-drag');
modeToggleBtn.addEventListener('click', () => {
  if (dragModeEnabled) toggleDragMode();
});
modeDragBtn.addEventListener('click', toggleDragMode);

resetScoreBtn.addEventListener('click', () => {
  scoreAzul = 0;
  scoreVermelho = 0;
  updateScoreDisplay();
  resetDragState();
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

initGame(parseInt(sizeSelect.value));
