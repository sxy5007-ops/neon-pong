# Update Modules to Use Config Plan
Date: 2026-05-10

## Goal
Update all game modules to use NP.config.* instead of direct NP.* constants, and update the script loading order to load config.js first.

## Problem
Constants are duplicated between engine.js and config.js, and modules still reference NP.* constants directly instead of the centralized NP.config.

## Solution
1. Update index.html to load config.js before engine.js
2. Update engine.js to remove constant definitions and use NP.config.* references
3. Update audio.js, powerups.js, render.js, logic.js to use NP.config.* for all constant references
4. Verify backward compatibility is maintained (NP.* properties still set by config.js)

## Files to Modify
1. `/Users/syau/Documents/Warp/cyberpunk-pong/index.html` - loading order
2. `/Users/syau/Documents/Warp/cyberpunk-pong/lib/engine.js` - remove constants, use NP.config.*
3. `/Users/syau/Documents/Warp/cyberpunk-pong/lib/audio.js` - use NP.config.*
4. `/Users/syau/Documents/Warp/cyberpunk-pong/lib/powerups.js` - use NP.config.*
5. `/Users/syau/Documents/Warp/cyberpunk-pong/lib/render.js` - use NP.config.*
6. `/Users/syau/Documents/Warp/cyberpunk-pong/lib/logic.js` - use NP.config.*

## Constants to Replace
Based on config.js content:
- WIN_SCORE, BALL_RADIUS, INITIAL_SPEED, SPEED_INCREMENT, MAX_SPEED
- PADDLE_WIDTH, PADDLE_HEIGHT_RATIO
- POWER_UP_SIZE, POWER_UP_LIFE, POWER_UP_SPAWN_MIN, POWER_UP_SPAWN_MAX, POWER_UP_WARNING_LIFE
- BUMPER_RADIUS, BUMPER_COUNT
- CALLOUT_LIFE
- COLORS, WIND_ZONES, POWER_UP_TYPES, EFFECT_LABELS, DIFFICULTY

## Step-by-Step Implementation

### Phase 1: Update Loading Order
1. Edit index.html
2. Move config.js script tag to be the first lib script loaded (before engine.js)
3. Verify the order is: config.js, engine.js, audio.js, powerups.js, render.js, logic.js, main.js

### Phase 2: Update engine.js
1. Remove all constant definitions (lines setting NP.WIN_SCORE, NP.BALL_RADIUS, etc.)
2. Replace all references to these constants with NP.config.* equivalents
3. Keep engine-specific logic that uses these constants (now referencing NP.config.*)
4. Ensure engine.js still initializes NP.state and other non-constant properties

### Phase 3: Update Other Modules
For each module (audio.js, powerups.js, render.js, logic.js):
1. Identify all references to NP.* constants that are now in config.js
2. Replace them with NP.config.* equivalents
3. Verify the module still functions correctly

## Completion Criteria
- [ ] index.html loads config.js before engine.js
- [ ] engine.js has no constant definitions (only uses NP.config.*)
- [ ] All modules use NP.config.* for constants
- [ ] Game functionality preserved (verified via smoke test)
- [ ] No regression in visuals, audio, or gameplay
- [ ] Backward compatibility maintained (NP.* properties still accessible via config.js)

## Verification Steps
1. Visual inspection: Confirm changes are correct
2. Manual gameplay test: Verify ball physics, scoring, power-ups work
3. Smoke test: Run existing smoke-test.js to ensure no regressions
4. Console check: Verify no undefined constant errors
5. Diff check: Confirm only intended changes were made

## Estimated Time
- Planning: 5 minutes
- Implementation: 15-20 minutes
- Verification: 10 minutes
- Total: ~30-35 minutes

## Notes
- Maintain backward compatibility by ensuring config.js still sets NP.* properties
- Update one module at a time and test before proceeding
- Keep track of changes for easy rollback if needed