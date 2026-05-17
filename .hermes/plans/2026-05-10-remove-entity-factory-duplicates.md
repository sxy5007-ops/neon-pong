# Remove Entity Factory Duplicates from engine.js
Date: 2026-05-10

## Goal
Remove duplicate entity factory functions (makePaddle, makeBall, makeExtraBall) from engine.js since they are already defined in powerups.js. This eliminates code duplication and clarifies module responsibilities.

## Context
- engine.js contains duplicate definitions of makePaddle, makeBall, and makeExtraBall
- powerups.js contains the same functions under "Utility Functions: Entity factories, particles, and trails"
- Having identical functions in two places creates maintenance burden and potential confusion
- powerups.js is the more appropriate home for these utility functions based on its description
- Removing duplicates from engine.js will simplify the engine core module

## Files to Modify
1. `/Users/syau/Documents/Warp/cyberpunk-pong/lib/engine.js` - Remove duplicate function definitions

## Detailed Steps

### Step 1: Verify duplicates exist
Confirm that engine.js and powerups.js contain identical implementations of:
- makePaddle(side)
- makeBall()
- makeExtraBall(source, angleOffset)

### Step 2: Remove duplicates from engine.js
Delete the three function definitions from engine.js while keeping:
- The NP.* attachments (NP.makePaddle = makePaddle; etc.) - these should remain in engine.js to ensure the functions are available on the NP namespace
- Wait, actually if we remove the function definitions but keep the attachments, that will cause errors

Let me reconsider: we need to either:
a) Keep function definitions in engine.js and remove from powerups.js, or
b) Keep function definitions in powerups.js and remove from engine.js, AND move the NP.attachments to powerups.js

Looking at where the functions are used:
- They are attached to NP in both files
- But if we keep only one set of definitions, we need to ensure the NP.attachments exist in at least one file that loads

Since powerups.js describes itself as containing "Entity factories", and engine.js as "Engine Core", it makes sense for the entity factories to live in powerups.js.

Therefore, we should:
1. Remove the function definitions from engine.js
2. Keep the NP.attachments in engine.js? No, that won't work without the definitions
3. Actually, we need to move BOTH the function definitions AND the NP.attachments to powerups.js, and remove both from engine.js

But wait, other files might depend on accessing these via NP from engine.js loading order.

Let me check the script loading order in index.html first.

### Step 1.5: Check script loading order
Examine index.html to see the order of lib/ script tags to understand dependencies.

### Step 2: Remove duplicates from engine.js (revised plan)
After confirming powerups.js loads after engine.js:
1. Remove the function definitions for makePaddle, makeBall, makeExtraBall from engine.js
2. Remove the corresponding NP.attachments from engine.js (since they depend on the definitions)
3. Ensure powerups.js has both the function definitions and NP.attachments (it should already)
4. Verify that all code still works since powerups.js loads after engine.js

### Step 3: Verify no functionality changes
Run syntax checks and manual testing to ensure game behavior is unchanged.

## Completion Criteria
✅ Duplicate function definitions removed from engine.js
✅ Corresponding NP.attachments removed from engine.js
✅ powerups.js retains both function definitions and NP.attachments
✅ All JavaScript files pass syntax check (`node -c filename.js`)
✅ Game loads and plays correctly in browser
✅ No console errors related to missing functions

## Verification Steps
1. Run syntax check on all lib/ files: `node -c lib/*.js`
2. Open index.html in browser and verify game initializes correctly
3. Start a game and verify paddle/ball behavior is normal
4. Check browser console for any errors
5. Confirm that NP.makePaddle, NP.makeBall, NP.makeExtraBall are all functions

## Risks and Tradeoffs
- Low risk: change is localized and involves removing duplicate code
- Must verify script loading order to ensure powerups.js loads after engine.js
- If powerups.js loads before engine.js, we would need to keep definitions in engine.js instead
- The change improves code maintainability by eliminating duplication