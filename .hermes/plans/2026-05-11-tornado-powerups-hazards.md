# Tornado + New Power-Ups Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Remove wind zones, trim bumpers to 2, add 3 new power-ups (PHASE, DECOY, RICOCHET), and add a tornado map hazard.

**Architecture:** Each feature touches config.js (constants), powerup.js (effect application), logic.js (physics/loop), render.js (drawing), and engine.js (state initialization). All follow the existing IIFE namespace pattern on `NP`.

**Tech Stack:** Vanilla ES6+ JavaScript, Canvas 2D, IIFE modules, no build step.

---

## Task 1: Remove Wind Zones

**Objective:** Delete all wind zone code — config constants, logic update, rendering, and exports.

**Files:**
- Modify: `lib/config.js`
- Modify: `lib/logic.js`
- Modify: `lib/render.js`

**Step 1: Remove wind zone constants from config.js**

In `/Users/syau/Documents/Warp/cyberpunk-pong/lib/config.js`, remove the `WIND_ZONES` block (lines 47-52) and update the exports section.

Remove these lines:
```
    /* == Wind Zones == */
    WIND_ZONES: [
      { yRatio: 0.15, hRatio: 0.1, force: 100, color: 'rgba(0, 255, 255, 0.05)' },
      { yRatio: 0.48, hRatio: 0.1, force: -80, color: 'rgba(255, 0, 255, 0.05)' },
      { yRatio: 0.78, hRatio: 0.1, force: 90, color: 'rgba(0, 255, 255, 0.05)' },
    ],
```

Also remove the backward-compat export:
```
  NP.WIND_ZONES = NP.config.WIND_ZONES;
```

**Step 2: Remove updateWindZones from logic.js**

Remove the `updateWindZones` function block (lines 233-244) and its export `NP.updateWindZones = updateWindZones;` (line 402).

Remove the call `NP.updateWindZones(dt);` from the game loop (line 382).

**Step 3: Remove drawWindZones from render.js**

Remove the `drawWindZones` function (lines 57-78) and its export `NP.drawWindZones = drawWindZones;` (line 327).

Remove the call `drawWindZones();` from the `render()` function (line 286).

**Verification:**
Run: `node -c lib/config.js && node -c lib/logic.js && node -c lib/render.js`
Expected: no syntax errors.
Run: `grep -n "WindZones\|WIND_ZONES\|wind zone" lib/*.js`
Expected: no matches (after cleanup).

---

## Task 2: Reduce Bumpers from 4 to 2

**Objective:** Change BUMPER_COUNT from 4 to 2.

**Files:**
- Modify: `lib/config.js`

**Step 1: Update BUMPER_COUNT**

In `lib/config.js`, change line 31:
```
    BUMPER_COUNT: 2,
```

That's it — `generateBumpers()` in engine.js loops `for (var i = 0; i < NP.config.BUMPER_COUNT; i++)` so it auto-adjusts.

**Verification:**
Run: `node -c lib/config.js`
Expected: no errors.
Check by reading line 31: `BUMPER_COUNT: 2`

---

## Task 3: Add Power-Up Types to Config

**Objective:** Register PHASE, DECOY, RICOCHET in POWER_UP_TYPES and EFFECT_LABELS.

**Files:**
- Modify: `lib/config.js`

**Step 1: Add to POWER_UP_TYPES array**

After the `multiball` entry (line 62), add:
```
      { id: 'phase', label: 'PHASE', color: '#39ff14' },
      { id: 'decoy', label: 'DECOY', color: '#ff00aa' },
      { id: 'ricochet', label: 'RICO', color: '#00ffcc' },
```

**Step 2: Add to EFFECT_LABELS**

After the `sound` entry (line 76), add:
```
      phase: 'Phase Shift',
      decoy: 'Ghost Ball',
      ricochet: 'Ricochet',
```

**Verification:**
Run: `node -c lib/config.js`
Expected: no errors.
Check: `grep -n "'phase'" lib/config.js` confirms entry exists.

---

## Task 4: Add PHASE Power-Up

**Objective:** When collected, ball becomes intangible for 4s — passes through paddles but still bounces off walls and scores normally.

**Files:**
- Modify: `lib/powerup.js`
- Modify: `lib/logic.js`
- Modify: `lib/render.js` (visual)

**Step 1: Add applyPowerUp handler in powerup.js**

In the `applyPowerUp` function in `lib/powerup.js`, before the `updateEffectUI()` call at line 56, add:
```
    if (type === 'phase') {
      applyTimedEffect(owner, 'phase', 4);
    }
```

**Step 2: Add phase visual flag for rendering in logic.js**

In `lib/logic.js`, add a visual phase flag on the ball in `updateOneBall`:

After `b.x += b.vx * dt; b.y += b.vy * dt;` (line 62), add:
```
    // Phase state tracking
    var phaseActive = NP.activeEffects[NP.lastHitBy] && NP.activeEffects[NP.lastHitBy].phase > 0;
    b.phase = phaseActive;
```

**Step 3: Skip paddle collision when ball is phased**

In `updateOneBall`, wrap the paddle collision blocks (lines 86-101) so they're skipped when phase is active.

Add after `var hitPaddle = false;` (line 77):
```
    if (!phaseActive) {
```

And close the block before the scoring section with a `}` so that the paddle collision code is inside the `if (!phaseActive)` block.

Wait — this is tricky with the existing structure. Let me be more specific.

Replace the section from `var hitPaddle = false;` through the end of the paddle collision checks before scoring. The new code:

```javascript
    // Paddle collisions (skipped when phase is active)
    if (!phaseActive) {
      var hitPaddle = false;
      var checkPaddle = function (p) {
        var closestX = NP.clamp(b.x, p.x, p.x + p.w);
        var closestY = NP.clamp(b.y, p.y, p.y + p.h);
        var dx = b.x - closestX;
        var dy = b.y - closestY;
        return (dx * dx + dy * dy) < (b.r * b.r);
      };

      if (checkPaddle(NP.paddles.p1) && !hitPaddle) {
        b.x = NP.paddles.p1.x + NP.paddles.p1.w + b.r;
        reflectBallFor(b, NP.paddles.p1);
        NP.AudioEngine.sfxPaddleHit();
        NP.state.shake = 6; NP.state.shakeDecay = 0.82;
        NP.spawnParticles(b.x, b.y, 10, NP.config.COLORS.particle);
        hitPaddle = true;
      }
      if (checkPaddle(NP.paddles.p2) && !hitPaddle) {
        b.x = NP.paddles.p2.x - b.r;
        reflectBallFor(b, NP.paddles.p2);
        NP.AudioEngine.sfxPaddleHit();
        NP.state.shake = 6; NP.state.shakeDecay = 0.82;
        NP.spawnParticles(b.x, b.y, 10, NP.config.COLORS.particle);
        hitPaddle = true;
      }
    }
```

**Step 4: Add phase visual effect in render.js**

In `lib/render.js`, in the `drawOneBall` function (line 98-107), add visual distinction for phased balls.

After line 107 (`ctx.restore();`), add:
```
    // Phase visual: ghostly double-ring effect
    if (b.phase) {
      ctx.save();
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#39ff14';
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 1.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 2.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
```

**Verification:**
Run: `node -c lib/powerup.js && node -c lib/logic.js && node -c lib/render.js`
Expected: no syntax errors.
Run smoke tests: `node tools/smoke-test.js`
Expected: all tests pass.

---

## Task 5: Add DECOY Power-Up

**Objective:** When collected, spawns a ghost ball that mirrors the main ball's position with a slight random offset for 5s. Purely visual — no physics interaction.

**Files:**
- Modify: `lib/engine.js`
- Modify: `lib/powerup.js`
- Modify: `lib/logic.js`
- Modify: `lib/render.js`

**Step 1: Add decoy state to engine.js**

In `lib/engine.js`, add a decoy array to the state initialization section (around line 51):
```
  NP.decoys = [];
```
After the existing `NP.callouts = [];` (line 55).

**Step 2: Add decoy reset in startGame and quitToMenu**

In `lib/logic.js`, `startGame()` function — add after `NP.callouts = [];` (line 327):
```
    NP.decoys = [];
```

In `lib/logic.js`, `quitToMenu()` function — add after `NP.callouts = [];` (line 360):
```
    NP.decoys = [];
```

**Step 3: Add applyPowerUp handler in powerup.js**

In `lib/powerup.js`, in the `applyPowerUp` function, before `updateEffectUI()`:
```
    if (type === 'decoy') {
      // Spawn 1 decoy ball that mirrors the main ball for 5s
      var offsetAngle = (Math.random() - 0.5) * Math.PI;
      NP.decoys.push({
        offsetX: Math.cos(offsetAngle) * 40,
        offsetY: Math.sin(offsetAngle) * 40,
        life: 5,
        maxLife: 5,
      });
      applyTimedEffect(owner, 'decoy', 5);
    }
```

**Step 4: Add updateDecoy function in logic.js**

In `lib/logic.js`, add a new function:
```
  function updateDecoy(dt) {
    NP.decoys.forEach(function (d) {
      d.life -= dt;
    });
    NP.decoys = NP.decoys.filter(function (d) { return d.life > 0; });
  }
```

Export it: `NP.updateDecoy = updateDecoy;`

Add call to the game loop (around line 387, after `NP.updateCallouts(dt);`):
```
      NP.updateDecoy(dt);
```

**Step 5: Add decoy drawing in render.js**

In `lib/render.js`, add a new function:
```
  function drawDecoys() {
    NP.decoys.forEach(function (d) {
      if (!NP.ball) return;
      var alpha = NP.clamp((d.life / d.maxLife), 0.2, 0.7);
      var ghostX = NP.ball.x + d.offsetX;
      var ghostY = NP.ball.y + d.offsetY;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#ff00aa';
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ghostX, ghostY, NP.config.BALL_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      // Inner fill
      ctx.fillStyle = 'rgba(255, 0, 170, 0.15)';
      ctx.beginPath();
      ctx.arc(ghostX, ghostY, NP.config.BALL_RADIUS - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
```

Export it: `NP.drawDecoys = drawDecoys;`

Call it in the `render()` function — after `drawTrails()` and before `drawPaddle` calls (around line 288):
```
      drawDecoys();
```

**Verification:**
Run: `node -c lib/engine.js && node -c lib/powerup.js && node -c lib/logic.js && node -c lib/render.js`
Expected: no syntax errors.
Run smoke tests: `node tools/smoke-test.js`
Expected: all tests pass.

---

## Task 6: Add RICOCHET Power-Up

**Objective:** When collected, ball bounces off top/bottom walls with a speed boost (+15%) for 8s. Visual flash and particles on ricochet bounces.

**Files:**
- Modify: `lib/powerup.js`
- Modify: `lib/logic.js`
- Modify: `lib/render.js`

**Step 1: Add applyPowerUp handler in powerup.js**

In `lib/powerup.js`, in the `applyPowerUp` function, before `updateEffectUI()`:
```
    if (type === 'ricochet') {
      applyTimedEffect(owner, 'ricochet', 8);
    }
```

**Step 2: Add ricochet logic to wall collisions in logic.js**

In `lib/logic.js`, in `updateOneBall`, modify the wall collision section (lines 66-74).

Replace the wall collision block with:
```
    // Wall collisions
    var ricochetActive = NP.activeEffects[NP.lastHitBy] && NP.activeEffects[NP.lastHitBy].ricochet > 0;
    if (b.y - b.r <= 0) {
      b.y = b.r; b.vy = Math.abs(b.vy);
      if (ricochetActive) {
        var ricochetBoost = 1.15;
        b.vx *= ricochetBoost;
        b.vy *= ricochetBoost;
        b.speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        NP.state.shake = 10;
        NP.state.shakeDecay = 0.78;
        NP.spawnParticles(b.x, b.y, 14, ['#00ffcc', '#ffffff', '#00ffaa']);
        NP.AudioEngine.sfxWallHit();
      } else {
        NP.AudioEngine.sfxWallHit();
        NP.spawnParticles(b.x, b.y, 6, NP.config.COLORS.particle);
      }
    } else if (b.y + b.r >= NP.state.height) {
      b.y = NP.state.height - b.r; b.vy = -Math.abs(b.vy);
      if (ricochetActive) {
        var ricochetBoost = 1.15;
        b.vx *= ricochetBoost;
        b.vy *= ricochetBoost;
        b.speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        NP.state.shake = 10;
        NP.state.shakeDecay = 0.78;
        NP.spawnParticles(b.x, b.y, 14, ['#00ffcc', '#ffffff', '#00ffaa']);
        NP.AudioEngine.sfxWallHit();
      } else {
        NP.AudioEngine.sfxWallHit();
        NP.spawnParticles(b.x, b.y, 6, NP.config.COLORS.particle);
      }
    }
```

**Step 3: Add ricochet visual marker on ball in render.js**

In `lib/render.js`, in `drawOneBall`, add after the phase visual (if present) or at the end of the function:

```
    // Ricochet visual: bright cyan glow ring
    if (b.ricochet) {
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00ffcc';
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.015) * 0.3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 2.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
```

Wait, the ricochet state doesn't need to be on the ball object. Let me track it via `NP.activeEffects` in the render function instead:

In `lib/render.js`, modify `drawOneBall` to accept context about active effects, OR simply check globally. Actually, the simplest approach: check `NP.activeEffects` in the main render flow and add a per-effect indicator.

Actually, let me keep it even simpler — since ricochet is already tracked on `NP.activeEffects[NP.lastHitBy].ricochet`, in the render loop's effect drawing section (lines 293-308), just make sure ricochet shows something visual.

Actually, that section already draws a big circle for every active effect (lines 293-308), which is kind of weird. Let me leave that as-is and just add a specific ricochet indicator.

Even simpler: In `updateOneBall`, set a flag on the ball when ricochet is active so the draw function can use it. Add at the top of `updateOneBall`:

```
    b.ricochet = NP.activeEffects[NP.lastHitBy] && NP.activeEffects[NP.lastHitBy].ricochet > 0;
```

Then in `drawOneBall`, the check on `b.ricochet` works.

**Verification:**
Run: `node -c lib/powerup.js && node -c lib/logic.js && node -c lib/render.js`
Expected: no syntax errors.
Run smoke tests: `node tools/smoke-test.js`
Expected: all tests pass.

---

## Task 7: Add TORNADO Map Hazard

**Objective:** A circular tornado hazard randomly appears on the map. Rotating visual. Lasts 60s. Deflects any ball that enters its radius in a random direction with speed preserved. One active at a time, reappears on cooldown.

**Files:**
- Modify: `lib/config.js`
- Modify: `lib/engine.js`
- Modify: `lib/logic.js`
- Modify: `lib/render.js`

**Step 1: Add tornado constants to config.js**

In `lib/config.js`, add after the Bumpers section (after line 31):
```
    /* == Tornado == */
    TORNADO_RADIUS: 55,
    TORNADO_LIFE: 60,
    TORNADO_FIRST_MIN: 15,
    TORNADO_FIRST_MAX: 30,
    TORNADO_COOLDOWN_MIN: 20,
    TORNADO_COOLDOWN_MAX: 40,
```

Add backward-compat exports after the bumper exports (around line 102):
```
  NP.TORNADO_RADIUS = NP.config.TORNADO_RADIUS;
  NP.TORNADO_LIFE = NP.config.TORNADO_LIFE;
  NP.TORNADO_FIRST_MIN = NP.config.TORNADO_FIRST_MIN;
  NP.TORNADO_FIRST_MAX = NP.config.TORNADO_FIRST_MAX;
  NP.TORNADO_COOLDOWN_MIN = NP.config.TORNADO_COOLDOWN_MIN;
  NP.TORNADO_COOLDOWN_MAX = NP.config.TORNADO_COOLDOWN_MAX;
```

**Step 2: Add tornado state to engine.js**

In `lib/engine.js`, add after `NP.powerUpTimer = 8;` (line 58):
```
  NP.tornado = null;
  NP.tornadoTimer = 8;
```

**Step 3: Reset tornado state in startGame and quitToMenu**

In `lib/logic.js`, `startGame()` — add after `NP.bumpers = NP.generateBumpers();` (line 331):
```
    NP.tornado = null;
    NP.tornadoTimer = NP.config.TORNADO_FIRST_MIN + Math.random() * (NP.config.TORNADO_FIRST_MAX - NP.config.TORNADO_FIRST_MIN);
```

In `lib/logic.js`, `quitToMenu()` — add after `NP.bumpers = [];` (line 362):
```
    NP.tornado = null;
    NP.tornadoTimer = 0;
```

**Step 4: Add updateTornado function in logic.js**

Add a new function in `lib/logic.js`:

```
  /* == Tornado == */
  function updateTornado(dt) {
    // Timer countdown for next tornado spawn
    NP.tornadoTimer -= dt;

    if (NP.tornadoTimer <= 0 && !NP.tornado) {
      // Spawn a new tornado at random position (not too close to edges or paddles)
      var marginX = NP.state.width * 0.25;
      var marginY = NP.state.height * 0.15;
      NP.tornado = {
        x: marginX + Math.random() * (NP.state.width - marginX * 2),
        y: marginY + Math.random() * (NP.state.height - marginY * 2),
        r: NP.config.TORNADO_RADIUS * NP.scale,
        life: NP.config.TORNADO_LIFE,
        spin: 0,
        active: true,
      };
    }

    if (NP.tornado) {
      // Update rotation animation
      NP.tornado.spin += dt * 2.5;
      NP.tornado.life -= dt;
      NP.tornado.r = NP.config.TORNADO_RADIUS * NP.scale * (0.85 + Math.sin(NP.tornado.spin * 0.5) * 0.15);

      // Check collision with all balls
      NP.balls.forEach(function (b) {
        var dx = b.x - NP.tornado.x;
        var dy = b.y - NP.tornado.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var minDist = b.r + NP.config.TORNADO_RADIUS * NP.scale;
        if (dist < minDist) {
          // Deflect ball in random direction, preserving speed
          var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (speed < 1) speed = NP.config.INITIAL_SPEED;
          var deflectAngle = Math.random() * Math.PI * 2;
          b.vx = Math.cos(deflectAngle) * speed;
          b.vy = Math.sin(deflectAngle) * speed;
          // Push ball out of tornado
          var overlap = minDist - dist;
          b.x += (dx / dist || 1) * overlap;
          b.y += (dy / dist || 1) * overlap;
          // Visual feedback
          NP.state.shake = 8;
          NP.state.shakeDecay = 0.8;
          NP.spawnParticles(b.x, b.y, 16, ['#a0a0ff', '#ffffff', '#6060ff', '#c0c0ff']);
        }
      });

      // Remove tornado when expired
      if (NP.tornado.life <= 0) {
        NP.tornado = null;
        NP.tornadoTimer = NP.config.TORNADO_COOLDOWN_MIN + Math.random() * (NP.config.TORNADO_COOLDOWN_MAX - NP.config.TORNADO_COOLDOWN_MIN);
      }
    }
  }
```

Export it:
```
  NP.updateTornado = updateTornado;
```

Add call to the game loop (after `NP.updateBumpers(dt);` at line 383):
```
      NP.updateTornado(dt);
```

**Step 5: Add tornado drawing in render.js**

In `lib/render.js`, add a new function:

```
  function drawTornado() {
    if (!NP.tornado) return;
    var t = NP.tornado;
    var s = NP.scale;

    ctx.save();

    // Outer glow
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#a0a0ff';

    // Rotating cyclone rings
    var ringCount = 4;
    for (var i = 0; i < ringCount; i++) {
      var ringRadius = t.r * (0.3 + i * 0.2);
      var ringAlpha = 0.25 - i * 0.04;
      var ringOffset = t.spin * (i % 2 === 0 ? 1 : -1) * 0.5 + i;

      ctx.globalAlpha = Math.max(0.05, ringAlpha + Math.sin(t.spin + i * 1.5) * 0.08);
      ctx.strokeStyle = '#a0a0ff';
      ctx.lineWidth = 2 - i * 0.3;

      // Draw spiral segments for cyclone effect
      for (var seg = 0; seg < 8; seg++) {
        var angle = (seg / 8) * Math.PI * 2 + ringOffset;
        var segRadius = ringRadius * (0.8 + Math.sin(angle + t.spin * 2) * 0.2);
        var px = t.x + Math.cos(angle) * segRadius;
        var py = t.y + Math.sin(angle) * segRadius;
        if (seg === 0) {
          ctx.beginPath();
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Center core
    ctx.globalAlpha = 0.4 + Math.sin(t.spin * 3) * 0.15;
    ctx.fillStyle = '#c0c0ff';
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow rings
    ctx.globalAlpha = 0.15;
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#a0a0ff';
    ctx.strokeStyle = '#a0a0ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
```

Export it: `NP.drawTornado = drawTornado;`

Call it in the `render()` function — after `drawBumpers();` (line 311):
```
    drawTornado();
```

**Step 6: Add tornado warning visual**

When the tornado is about to spawn, show a subtle warning marker on the map (similar to power-up warnings). Actually, the user didn't ask for a warning, and the cooldown is long enough. Let's skip the warning for simplicity. The tornado just appears.

**Verification:**
Run: `node -c lib/config.js && node -c lib/engine.js && node -c lib/logic.js && node -c lib/render.js`
Expected: no syntax errors.
Run smoke tests: `node tools/smoke-test.js`
Expected: all tests pass.

---

## Task 8: Update Smoke Tests

**Objective:** Add tests for the 3 new power-ups and tornado, verify wind zone references are gone.

**Files:**
- Modify: `tools/smoke-test.js`

**Step 1: Add new power-up tests**

After the "power-ups telegraph" test, add:

```javascript
test('new power-ups apply correctly', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  api.applyPowerUp('p1', 'phase');
  assert(api.activeEffects.p1.phase > 0, 'phase effect should be active for P1');

  api.applyPowerUp('p1', 'decoy');
  assert(api.decoys.length >= 1, 'decoy should create a ghost ball');
  assert(api.activeEffects.p1.decoy > 0, 'decoy effect should be active');

  api.applyPowerUp('p1', 'ricochet');
  assert(api.activeEffects.p1.ricochet > 0, 'ricochet effect should be active for P1');
});

test('tornado spawns and collides with balls', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  // Force-spawn a tornado
  api.tornado = {
    x: api.state.width / 2,
    y: api.state.height / 2,
    r: api.TORNADO_RADIUS * api.scale,
    life: api.TORNADO_LIFE || 60,
    spin: 0,
  };

  // Place a ball inside the tornado radius
  api.balls[0].x = api.state.width / 2;
  api.balls[0].y = api.state.height / 2;
  var beforeVx = api.balls[0].vx;
  var beforeVy = api.balls[0].vy;

  api.updateTornado(0.016);

  // Ball should have been deflected (vx/vy changed)
  assert(api.balls[0].vx !== beforeVx || api.balls[0].vy !== beforeVy,
    'ball in tornado should be deflected');
});
```

**Step 2: Remove any wind zone references from test assertions**

Check the test file for `WIND_ZONES` or `windZone` references. None exist currently, so this is a verification step only.

**Verification:**
Run: `node tools/smoke-test.js`
Expected: all 9+ tests pass (6 existing + 2-3 new).

---

## Summary

| Task | Files Changed | Complexity |
|------|---------------|------------|
| 1. Remove wind zones | config.js, logic.js, render.js | Easy |
| 2. Reduce bumpers | config.js | Trivial |
| 3. Add power-up config | config.js | Trivial |
| 4. Add PHASE | powerup.js, logic.js, render.js | Medium |
| 5. Add DECOY | engine.js, powerup.js, logic.js, render.js | Medium |
| 6. Add RICOCHET | powerup.js, logic.js, render.js | Medium |
| 7. Add TORNADO | config.js, engine.js, logic.js, render.js | Medium-High |
| 8. Update smoke tests | tools/smoke-test.js | Easy |

**Total: 8 tasks, ~10 files modified.** Can be dispatched as 1-2 subagents.