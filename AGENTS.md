# Repository Guidelines

## Project Structure

```
cyberpunk-pong/
├── index.html          # Game HTML with CRT overlay, menus, HUD, and screens
├── game.js             # Single-file game engine: physics, audio, rendering, AI (~1230 lines)
├── style.css           # Cyberpunk neon theme, glassmorphic UI, responsive styles
├── tools/
│   └── smoke-test.js   # Node.js smoke tests for AI difficulty, power-ups, and configuration
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Actions → GitHub Pages deploy on push to main
└── README.md           # Feature list, controls, setup, and deployment instructions
```

All game logic lives in `game.js`. It's an IIFE — no modules, no build step. UI markup is in `index.html`; styles are in `style.css`.

## Running Locally

No setup required. Open `index.html` in any modern browser:

```bash
open index.html
# or serve it:
python3 -m http.server 8080
```

## Testing

Run the smoke tests with Node.js (no dependencies):

```bash
node tools/smoke-test.js
```

Tests verify AI difficulty ordering, power-up system functionality, and configuration bounds.

## Coding Style

- **No framework, no build step** — vanilla HTML5 Canvas, CSS3, and ES6+
- Single IIFE with `'use strict'` in `game.js`
- Constants defined at the top (e.g. `WIN_SCORE`, `BALL_RADIUS`, `DIFFICULTY`)
- Sections separated by block comment headers (e.g. `/* == DOM References == */`)
- All numeric values configurable as top-level constants — **do not** scatter magic numbers
- Arrow functions for iteration (`forEach`, `map`); regular `function()` for named exports

## Architecture Overview

| Layer | What it handles |
|---|---|
| `AudioEngine` (IIFE) | Procedural synthwave bassline + arpeggio via Web Audio oscillators; synthesized SFX (hits, scores, wins) |
| `loop()` | `requestAnimationFrame` driver; delta-time capped at 50 ms |
| `update*()` | Input → AI → paddle physics → ball physics → power-ups → effects → callouts |
| `draw*()` | Grid, center line, paddles, balls, trails, power-ups, particles, callouts |
| `recordGameResult()` | Persist to `localStorage` under key `neon-pong-save-v1`; leaderboard sorted by margin |

Power-ups affect paddles (mega/tiny), ball speed (turbo), bounce unpredictability (glitch), direction (reverse), and add extra balls (multiball).

## Commit Conventions

Commits follow a simple `descriptive sentence` style:

```
Fix paddle collision on right wall
Add turbo power-up effect
Improve AI awareness calculation
```

No conventional-commit prefixes required.

## Deployment

Push to `main` and GitHub Actions auto-deploys to GitHub Pages.

```bash
git add .
git commit -m "Your change"
git push origin main
```

## Areas for Improvement

- Split `game.js` into separate modules (engine, audio, power-ups, rendering) for readability and testability
- Add a `package.json` with linting (e.g. ESLint) and a proper test runner (e.g. Jest)
- Add a `sound` power-up type (currently referenced in code but never spawned)
- Replace hardcoded `POWER_UP_WARNING_LIFE` and `CALLOUT_LIFE` with more discoverable constants
