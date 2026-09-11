# Tic-tac-toe
# X & O — Futuristic Tic-Tac-Toe

A premium, cyberpunk-themed take on classic tic-tac-toe. Built with plain HTML, CSS, and JavaScript — no frameworks, no build step, no dependencies.

![mode](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JS-00E5FF) ![status](https://img.shields.io/badge/status-complete-22C55E)

## Features

- **Two game modes** — Player vs Player, or Player vs Computer
- **Three AI difficulties**
  - **Easy** — mostly random moves
  - **Medium** — blocks and takes obvious wins, otherwise plays loosely
  - **Hard** — unbeatable, powered by full minimax search
- **Glassmorphic neon UI** — dark cyberpunk theme with glowing cyan (X) and pink (O) marks
- **Animated background** — drifting grid, floating glow orbs, and a particle canvas
- **Live scoreboard** — tracks X wins, O wins, and draws, with a running win streak
- **Winning-line animation** — an SVG line draws itself across the winning combination
- **Win/draw modal** — styled result screen with a "Play Again" action
- **Confetti celebration** — canvas-based burst when a game is won
- **Sound effects** — generated in-browser with the Web Audio API (no audio files needed)
- **Reset confirmation** — guards against accidentally wiping the scoreboard
- **Fully responsive** — works cleanly on mobile, tablet, and desktop with touch-friendly cells

## Getting started

No build tools or installation required.

1. Download or clone this repository.
2. Open `index.html` in any modern browser.

That's it — the game runs entirely client-side.

If you prefer serving it locally (recommended for consistent font/asset loading):

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then visit `http://localhost:8000`.

## Project structure

```
.
├── index.html   # Markup and structure
├── style.css    # Theme, layout, and animations
├── script.js    # Game logic, AI, sound, and effects
└── README.md
```

## How to play

1. Choose a mode: **Player vs Player** or **Player vs Computer**.
2. If playing against the computer, pick a difficulty: Easy, Medium, or Hard.
3. Tap or click a cell to place your mark. Players alternate turns automatically.
4. Three in a row (row, column, or diagonal) wins the round. A full board with no winner is a draw.
5. Use **New Game** to start the next round, or **Reset Score** to clear the scoreboard.
6. Toggle the speaker icon top-right to turn sound effects on or off.

## Tech notes

- **AI opponent**: implemented with the minimax algorithm for the Hard difficulty (mathematically unbeatable); Easy and Medium layer in randomness and simple heuristics on top of the same win/block detection.
- **No external assets**: all sound is synthesized with the Web Audio API, and all visuals (grid, glow, particles, confetti) are drawn with CSS and the Canvas API.
- **Accessibility**: respects `prefers-reduced-motion`, uses semantic buttons for interactive cells, and includes ARIA attributes on toggles and tabs.

## Customization

All core colors and design tokens live at the top of `style.css` as CSS variables:

```css
:root{
  --bg: #080B14;
  --x-color: #00E5FF;
  --o-color: #FF3CAC;
  --accent: #7C3AED;
  --win-glow: #22C55E;
  /* ...and more */
}
```

Change these to re-theme the entire game without touching the layout.

## License

Free to use, modify, and distribute for personal or commercial projects.
Made by shahid hussain
