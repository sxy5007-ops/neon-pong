# Config Module Creation Plan
Date: 2026-05-10

## Goal
Extract game constants from engine.js and other modules into a dedicated config.js module to improve maintainability and centralize configuration.

## Problem
Constants like WIN_SCORE, BALL_RADIUS, PADDLE_WIDTH, colors, and other game parameters are currently scattered across engine.js and other modules, making them hard to manage and modify.

## Solution
Create a new lib/config.js module that exports all game constants as a single NP.config object, then update all modules to reference NP.config instead of direct constants or NP.* properties.

## Files to Modify
1. **Create**: `/Users/syau/Documents/Warp/cyberpunk-pong/lib/config.js`
2. **Update**: `/Users/syau/Documents/Warp/cyberpunk-pong/lib/engine.js`
3. **Update**: `/Users/syau/Documents/Warp/cyberpunk-pong/lib/audio.js`
4. **Update**: `/Users/syau/Documents/Warp/cyberpunk-pong/lib/powerups.js`
5. **Update**: `/Users/syau/Documents/Warp/cyberpunk-pong/lib/render.js`
6. **Update**: `/Users/syau/Documents/Warp/cyberpunk-pong/lib/logic.js`
7. **Update**: `/Users/syau/Documents/Warp/cyberpunk-pong/main.js` (if any constants referenced directly)

## Step-by-Step Implementation

### Phase 1: Create config.js
1. Create new file `lib/config.js` with IIFE wrapper
2. Move all constants from engine.js to config.js as properties of NP.config
3. Ensure config.js loads before other modules that depend on it

### Phase 2: Update engine.js
1. Remove constant definitions that were moved to config.js
2. Update references to use NP.config.* instead of direct constants or NP.* where appropriate
3. Keep engine-specific constants that don't belong in global config

### Phase 3: Update Other Modules
1. For each module (audio.js, powerups.js, render.js, logic.js):
   - Replace direct constant references with NP.config.* equivalents
   - Update any NP.* references that were actually constants to use NP.config.*
   - Ensure module still works after changes

### Phase 4: Update HTML Loading Order
1. Edit index.html to load config.js before other lib modules
2. Verify all modules can access NP.config

## Constants to Extract
Based on code review, extract these to config.js:

### Game Constants
- WIN_SCORE: 3
- BALL_RADIUS: 8
- INITIAL_BALL_SPEED: 180
- MAX_BALL_SPEED: 350
- BALL_SPEED_INCREASE: 1.1
- PADDLE_WIDTH: 10
- PADDLE_HEIGHT: 80
- PADDLE_SPEED: 300
- AI_REACTION_TIME: [0.1, 0.15, 0.2] (easy, medium, hard)

### Canvas & Display
- GRID_SIZE: 20
- CRT_CURVATURE: 0.05
- SCAN_LINE_INTENSITY: 0.3
- BLOOM_INTENSITY: 0.2

### Colors (from NP.COLORS)
- Background gradients
- Paddle colors (p1, p2, ai)
- Ball colors (normal, power-up states)
- UI colors (text, accents, warnings)
- Power-up colors by type

### Audio Constants
- Master volume levels
- Frequency ranges for synth effects
- Duration constants for SFX

### Power-up Constants
- Spawn rates
- Duration times
- Effect magnitudes
- Telegraph timing

## Completion Criteria
- [ ] config.js file created with proper IIFE structure
- [ ] All target constants moved from engine.js to config.js
- [ ] All modules updated to use NP.config.* references
- [ ] index.html updated to load config.js first
- [ ] Game functionality preserved (verified via smoke test)
- [ ] No regression in visuals, audio, or gameplay
- [ ] Constants are easily modifiable in one location

## Verification Steps
1. Visual inspection: Confirm constants moved correctly
2. Manual gameplay test: Verify ball physics, scoring, power-ups work
3. Smoke test: Run existing smoke-test.js to ensure no regressions
4. Console check: Verify no undefined constant errors
5. Diff check: Confirm only intended changes were made

## Estimated Time
- Planning: 10 minutes
- Implementation: 20-30 minutes
- Verification: 10 minutes
- Total: ~40-50 minutes (bite-sized chunks as preferred)

## Notes
- Maintain backward compatibility where possible during transition
- Consider keeping some engine-specific constants in engine.js if they're truly internal
- Update documentation/comments to reflect new config structure