# Visual Polish — Score Flash, Screen Shake, Multiball Trails

> **For Hermes:** Use subagent-driven-development to implement task-by-task.

**Goal:** Three targeted visual polish improvements that make scoring feel impactful and multiball easier to track.

**Architecture:** All changes are in `lib/logic.js` (scoring/shake intensity) and `lib/render.js` (flash rendering, trail tracking). No new state — just tuning existing variables and extending ball tracking.

---

### Task 1: Punchier score flash

**Objective:** Make the white flash on scoring more visible. Currently `flash = 0.15` — barely a flicker.

**Files:**
- Modify: `lib/logic.js:109,121` (flash value on score)
- Modify: `lib/render.js:304-310` (flash render)

**Step 1: Increase flash intensity and duration**

In `lib/logic.js`, lines 109 and 121 — change `0.15` to `0.35`:

```javascript
(function() {
  'use strict';
  var NP = window.NP;
  if (!NP) return;
  /* already present ... */

  // In updateOneBall, score section (two places, P2 score and P1 score):
  NP.state.flash = 0.35;

  /* rest of file ... */
})();
```

**Step 2: Tune flash rendering amplitude**

In `lib/render.js`, the flash overlay section (around line 304-310). Change `NP.state.flash * 0.25` to `NP.state.flash * 0.35` and make the decay frame‑rate‑independent:

```javascript
// Score flash overlay
if (NP.state.flash > 0) {
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = NP.state.flash * 0.35;
  ctx.fillRect(0, 0, NP.state.width, NP.state.height);
  NP.state.flash -= 0.016;
  if (NP.state.flash < 0) NP.state.flash = 0;
}
```

(Decay stays at `0.016` — it's a per‑frame decrement, not a dt‑scaled one. The increased `0.35` multiplier makes each frame brighter.)

**Step 3: Verify**

- `node -c lib/logic.js && node -c lib/render.js`
- `node tools/smoke-test.js`
- Browser: score a point, observe a brief bright white flash instead of the current barely‑visible flicker.

**Step 4: Commit**

```bash
git add lib/logic.js lib/render.js
git commit -m "polish: punchier score flash (0.15→0.35 intensity)"
```

---

### Task 2: Screen shake scales with ball speed

**Objective:** Currently shake on score is always `10` regardless of rally length. Make it proportional to the scoring ball's speed so a long, fast rally feels more dramatic.

**Files:**
- Modify: `lib/logic.js:108,120` (shake assignment)

**Step 1: Make shake proportional to ball speed**

In `updateOneBall`, replace the hardcoded `NP.state.shake = 10` with a calculation based on the ball's current speed:

**Before (lines 108, 120):**
```javascript
NP.state.shake = 10; NP.state.shakeDecay = 0.78;
```

**After:**
```javascript
var speedRatio = Math.min(b.speed / NP.config.INITIAL_SPEED, 3);
NP.state.shake = 6 + speedRatio * 8; NP.state.shakeDecay = 0.78;
```

This gives shake values from ~14 (fast ball near MAX_SPEED) down to ~6 (ball at initial speed). The base `6` ensures even a fresh serve feels something.

**Step 2: Verify**

- `node -c lib/logic.js`
- `node tools/smoke-test.js`
- Browser: score after a long rally — screen should shake more than on first serve. Compare by scoring immediately vs after 10+ paddle hits.

**Step 3: Commit**

```bash
git add lib/logic.js
git commit -m "polish: screen shake scales with ball speed on score"
```

---

### Task 3: Multiball ball trails

**Objective:** Currently only `NP.ball` (the main ball) leaves a trail. Extra balls from multiball are invisible until they hit a paddle. Add trail tracking per ball.

**Files:**
- Modify: `lib/render.js:247-266` (`updateTrails` + `drawTrails`)
- Modify: `lib/logic.js:383` (loop call to `updateTrails`)

**Step 1: Extend `updateTrails` to track all balls**

Replace the single‑ball trail function with a per‑ball version. Rather than a flat array, keep a trail ID per ball so each ball gets its own trail.

In `lib/render.js`, change `updateTrails`:

```javascript
function updateTrails() {
  // Decay all existing trails (frame‑based as before)
  for (var i = NP.trails.length - 1; i >= 0; i--) {
    NP.trails[i].life -= 0.016;
    if (NP.trails[i].life <= 0) NP.trails.splice(i, 1);
  }
  // Add new trail point for every active ball
  NP.balls.forEach(function (b) {
    if (b.life > 0 || b.life === Infinity) {
      NP.trails.push({
        x: b.x, y: b.y, life: 0.35,
        ballId: b.isMain ? 'main' : 'extra:' + b.hits + '_' + (b.x|0) + '_' + (b.y|0),
      });
    }
  });
  if (NP.trails.length > 80) NP.trails.splice(0, NP.trails.length - 80);
}
```

The `ballId` is a cheap unique-ish marker so each ball's trail doesn't bleed into another. Actual identity tracking would need per‑ball IDs on the ball objects (more intrusive). This allocates trail points for every active ball.

**Step 2: Ensure loop calls updateTrails for all ball states**

In `lib/logic.js:383`, `NP.updateTrails()` is called inside the `if (NP.state.screen === 'playing')` block. This is correct — trails should only update during gameplay. No change needed.

**Step 3: Verify**

- `node -c lib/render.js && node -c lib/logic.js`
- `node tools/smoke-test.js`
- Browser: start a game, get multiball, observe that all balls leave trails instead of only the main ball.

**Step 4: Commit**

```bash
git add lib/render.js
git commit -m "polish: multiball balls now leave trails"
```

---

## Completion Criteria

- [ ] Score flash is a bright, brief white flash (visible but < 0.5s)
- [ ] Screen shake on score is proportional to ball speed (fast rally = big shake)
- [ ] All active balls leave trails, not just the main ball
- [ ] All 4 smoke tests pass
- [ ] No new lint/syntax errors