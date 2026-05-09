# Phase 4: Transition Drawing Functions to Render.js Module

## Objective
Remove duplicate drawing function implementations from game.js and transition to using the NP-namespaced versions from render.js to improve modularity and maintainability.

## Background
- render.js already contains complete implementations of all drawing functions
- render.js properly exports these functions to the NP namespace (NP.drawGrid, NP.render, etc.)
- game.js currently contains duplicate local implementations of the same functions
- game.js calls the local versions directly instead of using the NP namespace versions

## Changes Required

### 1. Remove Local Drawing Function Definitions from game.js
Delete these functions from game.js (approximately lines 397-540):
- `function drawGrid() { ... }`
- `function drawCenterLine() { ... }`
- `function drawPaddle(p) { ... }`
- `function drawBall() { ... }`
- `function drawOneBall(b) { ... }`
- `function drawPowerUp(pu) { ... }`
- `function drawPowerUpWarning(warning) { ... }`
- `function drawCallout(callout) { ... }`
- `function applyShake() { ... }`
- `function render() { ... }`

### 2. Update Function Calls in game.js to Use NP Namespace
Replace all direct calls with NP-prefixed equivalents:

#### In the `loop()` function (around line 933-945):
- `applyShake();` → `NP.applyShake();`
- `drawGrid();` → `NP.drawGrid();`
- `drawCenterLine();` → `NP.drawCenterLine();`
- `drawTrails();` → `NP.drawTrails();` (if called here)
- `updateTrails();` → Keep as-is (logic function, not drawing)
- `updateCallouts(dt);` → Keep as-is (logic function)

#### In the rendering section of `loop()` (around line 523-540 in original):
- `drawTrails();` → `NP.drawTrails();`
- `drawPaddle(paddles.p1);` → `NP.drawPaddle(paddles.p1);`
- `drawPaddle(paddles.p2);` → `NP.drawPaddle(paddles.p2);`
- `balls.forEach(drawOneBall);` → `NP.balls.forEach(NP.drawOneBall);`
- `powerUpWarnings.forEach(drawPowerUpWarning);` → `NP.powerUpWarnings.forEach(NP.drawPowerUpWarning);`
- `powerUps.forEach(drawPowerUp);` → `NP.powerUps.forEach(NP.drawPowerUp);`
- `callouts.forEach(drawCallout);` → `NP.callouts.forEach(NP.drawCallout);`
- `drawParticles();` → `NP.drawParticles();`

#### In the `render()` function call in animation loop (end of loop function):
- `render();` → `NP.render();`

### 3. Handle Special Cases
- The `drawBall()` function is a simple wrapper: `function drawBall() { drawOneBall(ball); }`
  - Replace calls to `drawBall()` with `NP.drawOneBall(ball)` or similar
  - Check if any such calls exist

### 4. Verify Dependencies
Ensure all referenced variables are accessible via NP namespace:
- `NP.state` for width, height, etc.
- `NP.COLORS` for color constants
- `NP.POWER_UP_SIZE`, `NP.CALLOUT_LIFE` etc. if referenced
- `NP.clamp()` utility function

## Expected Outcome
- game.js will be significantly shorter (removing ~150 lines of drawing code)
- All rendering will go through the centralized render.js module
- Better separation of concerns: game.js handles logic, render.js handles drawing
- Easier maintenance and testing
- No functional changes to gameplay

## Verification Steps
1. After changes, run `node -c game.js` to verify syntax is correct
2. Open game in browser and verify visuals appear identical
3. Test all game modes (AI, 2P) to ensure rendering works correctly
4. Verify resize functionality still works
5. Check console for any JavaScript errors

## Estimated Effort
- 2-3 hours for implementation and testing