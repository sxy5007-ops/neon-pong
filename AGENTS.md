# Repository Guidelines

## Project Structure

```
cyberpunk-pong/
├── index.html           # Game HTML with CRT overlay, menus, HUD, and screens
├── style.css            # Cyberpunk neon theme, glassmorphic UI, responsive styles
├── main.js              # Entry point: DOM binding, event listeners, initialization
├── lib/
│   ├── engine.js        # Core state, constants, save/load, paddle/ball factory functions
│   ├── audio.js         # Procedural synthwave music + SFX via Web Audio API
│   ├── powerups.js      # Power-up types, spawning, collection effects, callouts
│   ├── render.js        # Canvas drawing: grid, paddles, balls, trails, particles, CRT
│   └── logic.js         # Game loop, AI, input handling, paddle/ball physics, scoring
├── tools/
│   └── smoke-test.js    # Node.js smoke tests for AI difficulty, power-ups, and configuration
├── package.json         # npm scripts (lint, test) and ESLint dev dependency
├── .eslintrc.json       # ESLint configuration
├── .eslintignore        # ESLint ignore rules
├── .github/
│   └── workflows/
│       └── deploy.yml   # GitHub Actions → GitHub Pages deploy on push to main
└── README.md            # Feature list, controls, setup, and deployment instructions
```

Game logic is split across five IIFE modules in `lib/`, each extending the global `NP` namespace. `index.html` loads them in dependency order (`engine.js` → `audio.js` → `powerups.js` → `render.js` → `logic.js`), then `main.js` binds DOM events and starts the loop. No build step, no bundler — just vanilla ES6+.

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
- Modular IIFE pattern: each `lib/*.js` file wraps in `(function () { 'use strict'; ... })()` and attaches to the global `NP` namespace (`window.NP`)
- `engine.js` creates the `NP` namespace first; subsequent modules extend it (guarded by `if (!NP) return`)
- Constants defined in `engine.js` at top (e.g. `WIN_SCORE`, `BALL_RADIUS`, `DIFFICULTY`)
- Sections separated by block comment headers (e.g. `/* == DOM References == */`)
- All numeric values configurable as top-level constants — **do not** scatter magic numbers
- Arrow functions for iteration (`forEach`, `map`); regular `function()` for named exports

## Architecture Overview

| Layer | File | What it handles |
|-------|------|-----------------|
| `NP` namespace (state) | `lib/engine.js` | Constants, game state, save/load (`localStorage`), paddle/ball factory functions, shared utilities (`clamp`, `opponentOf`) |
| `NP.AudioEngine` | `lib/audio.js` | Procedural synthwave bassline + arpeggio via Web Audio oscillators; synthesized SFX (paddle hits, wall bounces, scores, wins, sonic pulse) |
| `NP.*` power-up logic | `lib/powerups.js` | Power-up types, timed effects (mega/tiny/turbo/glitch/reverse/freeze/multiball/sound), spawning with warning pulses, ball collection detection, callout system, effect timer decay |
| `NP.*` rendering | `lib/render.js` | Canvas drawing (grid, center line, paddles, balls, trails, power-ups, warnings, particles, callouts); shake effect, score flash, resize/DPR handling; effect pill UI |
| `NP.*` game logic | `lib/logic.js` | `requestAnimationFrame` loop (delta-time capped at 50 ms), AI opponent (3 difficulties with projection), input handling (keyboard/mouse/touch), paddle/ball physics, reflection with glitch/turbo, scoring and win detection, screen transitions |
| `NP.*` entry point | `main.js` | DOM references, event listener wiring, touch zone setup, initialization (`NP.resize()`, `NP.loop()`) |

Power-ups affect paddles (mega/tiny), ball speed (turbo), bounce unpredictability (glitch), direction (reverse), opponent freezing (freeze), and add extra balls (multiball). The sonic pulse (sound) pushes all balls toward the opponent's side with a screen shake and particle burst.

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

- Replace hardcoded `POWER_UP_WARNING_LIFE` and `CALLOUT_LIFE` with more discoverable constants
