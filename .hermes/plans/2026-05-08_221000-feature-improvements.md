# Feature Improvements — Responsive Scaling, AI, Visual Effects

## Goal
Enhance the cyberpunk-pong game with three feature areas: responsive canvas scaling for extreme aspect ratios, more interesting AI behavior, and visual polish (screen flash on score, improved particles).

## Current Context
- Canvas already handles DPR scaling via resize() but game elements (paddles, ball, power-ups) use fixed pixel sizes that don't scale with viewport — tiny on large screens, huge on small ones.
- AI has 3 difficulty levels (easy/normal/hard) with reaction/maxSpeedPct/error/awareness params. AI always targets ball directly with some error — no personality or anticipation.
- Particles exist but are simple circles. Screen shake exists. No flash/color pulse on score events or win.

## Proposed Changes

### Phase 1: Responsive Canvas Scaling
**Files**: lib/engine.js, lib/render.js

Currently paddle width (14px), ball radius (8px), paddle speed (720), initial ball speed (420), power-up size (62px), and grid spacing (60px) are all fixed — they don't adapt to canvas dimensions.

- Add a `NP.scale` factor derived from `min(state.width, state.height) / 800` (800 = design reference)
- Make paddle width, ball radius, paddle speed, ball speed, grid spacing, power-up size reference `NP.scale`
- This makes the game play identically on phone, tablet, and desktop

### Phase 2: AI Personality & Anticipation
**Files**: lib/logic.js

Current AI tracks ball position with error/noise. Add:
- **Anticipation**: AI projects ball position further ahead (accounting for paddle hits on walls)
- **Recovery**: When ball is moving away, AI drifts toward center instead of freezing
- **Aggression bonus**: Hard AI gets a slight speed bonus when ball is close

### Phase 3: Visual Polish — Score Flash & Particle Upgrades
**Files**: lib/render.js, lib/logic.js

- **Score flash**: Brief white flash overlay on scoring (0.15s duration)
- **Particle sparkle**: Particles get a slight size pulse and varying alpha on spawn
- **Win particles**: Grander particle burst on game win

## Files to Change
- lib/engine.js — add scale factor, responsive constants
- lib/render.js — score flash, particle upgrades, resize uses scale
- lib/logic.js — AI improvements

## Verification
- `node tools/smoke-test.js` — all 4 tests pass
- Open in browser — game looks proportionally correct at different window sizes
- AI behavior changes are noticeable but not broken
