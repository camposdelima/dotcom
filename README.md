# DotCom — Connection Game

Two players, one device. Connect your sides before your opponent!

Both connect **Left ↔ Right** (or **Top ↔ Bottom**)

Each player draws lines between adjacent points on the grid. The first to form a continuous path from one edge to the other wins.

## How to Play

1. Open `index.html` in your browser (mobile or desktop)
2. Select the board size (5×5 to 11×11)
3. Tap/click a line between two points to draw it
4. Take turns with your opponent on the same device
5. Win by connecting your sides!

## Run

```
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

Or just open `index.html` directly (Live Server recommended in VS Code).

## Tech

HTML5 + CSS3 + JavaScript vanilla. No external dependencies.

## Features

- Adjustable board (5×5 to 11×11)
- Undo anytime (even after a win)
- Persistent scoreboard across matches
- Reset score button
- Rotate board 90° (toggles win direction)
- Drag or click mode
- Alternating starting player
- Cross-blocking rule (North/South blocks East/West and vice-versa)
