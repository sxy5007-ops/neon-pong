# Power-up Module Extraction Plan
Date: 2026-05-10

## Goal
Extract power-up management logic into a dedicated lib/powerup.js module to improve separation of concerns and reduce complexity in powerups.js and logic.js.

## Modules Involved
- lib/powerups.js (source)
- lib/powerup.js (target, to be created)
- lib/logic.js (consumer)
- lib/state.js (for NP.activeEffects? we'll keep as is)
- index.html (script loading order)

## Current State
- powerups.js contains: power-up types, spawning, effects application, callouts, particles, trails, paddle/ball factories, etc.
- logic.js calls: NP.updatePowerUps(dt), NP.updateEffects(dt), NP.updateCallouts(dt), NP.updateParticles(dt), NP.updateTrails()
- logic.js also uses: NP.makePaddle, NP.makeBall, NP.spawnParticles (from powerups.js)
- powerups.js exposes many utility functions via NP that are used throughout the codebase.

## Plan
### Phase 1: Create powerup.js with core power-up logic
1. Create lib/powerup.js with IIFE wrapper that defines NP.Powerup object (or similar)
2. Move power-up specific state and functions:
   - NP.config.POWER_UP_TYPES (already in config.js, we'll reference it)
   - Power-up spawning timer and warning system
   - Power-up update logic (movement, boundary checks, collection)
   - Effect application (applyPowerUp and helpers)
   - Callout management (lifetime, position, rendering data)
   - Effect decay timers and UI update
   - Particle effects for power-ups (maybe keep shared?)
3. Expose only power-up relevant functions:
   - NP.Powerup.update(dt) - handles spawning, updating power-ups, callouts, effects
   - NP.Powerup.reset() - reset power-up state (called from startGame/quitToMenu)
   - Possibly: NP.Powerup.apply(type, owner) - for external application?
4. Do NOT move utility functions yet: makePaddle, makeBall, makeExtraBall, spawnParticles, updateParticles, updateTrails
   - These are used in multiple places (audio.js, logic.js, etc.)
   - We'll keep them in powerups.js for now to avoid breaking changes
   - Consider extracting to a separate utils module later

### Phase 2: Update powerups.js to delegate
1. Keep powerups.js but modify it to:
   - Retain utility functions (makePaddle, makeBall, etc.)
   - Delegate power-up management to NP.Powerup
   - Possibly become a compatibility layer or be removed later
2. Or: Rename powerups.js to something like gameutils.js and keep only shared utilities
   - For bite-sized approach, we'll keep powerups.js as is and just remove power-up logic

### Phase 3: Update logic.js
1. Remove power-up related state initialization from startGame and quitToMenu (activeEffects, powerUps, etc.)
   - Actually, activeEffects is more like game state; we might keep it in state.js or let powerup.js manage it
   - For now, let powerup.js manage its own state internally (NP.activeEffects can stay as is but managed by powerup module)
2. Replace direct calls:
   - Replace NP.updatePowerUps(dt) with NP.Powerup.updatePowerUps(dt) or similar
   - Replace NP.updateEffects(dt) with NP.Powerup.updateEffects(dt)
   - Replace NP.updateCallouts(dt) with NP.Powerup.updateCallouts(dt)
3. Ensure NP.makePaddle, NP.makeBall, NP.spawnParticles are still available (they'll remain in powerups.js)

### Phase 4: Update index.html
1. Add lib/powerup.js after lib/state.js and before lib/powerups.js (since powerups.js may still contain utilities)
2. Or: if we completely replace powerups.js functionality, put powerup.js where powerups.js was

### Phase 5: Verification
1. Run smoke test to ensure core gameplay works
2. Verify power-ups still spawn, apply effects, callouts appear, etc.
3. Check that utility functions are still accessible

## Success Criteria
- lib/powerup.js exists and contains power-up management logic
- powerups.js no longer contains power-up spawning/update logic (only utilities)
- logic.js delegates power-up updates to NP.Powerup
- index.html loads powerup.js in correct order
- Smoke test passes (same power-up mechanic failures as before are acceptable)
- No regression in core gameplay (ball movement, scoring, etc.)

## Estimated Effort
- 2-3 subagent tasks for creation, integration, and verification

## Next Steps
After this plan is approved, execute via subagent-driven-development with two-stage review.