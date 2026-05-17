# Fix Critical Bugs & Smoke Test Failures

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task with two-stage review.

**Goal:** Fix the 4 confirmed bugs affecting cyberpunk-pong gameplay and test reliability.

**Architecture:** All changes are in `lib/powerup.js` (effects, power-up handlers, collection) and `tools/smoke-test.js` (test infrastructure). No structural changes — targeted fixes to specific function bodies.

**Bugs (in priority order):**
1. Effects never decay — `tickEffectBucket` missing `dt` parameter (gameplay-breaking)
2. Smoke test failures — `NP.state.width/height` = 0 because `resize()` never called (test infrastructure)
3. Sonic pulse power-up does nothing — missing handler in `applyPowerUp`
4. Dead `shield` code in `applyPowerUp` — removed from POWER_UP_TYPES but still handled

---

### Task 1: Fix effects not decaying (critical gameplay bug)

**Objective:** Pass `dt` through `updateEffects` → `tickEffectBucket` so power-up timers actually tick down.

**Files:**
- Modify: `lib/powerup.js:120-125`

**Step 1: Fix the three `tickEffectBucket` calls**

In `lib/powerup.js`, locate `updateEffects(dt)` around line 120. The function receives `dt` as a parameter but doesn't forward it.

Change:
```javascript
function updateEffects(dt) {
    tickEffectBucket(NP.activeEffects.p1);
    tickEffectBucket(NP.activeEffects.p2);
    tickEffectBucket(NP.activeEffects.global);
    updateEffectUI();
}
```

To:
```javascript
function updateEffects(dt) {
    tickEffectBucket(NP.activeEffects.p1, dt);
    tickEffectBucket(NP.activeEffects.p2, dt);
    tickEffectBucket(NP.activeEffects.global, dt);
    updateEffectUI();
}
```

**Step 2: Verify**

- Syntax check: `node -c lib/powerup.js`
- Smoke test: `node tools/smoke-test.js` (test `PASS power-up API supports chaotic party effects` should still pass)
- Manual: Start a game, apply a power-up, wait for it to expire. It should actually expire.

**Step 3: Commit**

```bash
git add lib/powerup.js
git commit -m "Fix effects not decaying - pass dt to tickEffectBucket"
```

---

### Task 2: Fix smoke test state dimensions

**Objective:** The smoke test's `setupGame()` never calls `resize()`, leaving `NP.state.width = 0` and `NP.state.height = 0`. This causes power-up boundary clamping in `updatePowerUps` to always snap positions to x=0/y=72, breaking:
- Multiball ball collection (power-up moves away before collection check)
- Drift visibility (positions always clamped to same value)

**Files:**
- Modify: `tools/smoke-test.js:163` (inside `setupGame()`)

**Step 1: Add `api.resize()` call after UI/screen wiring**

In the `setupGame()` function, after the screens are wired up (around line 160-162), add:

```javascript
// Initialize state dimensions (simulates what resize() does in browser)
win.NP.state.width = 1000;
win.NP.state.height = 1000;
```

**Why this works:**
- `resize()` sets `NP.state.width = 1000` and `NP.state.height = 600` from `window.innerWidth/innerHeight` (1000x600 in the mock)
- These same values should be set directly to match

Actually, the simplest and most correct approach: just call `NP.resize()`:

```javascript
// Initialize state dimensions (simulates browser resize)
win.NP.resize();
```

But we need to ensure the canvas exists and has getContext. In the mock, it does. Let's verify.

**Step 1 (revised): Call `NP.resize()` after wiring**

In `setupGame()`, after the `screens` wiring block, add:

```javascript
  // Initialize state dimensions (resize reads from window mock)
  win.NP.resize();
```

**Step 2: Verify**

- Run: `node tools/smoke-test.js`
- Expected: Previously failing tests now PASS:
  - `PASS power-ups are easy enough to collect during play`
  - `PASS power-ups telegraph, drift, and announce collection`

**Step 3: Commit**

```bash
git add tools/smoke-test.js
git commit -m "Fix smoke test state dimensions by calling resize()"
```

---

### Task 3: Implement sonic pulse power-up

**Objective:** The `sound` power-up type is defined in POWER_UP_TYPES but has no handler in `applyPowerUp`. Implement it as an instant-effect power-up that pushes all balls toward the opponent's side with screen shake and particle burst.

**Files:**
- Modify: `lib/powerup.js:28` (add handler after freeze, before shield)

**Step 1: Add `sound` handler to `applyPowerUp`**

In `lib/powerup.js`, add the sound handler. Place it before the dead `shield` line (which gets removed in Task 4):

```javascript
    if (type === 'sound') {
      // Sonic pulse: push all balls toward the opponent (P2's side)
      var pushForce = 400;
      NP.balls.forEach(function (b) {
        b.vx += pushForce;
        b.vy += (Math.random() - 0.5) * 200;
      });
      NP.activeEffects.global.sound = 1.5; // brief visual indicator
      NP.state.shake = 18;
      NP.state.shakeDecay = 0.78;
      NP.spawnParticles(NP.ball.x, NP.ball.y, 40, ['#ff6b35', '#ffaa00', '#ff4400', '#ffffff']);
    }
```

**Step 2: Add `sound` to `EFFECT_LABELS` if needed**

Check `lib/config.js` — `EFFECT_LABELS` already has `sound: 'Sonic Pulse'` at line 76. Good.

**Step 3: Verify**

- Syntax check: `node -c lib/powerup.js`
- Thorough: `node tools/smoke-test.js`
- Manual: Start a game in browser, collect a SONIC pickup, verify balls get pushed right with screen shake.

**Step 4: Commit**

```bash
git add lib/powerup.js
git commit -m "Implement sonic pulse power-up - pushes all balls toward opponent"
```

---

### Task 4: Remove dead shield power-up code

**Objective:** `applyPowerUp` still has a handler for `shield` which was removed from POWER_UP_TYPES. Clean it up.

**Files:**
- Modify: `lib/powerup.js:28`

**Step 1: Remove the shield line**

In `applyPowerUp`, remove:
```javascript
    if (type === 'shield') applyTimedEffect(owner, 'shield', 30);
```

**Step 2: Verify**

- Syntax check: `node -c lib/powerup.js`
- Smoke test: `node tools/smoke-test.js` — should all pass
- Manual: Power-ups still work (mega, tiny, turbo, glitch, reverse, freeze, multiball, sound)

**Step 3: Commit**

```bash
git add lib/powerup.js
git commit -m "Remove dead shield power-up handler"
```

---

### Task 5: Final verification

**Step 1: Run full smoke test suite**

```bash
node tools/smoke-test.js
```

Expected output:
```
PASS easy AI is much less capable than hard AI
PASS power-up API supports chaotic party effects
PASS power-ups are easy enough to collect during play
PASS power-ups telegraph, drift, and announce collection
```

**Step 2: Syntax check all modified files**

```bash
node -c lib/powerup.js
node -c lib/config.js
node -c tools/smoke-test.js
```

**Step 3: Quick browser verify**

Open `index.html`, start an Easy AI game, let it run for 30 seconds, verify:
- Paddles and ball render
- Power-ups appear and drift
- Collecting a power-up shows a callout
- Collecting sonic pulse pushes ball right
- Effects (mega/freeze/etc.) expire after their duration

## Completion Criteria

- [ ] Effects tick down and expire properly (mega 8s, freeze 4s, etc.)
- [ ] All 4 smoke tests pass
- [ ] Multiball extra balls can collect power-ups
- [ ] Power-ups have visible drift movement
- [ ] Sonic pulse pushes balls and shakes screen
- [ ] No `shield` references remain in power-up handler code

## Out of Scope (for this batch)

- Consolidating duplicate `updateEffectUI`/entity functions — cosmetic, not functional
- Power-up visual polish (particle sparkle, pulse alpha modulation) — nice-to-have
- Multiball ball scoring — works now, not broken