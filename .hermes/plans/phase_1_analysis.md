# Phase 1 Analysis: Game.js Modularization Candidates

## Overview
This analysis identifies all functions, variables, and constants in `game.js` that should be moved to appropriate lib modules to achieve better separation of concerns.

## Current game.js Structure (824 lines)

### 1. DOM References (Lines 12-45)
**Should REMAIN in game.js** (View/Controller concerns):
- `canvas`, `ctx`
- `screens` object (menu, hud, pause, gameover)
- `ui` object (all DOM element references)

### 2. Constants & Config (Lines 47-108)
**MOVE to engine.js** (Pure data/configuration):
- `WIN_SCORE`, `PADDLE_WIDTH`, `PADDLE_HEIGHT_RATIO`, `BALL_RADIUS`
- `INITIAL_SPEED`, `SPEED_INCREMENT`, `MAX_SPEED`
- `POWER_UP_SIZE`, `POWER_UP_LIFE`, `POWER_UP_SPAWN_MIN/MAX`, `POWER_UP_WARNING_LIFE`, `CALLOUT_LIFE`
- `COLORS` object
- `DIFFICULTY` object
- `POWER_UP_TYPES` array
- `EFFECT_LABELS` object
- `SAVE_KEY`, `DEFAULT_SAVE`

### 3. Game State (Lines 113-149)
**MOVE to engine.js** (Core state management):
- `state` object (screen, mode, difficulty, muted, width/height, lastTime, shake, etc.)
- `paddles`, `ball`, `particles`, `trails`, `powerUps`, `powerUpWarnings`, `callouts`, `balls`
- `scores`, `saveData`, `powerUpTimer`, `lastHitBy`, `activeEffects`
- `input` object

### 4. Save Data & Leaderboards (Lines 154-231)
**MOVE to engine.js** (Data persistence):
- `loadSave()`
- `saveGameData()`
- `formatMode()`
- `renderLeaderboard()`
- `updateSaveUI()`
- `recordGameResult()`

### 5. Entity Creation (Lines 256-265, 412-436)
**MOVE to engine.js** (Factories belong with state):
- `resetBall(winner)`
- `startRound(winner)`
- `clamp(val, min, max)` - Utility function
- `makePowerUp()`
- `makePowerUpWarning()`

### 6. Physics & Game Logic (Lines 271-404)
**MOVE to logic.js** (Core gameplay mechanics):
- `updatePaddle(p, dt)`
- `getPaddleHeight(owner)`
- `getPaddleSpeed(owner, baseSpeed)`
- `opponentOf(owner)`
- `reflectBallFor(b, paddle)`
- `reflectBall(paddle)`
- `updateOneBall(b, dt)`
- `updateBall(dt)`

### 7. Power-up Management (Lines 438-469)
**MOVE to powerups.js** (Power-up specific logic):
- `applyTimedEffect(owner, effect, duration)`
- `applyPowerUp(owner, type)`

### 8. Power-up Updates (Lines 471-519)
**MOVE to powerups.js** (Power-up lifecycle):
- `updatePowerUps(dt)` - Entire function

### 9. Visual Effects (Lines 522-561)
**SPLIT:**
- `updateCallouts(dt)` → **logic.js** (UI timing)
- `tickEffectBucket(bucket, dt)` → **engine.js** (Utility)
- `updateEffects(dt)` → **logic.js** (Effect timing)
- `addEffectPill(items, owner, effect, time)` → **render.js** (UI creation)
- `updateEffectUI()` → **render.js** (DOM manipulation)

### 10. AI (Lines 563-581)
**MOVE to logic.js** (Gameplay logic):
- `updateAI(dt)`

### 11. Input Handling (Lines 583-619)
**MOVE to logic.js** (Input processing):
- `updateInput(dt)`

### 12. Win Conditions (Lines 621-632)
**MOVE to logic.js** (Game rules):
- `checkWin()`

### 13. Score UI Update (Lines ???)
**MOVE to render.js** (View update):
- `updateScoreUI()` - Need to locate this function

### 14. Main Game Loop (Lines 637-656)
**MOVE to logic.js** (Core loop):
- `loop(timestamp)` - Main animation frame loop

### 15. Screen Management (Lines 662-666)
**MOVE to logic.js** (Screen state):
- `showScreen(name)`

### 16. Game Control Functions (Lines 668-725)
**MOVE to logic.js** (Game flow control):
- `startGame(mode, difficulty)`
- `pauseGame()`
- `resumeGame()`
- `quitToMenu()`

### 17. Event Listeners (Lines 727-816)
**Should REMAIN in game.js** (Controller concerns):
- Window event listeners (resize, keydown, keyup, mousemove)
- Touch handlers
- Menu button listeners
- UI button listeners (mute, pause, resume, quit, restart, menu)

### 18. Initialization (Lines 818-823)
**SPLIT:**
- `NP.resize();` → **render.js** (Already there, but call remains)
- `updateSaveUI();` → **engine.js** (Should be called from engine after init)
- `requestAnimationFrame(loop);` → **logic.js** (Loop initiation)

## Summary of What to Move

### To engine.js:
- All constants and configuration
- Complete state object and initialization
- Save/load functions
- Entity factories (makeBall, makePaddle, makeExtraBall if not already there)
- Utility functions (clamp, tickEffectBucket)

### To logic.js:
- All gameplay mechanics (paddle, ball, collision physics)
- AI logic
- Input processing
- Power-up application (applyPowerUp, applyTimedEffect)
- Effect timing updates
- Win conditions
- Main game loop
- Screen management
- Game control functions (startGame, pause, resume, quitToMenu)

### To powerups.js:
- Power-up creation (makePowerUp, makePowerUpWarning)
- Power-up lifecycle (updatePowerUps)
- Power-up application (applyPowerUp, applyTimedEffect) - potentially shared with logic.js

### To render.js:
- Effect UI creation (addEffectPill)
- Effect UI updates (updateEffectUI)
- Score UI updates (updateScoreUI if it exists)
- Any other DOM/UI manipulation functions

### To remain in game.js:
- DOM references (canvas, ctx, screens, ui)
- Event listeners (input handling at DOM level)
- Initialization bootstrap (calling lib functions to start game)

## Next Steps
Based on this analysis, Phase 2 should begin moving constants and state to engine.js, followed by moving the corresponding functions to their respective modules.