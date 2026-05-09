# Neon Pong

A modernized, cyberpunk-themed Pong game that runs entirely in the browser. Built with vanilla HTML5, CSS3, and JavaScript — no build step, no external assets, no dependencies.

**[Play Now](https://sxy5007-ops.github.io/neon-pong/)**

## Features

- **Cyberpunk Neon Visuals** — glowing paddles, animated grid, CRT scanlines, particle explosions, screen shake, ball trails
- **Procedural Synthwave Music** — background music generated in real-time using the Web Audio API (oscillators, filters, arpeggios)
- **Synthesized SFX** — paddle hits, wall bounces, scores, and win jingles all generated procedurally
- **Smart AI Opponent** — three difficulty levels (Easy / Normal / Hard) with human-like reaction delay and prediction error
- **Chaotic Power-Ups** — frequent drifting pickups with warning pulses, collection callouts, paddle buffs, opponent debuffs, freeze, glitch bounces, turbo ball, multiball bursts, and sonic pulse
- **1P vs AI & 2P Local Modes** — challenge the AI or play head-to-head on the same keyboard / device
- **Responsive Controls** — keyboard (W/S, Arrow keys), mouse tracking, and touch (mobile-friendly split-screen zones)
- **Glassmorphic UI** — neon menus, pause overlay, game over screen
- **Lightweight** — under 50 KB, zero external network requests

## Controls

| Action | Input |
|---|---|
| P1 Up | W or Mouse Up |
| P1 Down | S or Mouse Down |
| P2 Up | Arrow Up |
| P2 Down | Arrow Down |
| Pause / Resume | P or Esc |
| Mute | Speaker icon (HUD / Menu) |
| Touch | Drag left/right half of screen |

## Local Development

Simply open `index.html` in any modern browser:

```bash
open index.html
```

Or serve it with any static file server:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

The game is split into modular IIFE files under `lib/` (engine, audio, powerups, render, logic) plus a `main.js` entry point — all loaded via `<script>` tags in `index.html` in dependency order. No build step required.

### npm Scripts

The project includes a `package.json` with linting and test scripts:

```bash
# Run smoke tests (AI difficulty, power-ups, configuration bounds)
npm test

# Run ESLint on all source files
npm run lint
```

No dependency installation needed for basic use — `npm test` runs the standalone `tools/smoke-test.js`. Install ESLint with `npm install` if you want to use `npm run lint`.

## Deployment

Push to `main` and the included `.github/workflows/deploy.yml` automatically deploys to GitHub Pages:

```bash
git add .
git commit -m "Your change"
git push origin main
```

Then go to **Settings > Pages** and set the source to "GitHub Actions".

## Tech Stack

- HTML5 Canvas 2D
- Vanilla JavaScript (ES6+)
- CSS3 (flexbox, backdrop-filter, animations)
- Web Audio API (procedural audio synthesis)
- GitHub Actions (CI/CD to GitHub Pages)

## Performance

- Targets **60 FPS** via `requestAnimationFrame`
- Delta-time physics for consistent speed across refresh rates
- Particle cap and efficient trail management

## License

MIT

---

Built with neon and caffeine.
