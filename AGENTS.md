# DotCom — Project Context

## Description

Two-player connection game on the same device (mobile/desktop).  
Each player draws lines between points on a square grid. **Both** try to connect **Left ↔ Right** (or Top ↔ Bottom). Whoever completes a connection first wins.

Inspired by **Bridg-It** (Game of Gale / Shannon Switching Game), by David Gale and John Nash.

## Stack

- HTML5 + CSS3 + JavaScript vanilla (no frameworks)
- Canvas 2D for board rendering
- Mobile-first, responsive, touch events

## Structure

```
dotcom/
├── index.html          # Main page
├── AGENTS.md           # Agent context (this file)
├── README.md           # Project documentation
├── css/
│   └── style.css       # Dark theme, responsive
└── js/
    ├── game.js         # Game state, rules, win detection (BFS)
    ├── board.js        # Canvas rendering, edge click/touch detection
    ├── ai.js           # MCTS AI opponent (clone, rollout, UCB1 tree, chunked)
    └── app.js          # Initialization, events, UI updates
```

## Game Rules

1. Board: N×N grid of points (default 7×7)
2. Blue (player 0) starts by default, alternating each match
3. On your turn, tap/click an edge (line between two adjacent points) to mark it with your color
4. Occupied edges cannot be changed
5. If a player controls **North and South** of a point, the opponent cannot use **East or West** of that point (cross-block). Same if controlling **East and West** — the opponent is blocked from using **North or South** of that point
6. **Any player wins** by forming a continuous path of their edges from the leftmost column to the rightmost (or top to bottom if rotated)
7. The winning path is highlighted with a glow
8. Undo available (reverts move, keeps match history)
9. Scoreboard persists across matches, with a reset button

## Architecture

### game.js
- `createGame(rows, cols, winDirection, startingPlayer)` — creates game state
- `placeEdge(game, row, col, orientation)` — validates and places an edge, checks win, toggles turn
- `checkWin(game, player)` — BFS from the left/top edge, returns winning path (points + edges)
- `rotateGameState(game)` — rotates all edges and moves 90° clockwise
- `getProgress(game, player)` — calculates progress span for each player
- `undoMove(game)` — reverts last move, restores edge and turn, clears win state

### board.js
- `computeLayout(canvas, game)` — grid geometry (padding, cellSize, offset)
- `drawBoard(ctx, canvas, game)` — renders background, side indicators, edges, dots, winning path
- `findEdgeAt(canvas, game, px, py)` — finds nearest empty edge to a click/touch point
- `distToSegment(px, py, x1, y1, x2, y2)` — distance from point to line segment
- `findNearestPoint(canvas, x, y)` — finds nearest dot point
- `drawBoardWithPreview(ctx, canvas, game, startPoint, previewEdge)` — renders drag preview

### app.js
- Initializes game, resizes canvas (responsive), orchestrates click/touch events
- Updates UI: turn indicator, win message, scoreboard
- Controls undo, score reset, direction toggle, drag/click mode toggle
- Controls AI toggle, difficulty, side selection

### ai.js
- `cloneGame(game)` — deep clone for MCTS simulation
- `getLegalMoves(game)` — all currently legal (empty + allowed) edges
- `simulate(game)` — random rollout to completion, returns winner
- `MCTSNode` class — UCB1 tree with selection/expansion/evaluation/backprop
- `runMCTSOnce(rootNode, game, aiPlayer)` — single MCTS iteration
- `evaluatePosition(game, player)` — heuristic evaluation via `getProgress` (replaces random rollouts)
- `scheduleAIMove(game, aiPlayer, difficulty, onComplete)` — chunked MCTS (50ms chunks via setTimeout) to keep UI responsive; 2000/6500/7500 iterations for Easy/Medium/Hard (fixed, board-independent)

## Available Sizes

| Grid  | Difficulty | Edges |
|-------|-----------|-------|
| 5×5   | Expert    | 40    |
| 7×7   | Hard      | 84    |
| 9×9   | Medium    | 144   |
| 11×11 | Easy      | 220   |

## How to Run

Open `index.html` in any modern browser.  
On mobile, serve via local HTTP (e.g. `python -m http.server 8080`) or use a Live Server extension in VS Code.

## Playwright Testing

We use Playwright MCP tools for automated manual testing.

### HTTP Server (required)

```powershell
# Start in background (run once)
powershell "Start-Process -WindowStyle Hidden python '-m http.server 8080'"

# OR manually in a separate terminal
python -m http.server 8080
```

### Browser Cache

The browser often serves stale `app.js` from cache. Always use a cache buster:

```js
await page.goto('http://localhost:8080/?t=' + Date.now(), { waitUntil: 'networkidle' });
```

### Checking game state

`game` is declared with `let` (not `var`), so it is **not** on `window.game`. Use the DOM to verify state:

```js
const snap = await page.evaluate(() => {
  const undoBtn = document.getElementById('undo-btn');
  return {
    undoDisabled: undoBtn?.disabled,
    turn: document.querySelector('#info-bar span')?.textContent,
  };
});
```

To get canvas point coordinates:

```js
const rect = await page.locator('#canvas').boundingBox();
const coords = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const layout = computeLayout(c, game);
  const p = pointPos(layout, 0, 0);
  return { p, cell: layout.cell, ox: layout.ox, oy: layout.oy, w: c.width };
});
const pageX = rect.x + coords.p.x;
const pageY = rect.y + coords.p.y;
```

### Simulating drag

```js
await page.mouse.move(startPageX, startPageY);
await page.mouse.down();
await page.waitForTimeout(100);
await page.mouse.move(endPageX, endPageY, { steps: 10 });
await page.waitForTimeout(100);
await page.mouse.up();
await page.waitForTimeout(300);
```

The `steps` parameter makes the mouse pass through intermediate positions, essential for `handleDragMove` to find the edge during drag.

## Possible Next Steps

- [x] AI opponent (MCTS, chunked)
- [ ] Edge hover highlight (desktop)
- [ ] Retina/HiDPI support (devicePixelRatio)
- [x] Undo button
- [x] Scoreboard with reset
- [ ] Win animation screen
- [ ] PWA (manifest.json + service worker)
