const COLORS = {
  blue: '#3498DB',
  blueGlow: 'rgba(52,152,219,0.25)',
  blueWin: '#5DADE2',
  red: '#E74C3C',
  redGlow: 'rgba(231,76,60,0.25)',
  redWin: '#EC7063',
  dot: '#2C3E50',
  bg: '#F4F6F7',
  sideBlue: 'rgba(52,152,219,0.12)',
  sideRed: 'rgba(231,76,60,0.12)',
};

function computeLayout(canvas, game) {
  const w = canvas.width;
  const h = canvas.height;
  const pad = w * 0.07;
  const cell = Math.min(
    (w - 2 * pad) / (game.cols - 1),
    (h - 2 * pad) / (game.rows - 1)
  );
  const gridW = cell * (game.cols - 1);
  const gridH = cell * (game.rows - 1);
  return {
    cell,
    ox: (w - gridW) / 2,
    oy: (h - gridH) / 2,
  };
}

function pointPos(layout, row, col) {
  return {
    x: layout.ox + col * layout.cell,
    y: layout.oy + row * layout.cell,
  };
}

function drawBoard(ctx, canvas, game) {
  const layout = computeLayout(canvas, game);
  const { cell, ox, oy } = layout;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, w, h);

  const barW = 5;
  const gridTop = oy;
  const gridLeft = ox;
  const gridRight = ox + cell * (game.cols - 1);
  const gridBottom = oy + cell * (game.rows - 1);

  ctx.fillStyle = COLORS.sideBlue;
  ctx.fillRect(gridLeft - 8, gridTop, barW, gridBottom - gridTop);
  ctx.fillRect(gridRight + 3, gridTop, barW, gridBottom - gridTop);

  ctx.fillStyle = COLORS.sideRed;
  ctx.fillRect(gridLeft - 4, gridTop, barW, gridBottom - gridTop);
  ctx.fillRect(gridRight + 9, gridTop, barW, gridBottom - gridTop);

  function drawEdge(r, c, orient, color, width) {
    const p1 = pointPos(layout, r, c);
    const p2 = orient === 'h'
      ? pointPos(layout, r, c + 1)
      : pointPos(layout, r + 1, c);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  const edgeW = Math.max(4, cell * 0.1);

  ctx.setLineDash([4, 5]);
  const dottedW = Math.max(1.5, cell * 0.03);
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols - 1; c++) {
      if (game.horizontalEdges[r][c] !== null) continue;
      if (!isEdgeAllowed(game, r, c, 'h', game.currentPlayer)) continue;
      drawEdge(r, c, 'h', 'rgba(44,62,80,0.2)', dottedW);
    }
  }
  for (let r = 0; r < game.rows - 1; r++) {
    for (let c = 0; c < game.cols; c++) {
      if (game.verticalEdges[r][c] !== null) continue;
      if (!isEdgeAllowed(game, r, c, 'v', game.currentPlayer)) continue;
      drawEdge(r, c, 'v', 'rgba(44,62,80,0.2)', dottedW);
    }
  }
  ctx.setLineDash([]);

  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols - 1; c++) {
      const val = game.horizontalEdges[r][c];
      if (val === null) continue;
      drawEdge(r, c, 'h', val === 0 ? COLORS.blue : COLORS.red, edgeW);
    }
  }

  for (let r = 0; r < game.rows - 1; r++) {
    for (let c = 0; c < game.cols; c++) {
      const val = game.verticalEdges[r][c];
      if (val === null) continue;
      drawEdge(r, c, 'v', val === 0 ? COLORS.blue : COLORS.red, edgeW);
    }
  }

  if (game.winningEdges) {
    const hlColor = game.winner === 0 ? COLORS.blueWin : COLORS.redWin;
    ctx.shadowColor = game.winner === 0 ? COLORS.blue : COLORS.red;
    ctx.shadowBlur = 10;
    for (const e of game.winningEdges) {
      drawEdge(e.row, e.col, e.orientation, hlColor, edgeW + 4);
      drawEdge(e.row, e.col, e.orientation, hlColor, edgeW);
    }
    ctx.shadowBlur = 0;
  }

  const dotR = Math.max(3.5, cell * 0.045);
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      const p = pointPos(layout, r, c);
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.dot;
      ctx.fill();
    }
  }
}

function findEdgeAt(canvas, game, px, py) {
  const layout = computeLayout(canvas, game);
  const threshold = Math.max(18, layout.cell * 0.28);
  let best = null;
  let bestDist = threshold + 1;

  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols - 1; c++) {
      if (game.horizontalEdges[r][c] !== null) continue;
      if (!isEdgeAllowed(game, r, c, 'h', game.currentPlayer)) continue;
      const p1 = pointPos(layout, r, c);
      const p2 = pointPos(layout, r, c + 1);
      const dist = distToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = { orientation: 'h', row: r, col: c };
      }
    }
  }

  for (let r = 0; r < game.rows - 1; r++) {
    for (let c = 0; c < game.cols; c++) {
      if (game.verticalEdges[r][c] !== null) continue;
      if (!isEdgeAllowed(game, r, c, 'v', game.currentPlayer)) continue;
      const p1 = pointPos(layout, r, c);
      const p2 = pointPos(layout, r + 1, c);
      const dist = distToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = { orientation: 'v', row: r, col: c };
      }
    }
  }

  return best;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function findNearestPoint(canvas, px, py) {
  const layout = computeLayout(canvas, game);
  let nearest = null;
  let nearestDist = Infinity;
  const threshold = layout.cell * 0.5;
  
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      const p = pointPos(layout, r, c);
      const dist = Math.hypot(px - p.x, py - p.y);
      
      if (dist < nearestDist && dist < threshold) {
        nearestDist = dist;
        nearest = { row: r, col: c, x: p.x, y: p.y };
      }
    }
  }
  
  return nearest;
}

function drawBoardWithPreview(ctx, canvas, game, startPoint, previewEdge) {
  drawBoard(ctx, canvas, game);
  
  if (startPoint && previewEdge) {
    const layout = computeLayout(canvas, game);
    const startPos = pointPos(layout, startPoint.row, startPoint.col);
    const endPos = previewEdge.orientation === 'h'
      ? pointPos(layout, previewEdge.row, previewEdge.col + 1)
      : pointPos(layout, previewEdge.row + 1, previewEdge.col);
    
    ctx.setLineDash([5, 5]);
    const previewColor = game.currentPlayer === 0 ? COLORS.blue : COLORS.red;
    ctx.strokeStyle = previewColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.8;
    
    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);
    ctx.lineTo(endPos.x, endPos.y);
    ctx.stroke();
    
    ctx.globalAlpha = 1.0;
    ctx.setLineDash([]);
    
    ctx.fillStyle = previewColor;
    ctx.shadowColor = previewColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(startPos.x, startPos.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
