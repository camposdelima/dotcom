function cloneGame(game) {
  return {
    rows: game.rows,
    cols: game.cols,
    winDirection: game.winDirection,
    currentPlayer: game.currentPlayer,
    winner: null,
    winningPath: null,
    winningEdges: null,
    horizontalEdges: game.horizontalEdges.map(row => [...row]),
    verticalEdges: game.verticalEdges.map(row => [...row]),
    moves: game.moves.map(m => ({ ...m })),
    scoredBy: -1,
  };
}

function getLegalMoves(game) {
  const moves = [];
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols - 1; c++) {
      if (game.horizontalEdges[r][c] === null && isEdgeAllowed(game, r, c, 'h', game.currentPlayer)) {
        moves.push({ row: r, col: c, orientation: 'h' });
      }
    }
  }
  for (let r = 0; r < game.rows - 1; r++) {
    for (let c = 0; c < game.cols; c++) {
      if (game.verticalEdges[r][c] === null && isEdgeAllowed(game, r, c, 'v', game.currentPlayer)) {
        moves.push({ row: r, col: c, orientation: 'v' });
      }
    }
  }
  return moves;
}

function hasAdjacentEdgeForPlayer(game, move, player) {
  const { row, col, orientation } = move;
  if (orientation === 'h') {
    if (row > 0 && game.verticalEdges[row - 1][col] === player) return true;
    if (row < game.rows - 1 && game.verticalEdges[row][col] === player) return true;
    if (row > 0 && game.verticalEdges[row - 1][col + 1] === player) return true;
    if (row < game.rows - 1 && game.verticalEdges[row][col + 1] === player) return true;
    if (col > 0 && game.horizontalEdges[row][col - 1] === player) return true;
    if (col < game.cols - 2 && game.horizontalEdges[row][col + 1] === player) return true;
  } else {
    if (col > 0 && game.horizontalEdges[row][col - 1] === player) return true;
    if (col < game.cols - 1 && game.horizontalEdges[row][col] === player) return true;
    if (col > 0 && game.horizontalEdges[row + 1][col - 1] === player) return true;
    if (col < game.cols - 1 && game.horizontalEdges[row + 1][col] === player) return true;
    if (row > 0 && game.verticalEdges[row - 1][col] === player) return true;
    if (row < game.rows - 2 && game.verticalEdges[row + 1][col] === player) return true;
  }
  return false;
}

function getSmartRolloutMove(game) {
  const moves = getLegalMoves(game);
  if (moves.length <= 1) return moves[0] || null;

  const player = game.currentPlayer;
  const opponent = 1 - player;

  for (const move of moves) {
    const test = cloneGame(game);
    placeEdge(test, move.row, move.col, move.orientation);
    if (test.winner === player) return move;
  }

  const selfAdj = [];
  const oppAdj = [];
  const rest = [];

  for (const move of moves) {
    const adjSelf = hasAdjacentEdgeForPlayer(game, move, player);
    const adjOpp = hasAdjacentEdgeForPlayer(game, move, opponent);
    if (adjSelf) selfAdj.push(move);
    else if (adjOpp) oppAdj.push(move);
    else rest.push(move);
  }

  const r = Math.random();
  if (selfAdj.length > 0 && r < 0.45) {
    return selfAdj[Math.floor(Math.random() * selfAdj.length)];
  }
  if (oppAdj.length > 0 && r < 0.70) {
    return oppAdj[Math.floor(Math.random() * oppAdj.length)];
  }
  if (rest.length > 0) {
    return rest[Math.floor(Math.random() * rest.length)];
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

function simulate(game) {
  const cloned = cloneGame(game);
  let limit = 10000;
  while (cloned.winner === null && limit-- > 0) {
    const move = getSmartRolloutMove(cloned);
    if (!move) break;
    placeEdge(cloned, move.row, move.col, move.orientation);
  }
  return cloned.winner;
}

function evaluatePosition(game, player) {
  if (game.winner === player) return 1;
  if (game.winner !== null) return 0;

  const maxProgress = game.winDirection === 'lr' ? game.cols - 1 : game.rows - 1;
  if (maxProgress <= 0) return 0.5;

  const myProgress = getProgress(game, player);
  const oppProgress = getProgress(game, 1 - player);

  const diff = (myProgress - oppProgress) / maxProgress;
  return Math.max(0, Math.min(1, 0.5 + diff * 0.5));
}

class MCTSNode {
  constructor(move, playerToMove) {
    this.move = move;
    this.playerToMove = playerToMove;
    this.parent = null;
    this.children = [];
    this.visits = 0;
    this.wins = 0;
    this.untriedMoves = null;
  }

  addChild(move) {
    const child = new MCTSNode(move, 1 - this.playerToMove);
    child.parent = this;
    this.children.push(child);
    return child;
  }

  selectChild(aiPlayer) {
    const isAITurn = this.playerToMove === aiPlayer;
    return this.children.reduce((best, c) => {
      const score = c.ucb1Score(aiPlayer);
      const better = isAITurn ? score > best.ucb1Score(aiPlayer) : score < best.ucb1Score(aiPlayer);
      return better ? c : best;
    });
  }

  ucb1Score() {
    if (this.visits === 0) return Infinity;
    if (!this.parent) return 0;
    const exploitation = this.wins / this.visits;
    const exploration = Math.sqrt(2 * Math.log(this.parent.visits) / this.visits);
    return exploitation + exploration;
  }

  bestChild() {
    return this.children.reduce((best, c) => c.visits > best.visits ? c : best);
  }

  isFullyExpanded() {
    if (this.untriedMoves === null) return false;
    return this.untriedMoves.length === 0;
  }
}

function runMCTSOnce(rootNode, game, aiPlayer) {
  const cloned = cloneGame(game);
  const path = [rootNode];
  let node = rootNode;

  while (node.children.length > 0 && node.isFullyExpanded()) {
    node = node.selectChild(aiPlayer);
    if (!node) break;
    placeEdge(cloned, node.move.row, node.move.col, node.move.orientation);
    path.push(node);
  }

  if (cloned.winner === null) {
    if (node.untriedMoves === null) {
      node.untriedMoves = getLegalMoves(cloned);
      node.untriedMoves = node.untriedMoves.filter(m =>
        !node.children.some(c =>
          c.move.row === m.row && c.move.col === m.col && c.move.orientation === m.orientation
        )
      );
    }

    if (node.untriedMoves.length > 0) {
      const move = node.untriedMoves.pop();
      placeEdge(cloned, move.row, move.col, move.orientation);
      node = node.addChild(move);
      path.push(node);
    }
  }

  const value = evaluatePosition(cloned, aiPlayer);

  for (const n of path) {
    n.visits++;
    n.wins += value;
  }
}

function getIterations(difficulty) {
  const counts = { easy: 2000, medium: 6500, hard: 7500 };
  return counts[difficulty] || 2000;
}

function scheduleAIMove(game, aiPlayer, difficulty, onComplete) {
  const total = getIterations(difficulty);
  const rootNode = new MCTSNode(null, game.currentPlayer);
  let completed = 0;

  function processChunk() {
    const start = performance.now();
    while (completed < total && performance.now() - start < 50) {
      runMCTSOnce(rootNode, game, aiPlayer);
      completed++;
    }
    if (completed < total) {
      setTimeout(processChunk, 16);
    } else {
      const best = rootNode.children.length > 0 ? rootNode.bestChild() : null;
      onComplete(best ? best.move : null);
    }
  }

  setTimeout(processChunk, 50);
}
