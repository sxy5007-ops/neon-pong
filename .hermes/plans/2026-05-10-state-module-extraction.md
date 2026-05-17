# State Module Extraction Plan
Date: 2026-05-10

## Goal
Extract game state management from engine.js into a dedicated lib/state.js module to improve modularity and centralize state initialization and manipulation.

## Problem
Currently, NP.state is initialized directly in engine.js (line ~91) and is used throughout the codebase (engine.js, logic.js, render.js, etc.). This creates tight coupling and makes state management scattered.

## Solution
Create lib/state.js that:
1. Initializes NP.state with the same default values as currently in engine.js.
2. Provides functions to reset, get, and update state (optional, for future encapsulation).
3. Is loaded before any module that uses NP.state.
4. Maintains backward compatibility by still setting the global NP.state object.

## Files to Modify
1. **Create**: `/Users/syau/Documents/Warp/cyberpunk-pong/lib/state.js`
2. **Update**: `/Users/syau/Documents/Warp/cyberpunk-pong/engine.js` - remove state initialization, delegate to state.js
3. **Update**: `/Users/syau/Documents/Warp/cyberpunk-pong/index.html` - add script tag for state.js in correct order

## Constants and Dependencies
- state.js will depend on config.js for values like WIN_SCORE (used in scoreLimit).
- Therefore, loading order must be: config.js → state.js → engine.js → other modules → main.js

## Step-by-Step Implementation

### Phase 1: Create lib/state.js
1. Create the file with an IIFE that:
   - Ensures NP exists (window.NP = window.NP || {})
   - Defines NP.state with the exact same object as currently in engine.js lines 92-95:
     ```
     NP.state = {
       screen: 'menu', mode: 'ai', difficulty: 'normal',
       muted: false, width: 0, height: 0, lastTime: 0,
       shake: 0, shakeDecay: 0, gridOffset: 0, scoreLimit: NP.config.WIN_SCORE, flash: 0
     };
     ```
   - Optionally, expose a reset function: `NP.state.reset = function() { ... };`
   - Optionally, expose a getState function (though direct access is fine for now).
2. Ensure the file does NOT modify any other globals unnecessarily.

### Phase 2: Update engine.js
1. Locate the NP.state initialization block (lines 91-95 in current engine.js).
2. Remove the entire `NP.state = { ... };` block.
3. Replace it with a simple call to ensure state.js has run (which it will have via script ordering) or just remove it entirely since state.js will set NP.state.
   - Actually, since state.js will set NP.state globally, we can just delete the block.
   - However, we need to ensure that if state.js hasn't loaded (shouldn't happen), we have a fallback. But given we control the load order, we can rely on it.
   - Simpler: just delete the block and trust the load order.
4. Check that engine.js still references NP.state (it does, for width, height, etc.) – those references will now work because state.js ran first.

### Phase 3: Update index.html
1. Add a script tag for lib/state.js after lib/config.js and before lib/engine.js.
2. Verify the order is:
   ```html
   <script src="lib/config.js"></script>
   <script src="lib/state.js"></script>
   <script src="lib/engine.js"></script>
   <script src="lib/audio.js"></script>
   <script src="lib/powerups.js"></script>
   <script src="lib/render.js"></script>
   <script src="lib/logic.js"></script>
   <script src="main.js"></script>
   ```

### Phase 4: Verification
1. Check that all modules still load without errors.
2. Verify that NP.state is properly initialized (can check via console or smoke test).
3. Ensure no regressions in gameplay.

## Completion Criteria
- [ ] lib/state.js created with proper NP.state initialization
- [ ] engine.js no longer contains the NP.state = { ... } block
- [ ] index.html loads state.js after config.js and before engine.js
- [ ] All modules (engine, logic, render, audio, powerups) can still access NP.state properties
- [ ] Smoke test passes (or at least does not introduce new failures beyond existing power‑up issues)
- [ ] Backward compatibility maintained: NP.state is still a global object with the same shape and default values

## Estimated Time
- Planning: 10 minutes
- Implementation: 15-20 minutes
- Verification: 10 minutes
- Total: ~35 minutes

## Notes
- This extraction keeps NP.state as a global mutable object for simplicity. Future work could encapsulate it further (e.g., using getters/setters) but that is out of scope for this phase.
- The state.js module is very small; its main purpose is to separate the concern of state initialization from engine logic.
- We will not modify the usage of NP.state in other modules; they will continue to reference NP.state directly (which is now set by state.js).