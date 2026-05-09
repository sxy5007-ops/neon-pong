# Phase 6: Tooling, Power-ups & Documentation

## Goal
Tie up remaining loose ends: add project tooling (ESLint), implement the "sound" power-up, clean up hardcoded magic numbers, and update documentation to reflect the modularized architecture.

## Tasks

### T1: package.json + ESLint
**Files**: package.json, .eslintrc.json, lib/*.js, main.js, tools/smoke-test.js
**Description**: Add a `package.json` with ESLint and a loose config. Fix lint errors found across all JS files. Keep the config relaxed — no transpilation, no build step.
**Output**: `package.json`, `.eslintrc.json`, lint-fixed JS files

### T2: "Sonic Pulse" Sound Power-up
**Files**: lib/engine.js, lib/audio.js, lib/powerups.js
**Description**: Add a new power-up `sound` (label: SONIC, color: `#ff6b35` orange). When collected:
- Plays a deep sweep/fx via NP.AudioEngine
- Pushes all balls to the opponent's side (b.x > collector's side threshold by 150px)
- Spawns a big ring of particles in orange/gold
- Callout shows "P1 SONIC" / "P2 SONIC"
- No timed effect pill needed (instant effect, like multiball)
**Acceptance**: Collected power-up creates visible ball displacement + distinct audio

### T3: Escape Magic Numbers in powerups.js
**Files**: lib/powerups.js
**Description**: Replace hardcoded `78` and `72` in `updatePowerUps()` with `NP.scale`-based values:
- Line 85: `if (pu.y < 78 || pu.y > NP.state.height - 78)` → `80 * s` (already used in makePowerUp)
- Line 87: `pu.y = NP.clamp(pu.y, 72, NP.state.height - 72)` → `60 * s`
**Output**: Clean powerups.js without magic pixel values

### T4: Documentation Refresh
**Files**: AGENTS.md, README.md
**Description**: 
- Update AGENTS.md: reflect modular lib/ structure, remove references to game.js, add architecture diagram showing load order
- Update README.md: replace "shield" with "freeze" in features list, update repo URL, add package.json scripts section
**Output**: Updated docs

## Dependency Graph
```
T1 (tooling) ──→ T2, T3, T4 (unlocks ESLint baseline for quality)
All tasks are logically independent — can run in parallel after T1 creates the tooling baseline
```

## Verification
- `node tools/smoke-test.js` — all 4 tests pass
- `npx eslint lib/*.js main.js tools/smoke-test.js` — zero errors
- `open index.html` — game plays, sound power-up spawns and works
