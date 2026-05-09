# Cyberpunk Pong Modularization Plan

## Goal
Continue modularizing the cyberpunk-pong game by moving remaining logic from `game.js` into the existing lib/ modules (engine.js, audio.js, logic.js, powerups.js, render.js) to improve code organization, maintainability, and separation of concerns.

## Current Context / Assumptions
- The project already has a basic module structure in lib/ with engine.js, audio.js, logic.js, powerups.js, and render.js
- game.js is a large IIFE (~1234 lines) containing mixed concerns
- User prefers bite-sized, actionable plans with exact file paths and code examples
- Plans should be saved in .hermes/plans/ directory
- Execution should use subagent-driven-development with two-stage review

## Proposed Approach
Move remaining responsibilities from game.js to appropriate lib/ modules:
1. Entity creation → engine.js
2. Particle and trail systems → render.js (they're rendering-related)
3. Game loop and screen management → logic.js
4. Input handling → logic.js
5. Remaining utility functions → appropriate modules based on functionality
6. Ensure proper NP namespace usage across all modules

## Step-by-Step Plan

### Phase 1: Entity Creation (High Priority)
**Target**: Move entity creation functions from game.js to engine.js
**Files to modify**: lib/engine.js
**Functions to move**:
- makePaddle(side)
- makeBall()
- makeExtraBall(source, angleOffset)

**Why high priority**: These are fundamental game objects used throughout the codebase and logically belong with engine state.

### Phase 2: Particle and Trail Systems (High Priority)
**Target**: Move particle and trail systems to render.js
**Files to modify**: lib/render.js
**Functions to move**:
- spawnParticles(x, y, count, colors)
- updateParticles(dt)
- drawParticles()
- updateTrails()
- drawTrails()

**Why high priority**: These are visual effects that belong with rendering logic.

### Phase 3: Resize and Canvas Functions (Medium Priority)
**Target**: Move resize and canvas-related functions to engine.js
**Files to modify**: lib/engine.js
**Functions to move**:
- resize()
- (Consider moving drawGrid() and drawCenterLine() to render.js later)

**Why medium priority**: Resize affects game state and is called from event listeners.

### Phase 4: Drawing Functions (Medium Priority)
**Target**: Ensure all drawing functions are in render.js
**Files to modify**: lib/render.js
**Functions to verify/move**:
- drawPaddle(p) - check if already moved
- drawOneBall(b) / drawBall()
- drawPowerUp(pu)
- drawPowerUpWarning(warning)
- drawCallout(callout)
- applyShake()
- render()

**Why medium priority**: Core rendering functions should be centralized.

### Phase 5: Game Logic Functions (High Priority)
**Target**: Move remaining game logic to logic.js
**Files to modify**: lib/logic.js
**Functions to move**:
- resetBall(winner)
- startRound(winner)
- clamp(val, min, max) - consider moving to engine.js as utility
- updatePaddle(p, dt) - check if already moved
- getPaddleHeight(owner) - check if already moved
- getPaddleSpeed(owner, baseSpeed) - check if already moved
- opponentOf(owner)
- reflectBallFor(b, paddle)
- reflectBall(paddle)
- updateOneBall(b, dt)
- updateBall(dt)

**Why high priority**: Core game physics and logic belong in logic.js.

### Phase 6: Power-up and Effect Functions (Medium Priority)
**Target**: Consolidate power-up and effect functions
**Files to modify**: lib/powerups.js (primary), lib/engine.js (for shared state)
**Functions to verify/move**:
- makePowerUp()
- makePowerUpWarning()
- applyTimedEffect(owner, effect, duration)
- applyPowerUp(owner, type)
- updatePowerUps(dt)
- updateCallouts(dt)
- tickEffectBucket(bucket, dt)
- updateEffects(dt)
- addEffectPill(items, owner, effect, time)
- updateEffectUI()

**Why medium priority**: Power-up system is already mostly modularized but may have duplicates.

### Phase 7: UI Update Functions (Medium Priority)
**Target**: Move UI update functions to appropriate modules
**Files to modify**: lib/engine.js (for save-related), lib/logic.js (for others)
**Functions to move**:
- updateScoreUI() - could go to logic.js or engine.js
- Functions related to save/load/UI updates

**Why medium priority**: UI updates are scattered and could be better organized.

### Phase 8: AI and Input Handling (High Priority)
**Target**: Ensure AI and input handling are in logic.js
**Files to modify**: lib/logic.js
**Functions to verify/move**:
- updateAI(dt)
- updateInput(dt)

**Why high priority**: These are core game logic functions.

### Phase 9: Game Loop and Screen Management (High Priority)
**Target**: Move game loop and screen management to logic.js
**Files to modify**: lib/logic.js
**Functions to move**:
- loop(timestamp)
- showScreen(name)
- startGame(mode, difficulty)
- pauseGame()
- resumeGame()
- quitToMenu()

**Why high priority**: The main game loop and state management belong with game logic.

### Phase 10: Event Listeners and Initialization (Medium Priority)
**Target**: Move event listeners and initialization to logic.js
**Files to modify**: lib/logic.js
**Code to move**:
- window.addEventListener('resize', ...)
- window.addEventListener('keydown', ...)
- window.addEventListener('keyup', ...)
- Mouse and touch event listeners
- Menu button listeners
- Initialization code (resize(); updateSaveUI(); requestAnimationFrame(loop);)

**Why medium priority**: Event listeners belong with the logic that handles them.

### Phase 11: Cleanup and Verification (Low Priority)
**Target**: Remove duplicate code, verify namespace consistency, test
**Files to modify**: All lib/ files and game.js
**Tasks**:
- Remove duplicated functions from game.js
- Ensure all modules properly use NP namespace
- Verify no functionality is broken
- Test game still works as expected

**Why low priority**: Important for code quality but doesn't add functionality.

## Files Likely to Change
- lib/engine.js (add entity creation, resize, utilities)
- lib/render.js (add/verify particle/trail systems and drawing functions)
- lib/logic.js (add game loop, screen management, input, AI, remaining logic)
- lib/powerups.js (verify/consolidate power-up functions)
- game.js (gradually empty as logic moves to modules)
- index.html (no changes needed unless script loading order changes)

## Tests / Validation
1. Visual verification: Game should look and feel identical before/after changes
2. Functional verification:
   - All game modes (AI easy/normal/hard, 2-player) work
   - Power-ups spawn and apply correct effects
   - Scoring and win conditions work
   - Audio plays correctly
   - Save/load functionality works
   - UI updates correctly
3. Code quality checks:
   - No duplicate functions in game.js and lib/
   - Consistent NP namespace usage
   - Proper separation of concerns

## Risks, Tradeoffs, and Open Questions
### Risks
- Introducing bugs during refactoring
- Breaking existing functionality if dependencies aren't properly maintained
- Incorrect namespace usage causing undefined variables

### Tradeoffs
- More files to navigate vs. better organized code
- Initial time investment vs. long-term maintainability

### Open Questions
1. Should utility functions like clamp() go in engine.js or remain in logic.js?
2. Where should the main game state initialization live?
3. How to handle circular dependencies between modules (if any)?
4. Should we consider a build step or module bundler for better dependency management?

## Verification Steps
After each phase:
1. Check that the game still loads and runs
2. Verify specific functionality related to the moved code works
3. Check browser console for errors
4. Manual gameplay testing of affected features

## Estimated Effort
- Phase 1: 2-3 subagent tasks
- Phase 2: 2-3 subagent tasks
- Phase 3: 1-2 subagent tasks
- Phase 4: 2-3 subagent tasks
- Phase 5: 3-4 subagent tasks
- Phase 6: 2-3 subagent tasks
- Phase 7: 1-2 subagent tasks
- Phase 8: 2-3 subagent tasks
- Phase 9: 3-4 subagent tasks
- Phase 10: 2-3 subagent tasks
- Phase 11: 1-2 subagent tasks

Total: ~20-28 subagent tasks