function createGame(rows, cols, winDirection, startingPlayer) {
  const horizontalEdges = [];
  for (let r = 0; r < rows; r++) {
    horizontalEdges.push(new Array(cols - 1).fill(null));
  }
  const verticalEdges = [];
  for (let r = 0; r < rows - 1; r++) {
    verticalEdges.push(new Array(cols).fill(null));
  }
  return {
    rows, cols,
    winDirection: winDirection || 'lr',
    currentPlayer: startingPlayer || 0,
    winner: null,
    winningPath: null,
    winningEdges: null,
    horizontalEdges,
    verticalEdges,
    moves: [],
    scoredBy: -1,
  };
}

function hasNS(game, row, col, player) {
  if (row <= 0 || row >= game.rows - 1) return false;
  return game.verticalEdges[row - 1][col] === player
      && game.verticalEdges[row][col] === player;
}

function hasEW(game, row, col, player) {
  if (col <= 0 || col >= game.cols - 1) return false;
  return game.horizontalEdges[row][col - 1] === player
      && game.horizontalEdges[row][col] === player;
}

function isEdgeAllowed(game, row, col, orientation, player) {
  if (orientation === 'h') {
    return !hasNS(game, row, col, 1 - player)
        && !hasNS(game, row, col + 1, 1 - player);
  }
  return !hasEW(game, row, col, 1 - player)
      && !hasEW(game, row + 1, col, 1 - player);
}

function placeEdge(game, row, col, orientation) {
  if (game.winner !== null) return false;

  const edge = orientation === 'h'
    ? game.horizontalEdges[row][col]
    : game.verticalEdges[row][col];
  if (edge !== null) return false;
  if (!isEdgeAllowed(game, row, col, orientation, game.currentPlayer)) return false;

  if (orientation === 'h') {
    game.horizontalEdges[row][col] = game.currentPlayer;
  } else {
    game.verticalEdges[row][col] = game.currentPlayer;
  }
  game.moves.push({ row, col, orientation, player: game.currentPlayer });

  const result = checkWin(game, game.currentPlayer);
  if (result) {
    game.winner = game.currentPlayer;
    game.winningPath = result.points;
    game.winningEdges = result.edges;
    return true;
  }

  game.currentPlayer = 1 - game.currentPlayer;
  return true;
}

function checkWin(game, player) {
  const { rows, cols, winDirection } = game;
  const visited = new Set();
  const parent = new Map();
  const keyFn = (r, c) => r * cols + c;
  const queue = [];

  if (winDirection === 'lr') {
    for (let r = 0; r < rows; r++) {
      queue.push([r, 0]);
      visited.add(keyFn(r, 0));
      parent.set(keyFn(r, 0), null);
    }
  } else {
    for (let c = 0; c < cols; c++) {
      queue.push([0, c]);
      visited.add(keyFn(0, c));
      parent.set(keyFn(0, c), null);
    }
  }

  const isEnd = winDirection === 'lr'
    ? (r, c) => c === cols - 1
    : (r, c) => r === rows - 1;

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const k = keyFn(r, c);

    if (isEnd(r, c)) {
      const points = [];
      let cur = k;
      while (cur !== null) {
        const cr = Math.floor(cur / cols);
        const cc = cur % cols;
        points.unshift({ row: cr, col: cc });
        cur = parent.get(cur);
      }

      const edges = [];
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        if (b.row === a.row && b.col === a.col + 1) {
          edges.push({ orientation: 'h', row: a.row, col: a.col });
        } else if (b.row === a.row && b.col === a.col - 1) {
          edges.push({ orientation: 'h', row: a.row, col: b.col });
        } else if (b.row === a.row + 1 && b.col === a.col) {
          edges.push({ orientation: 'v', row: a.row, col: a.col });
        } else if (b.row === a.row - 1 && b.col === a.col) {
          edges.push({ orientation: 'v', row: b.row, col: a.col });
        }
      }

      return { points, edges };
    }

    if (c < cols - 1 && game.horizontalEdges[r][c] === player) {
      const nk = keyFn(r, c + 1);
      if (!visited.has(nk)) {
        visited.add(nk);
        parent.set(nk, k);
        queue.push([r, c + 1]);
      }
    }
    if (c > 0 && game.horizontalEdges[r][c - 1] === player) {
      const nk = keyFn(r, c - 1);
      if (!visited.has(nk)) {
        visited.add(nk);
        parent.set(nk, k);
        queue.push([r, c - 1]);
      }
    }
    if (r < rows - 1 && game.verticalEdges[r][c] === player) {
      const nk = keyFn(r + 1, c);
      if (!visited.has(nk)) {
        visited.add(nk);
        parent.set(nk, k);
        queue.push([r + 1, c]);
      }
    }
    if (r > 0 && game.verticalEdges[r - 1][c] === player) {
      const nk = keyFn(r - 1, c);
      if (!visited.has(nk)) {
        visited.add(nk);
        parent.set(nk, k);
        queue.push([r - 1, c]);
      }
    }
  }

  return null;
}

function getProgress(game, player) {
  const { rows, cols, winDirection } = game;
  const visited = new Set();
  const key = (r, c) => r * cols + c;
  let bestSpan = 0;

  for (let sr = 0; sr < rows; sr++) {
    for (let sc = 0; sc < cols; sc++) {
      if (visited.has(key(sr, sc))) continue;

      const hasEdge =
        (sc < cols - 1 && game.horizontalEdges[sr][sc] === player) ||
        (sc > 0 && game.horizontalEdges[sr][sc - 1] === player) ||
        (sr < rows - 1 && game.verticalEdges[sr][sc] === player) ||
        (sr > 0 && game.verticalEdges[sr - 1][sc] === player);

      if (!hasEdge && sc > 0) continue;

      const queue = [[sr, sc]];
      visited.add(key(sr, sc));
      let minC = sc, maxC = sc;
      let minR = sr, maxR = sr;

      while (queue.length) {
        const [r, c] = queue.shift();

        if (c < cols - 1 && game.horizontalEdges[r][c] === player) {
          const nk = key(r, c + 1);
          if (!visited.has(nk)) { visited.add(nk); queue.push([r, c + 1]); if (c + 1 > maxC) maxC = c + 1; }
        }
        if (c > 0 && game.horizontalEdges[r][c - 1] === player) {
          const nk = key(r, c - 1);
          if (!visited.has(nk)) { visited.add(nk); queue.push([r, c - 1]); if (c - 1 < minC) minC = c - 1; }
        }
        if (r < rows - 1 && game.verticalEdges[r][c] === player) {
          const nk = key(r + 1, c);
          if (!visited.has(nk)) { visited.add(nk); queue.push([r + 1, c]); if (r + 1 > maxR) maxR = r + 1; }
        }
        if (r > 0 && game.verticalEdges[r - 1][c] === player) {
          const nk = key(r - 1, c);
          if (!visited.has(nk)) { visited.add(nk); queue.push([r - 1, c]); if (r - 1 < minR) minR = r - 1; }
        }
      }

      const span = winDirection === 'lr' ? maxC - minC : maxR - minR;
      if (span > bestSpan) bestSpan = span;
    }
  }

  return bestSpan;
}

function rotateGameState(game) {
  const N = game.rows;
  const newH = [];
  const newV = [];
  for (let r = 0; r < N; r++) newH.push(new Array(N - 1).fill(null));
  for (let r = 0; r < N - 1; r++) newV.push(new Array(N).fill(null));

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N - 1; c++) {
      if (game.horizontalEdges[r][c] !== null) {
        newV[c][N - 1 - r] = game.horizontalEdges[r][c];
      }
    }
  }
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N; c++) {
      if (game.verticalEdges[r][c] !== null) {
        newH[c][N - 2 - r] = game.verticalEdges[r][c];
      }
    }
  }

  game.horizontalEdges = newH;
  game.verticalEdges = newV;

  for (const move of game.moves) {
    if (move.orientation === 'h') {
      const newRow = move.col;
      const newCol = N - 1 - move.row;
      move.orientation = 'v';
      move.row = newRow;
      move.col = newCol;
    } else {
      const newRow = move.col;
      const newCol = N - 2 - move.row;
      move.orientation = 'h';
      move.row = newRow;
      move.col = newCol;
    }
  }

  game.winner = null;
  game.winningPath = null;
  game.winningEdges = null;
  game.scoredBy = -1;
}

function undoMove(game) {
  if (game.moves.length === 0) return false;

  const move = game.moves.pop();
  if (move.orientation === 'h') {
    game.horizontalEdges[move.row][move.col] = null;
  } else {
    game.verticalEdges[move.row][move.col] = null;
  }

  game.currentPlayer = move.player;
  game.winner = null;
  game.winningPath = null;
  game.winningEdges = null;

  return true;
}
