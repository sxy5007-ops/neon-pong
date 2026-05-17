# Kaiju Events & Polish — Implementation Plan

> **Execution:** Use subagent-driven-development with two-stage review per task.

**Goal:** Add kaiju arena event, 4 new power-ups (gravity/magnet/blink/void), 2 new arena events (neon storm / time pocket), plus a polish pass.

**Architecture:** Follows existing IIFE module pattern. New events follow the tornado/disco pattern (state in engine.js, logic in logic.js, rendering in render.js). New power-ups added to powerup.js. Kaiju audio added to audio.js. Config constants in config.js.

**Loading order preserved:** config -> state -> engine -> audio -> powerups -> powerup -> render -> logic -> main

**Tech:** Vanilla ES6+, HTML5 Canvas, IIFE modules on NP namespace. No build step.

---

### Task 1: Add config constants to config.js

**Objective:** Define constants for kaiju, storm, time-pocket events + 4 new power-up type entries.

**Files:**
- Modify: `lib/config.js`

**Changes:**
1. Add to `NP.config`:
```js
/* == Kaiju Event == */
KAIJU_DURATION: 8,
KAIJU_COOLDOWN_MIN: 50,
KAIJU_COOLDOWN_MAX: 75,
KAIJU_ARM_WIDTH: 80,
KAIJU_ARM_HEIGHT: 200,
KAIJU_SHOCKWAVE_RADIUS: 300,
KAIJU_STUN_DURATION: 0.8,
KAIJU_PATTERNS: ['slam', 'sweep', 'rumble', 'roar'],

/* == Neon Storm Event == */
STORM_DURATION: 10,
STORM_COOLDOWN_MIN: 55,
STORM_COOLDOWN_MAX: 80,
STORM_STRIKE_INTERVAL: 1.5,
STORM_BOLT_WIDTH: 12,
STORM_REVERSE_DURATION: 1.0,

/* == Time Pocket Event == */
POCKET_DURATION: 10,
POCKET_COOLDOWN_MIN: 45,
POCKET_COOLDOWN_MAX: 65,
POCKET_SLOW_FACTOR: 0.4,
POCKET_RADIUS: 120,
POCKET_SPEED: 60,
```

2. Add 4 new power-up types to `POWER_UP_TYPES` array:
```js
{ id: 'gravity', label: 'GRAVITY', color: '#8b5cf6' },
{ id: 'magnet', label: 'MAGNET', color: '#06b6d4' },
{ id: 'blink', label: 'BLINK', color: '#eab308' },
{ id: 'void', label: 'VOID', color: '#6b21a8' },
```

3. Add to `EFFECT_LABELS`:
```js
gravity: 'Gravity Well',
magnet: 'Magnet Attract',
blink: 'Blink',
void: 'Void Black Hole',
```

4. Export as `NP.*` compat:
- `NP.KAIJU_*`, `NP.STORM_*`, `NP.POCKET_*` constants

**Verification:** Smoke tests pass: `node tools/smoke-test.js`

---

### Task 2: Initialize event state in engine.js

**Objective:** Add state for kaiju, storm, and time-pocket events (like existing tornado/disco state).

**Files:**
- Modify: `lib/engine.js`

**Changes:**

In the state init section where tornado and disco are set up, add:

```js
/* == Kaiju Event State == */
NP.kaiju = {
  active: false,
  timer: 0,
  cooldown: NP.config.KAIJU_COOLDOWN_MIN + Math.random() * (NP.config.KAIJU_COOLDOWN_MAX - NP.config.KAIJU_COOLDOWN_MIN),
  pattern: 'slam',
  patternTimer: 0,
  armX: 0, armY: 0,
  armTargetX: 0, armTargetY: 0,
  armPhase: 0, // 0=rising, 1=striking, 2=recovering
  shockwaveActive: false,
  shockwaveTimer: 0,
  shockwaveRadius: 0,
  warningTimer: 0,
};

/* == Neon Storm State == */
NP.storm = {
  active: false,
  timer: 0,
  cooldown: NP.config.STORM_COOLDOWN_MIN + Math.random() * (NP.config.STORM_COOLDOWN_MAX - NP.config.STORM_COOLDOWN_MIN),
  strikeTimer: 0,
  bolts: [], // { x, y, life, phase }
  warningTimer: 0,
  warningBolts: [], // { x, y } pending strike positions
};

/* == Time Pocket State == */
NP.timePocket = {
  active: false,
  timer: 0,
  cooldown: NP.config.POCKET_COOLDOWN_MIN + Math.random() * (NP.config.POCKET_COOLDOWN_MAX - NP.config.POCKET_COOLDOWN_MIN),
  x: 0, y: 0,
  vx: 0, vy: 0,
};
```

Also add `kaiju`, `storm`, `timePocket` reset in `NP.resetState()` (or wherever state is reinitialized).

**Verification:** `node -c lib/engine.js` — no syntax errors.

---

### Task 3: Implement gravity, magnet, blink, void in powerup.js

**Objective:** Add effect application logic for the 4 new power-ups in the `applyPowerUp` function.

**Files:**
- Modify: `lib/powerup.js`

**Changes in `applyPowerUp` function, add after the existing type checks:**

```js
if (type === 'gravity') {
  // Attract ball toward opponent's side — apply per-ball acceleration in updateEffects
  applyTimedEffect(owner, 'gravity', 5);
}
if (type === 'magnet') {
  // Paddle attracts ball within range — flag set on owner paddle
  applyTimedEffect(owner, 'magnet', 6);
}
if (type === 'blink') {
  // Instant: teleport paddle to ball's Y position
  var p = owner === 'p1' ? NP.paddles.p1 : NP.paddles.p2;
  if (p) {
    p.y = NP.ball.y - p.h / 2;
    NP.clamp(p.y, 0, NP.state.height - p.h);
    NP.spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 20, ['#eab308', '#ffffff', '#fef08a']);
    NP.state.shake = 4;
    NP.state.shakeDecay = 0.8;
  }
  // Blink has no timer — it's instant, so don't add to activeEffects beyond a visual pulse
  applyTimedEffect(owner, 'blink', 0.3); // brief visual only
}
if (type === 'void') {
  // Place a black hole on opponent's side that pulls balls toward it
  var vx = target === 'p1' ? NP.state.width * 0.25 : NP.state.width * 0.75;
  var vy = NP.state.height * 0.2 + Math.random() * NP.state.height * 0.6;
  NP.voidHole = { x: vx, y: vy, timer: 4, radius: 80, pullStrength: 180 };
  applyTimedEffect(owner, 'void', 4);
}
```

Also modify `updateEffects` in powerup.js, or add a new function `updateVoidHole(dt)` that:
- If `NP.voidHole` exists, ticks its timer and pulls balls toward it
- When timer <= 0, clears it

Also modify `updateEffects` to handle gravity: accelerate balls toward opponent's goal when gravity effect is active.

**Verification:** `node -c lib/powerup.js` — no syntax errors.

---

### Task 4: Implement kaiju event logic in logic.js

**Objective:** Full kaiju event — pattern selection, arm movement, shockwave, stun, ball split.

**Files:**
- Modify: `lib/logic.js`

**New function `updateKaiju(dt)`:** Follows tornado update pattern. Add after `updateDisco`:

1. **Cooldown phase:** Tick `kaiju.cooldown` down. When <= 0, activate with `kaiju.warningTimer = 2` (2s warning).
2. **Warning phase:** Visual flash indicators on screen. After warning expires, pick a random pattern, select attack coordinates.
3. **Active phase (8s):**
   - `patternTimer` ticks down
   - When pattern timer expired, pick a new random pattern
   - **slam:** Arm drops from top-center with a large X offset. On impact: shockwave (radial push on all balls), stun paddles within shockwave radius, screen shake.
   - **sweep:** Arm swipes horizontally across the arena. Balls in path get split into 3 smaller balls each. Paddles in path get knocked sideways.
   - **rumble:** Arm drags across arena floor. Jagged deflection zone appears (line segments that deflect balls).
   - **roar:** Arm rears up. Screen shake, all balls get random velocity kick, callout "KAIJU ROAR".

4. **Arm animation:** `armPhase` transitions: 0=rising (1s), 1=striking (0.3s impact), 2=recovering (0.7s).
5. **Shockwave:** On slam impact, `shockwaveActive = true`, radius expands from 0 to max over 0.5s. Balls hit get pushed outward.

6. **Callouts:** "KAIJU SLAM", "KAIJU SWEEP", etc.

7. **Expose:** `NP.updateKaiju = updateKaiju;`

**Integration in loop:** Call `NP.updateKaiju(dt)` inside the main loop, alongside `updateTornado` and `updateDisco`.

**Verification:** `node -c lib/logic.js` — no syntax errors.

---

### Task 5: Implement Neon Storm event in logic.js

**Objective:** Storm event — lightning bolts strike randomly, affecting balls and paddles.

**Files:**
- Modify: `lib/logic.js`

**New function `updateStorm(dt)`:** Similar pattern to tornado/kaiju.

1. **Cooldown → Warning → Active cycle** (same as kaiju pattern).
2. **Active (10s):** Every `STRIKE_INTERVAL` seconds, spawn warning bolts at random X positions. After 0.5s, strike activates:
   - Balls within 60px of bolt center get random velocity (+/- 300 px/s burst)
   - Paddle within 80px of bolt gets 1s reverse control (set `NP.activeEffects[p].reverse = 1.0`)
   - Screen shake on each strike
   - Particles burst at strike point
3. **Bolts lifecycle:** warning (0.5s) → active (0.2s) → fading (0.3s)
4. **Callouts:** "NEON STORM"

**Expose:** `NP.updateStorm = updateStorm;`

**Integration in loop:** Call alongside other events.

**Verification:** `node -c lib/logic.js`

---

### Task 6: Implement Time Pocket event in logic.js

**Objective:** Slow-field zone drifts across arena, slowing balls and paddles inside.

**Files:**
- Modify: `lib/logic.js`

**New function `updateTimePocket(dt)`:**

1. **Cooldown → Warning → Active** (same pattern).
2. **Active (10s):** A circular zone spawns at a random position and drifts (`POCKET_SPEED` px/s) in a random direction, bouncing off walls.
3. **Effect:** Any ball with its center inside the zone: multiply velocity by `POCKET_SLOW_FACTOR` (0.4). Any paddle overlapping the zone: multiply input velocity by 0.4 as well.
4. **Visual drift:** Bounce like a power-up, wall-aware.
5. **Callouts:** "TIME POCKET"

**Modify ball/paddle physics in logic.js:**
- In the ball update function (`updateOneBall` or wherever velocity is applied), check `NP.timePocket.active` and if ball is within `POCKET_RADIUS` of pocket center, apply the speed multiplier.
- In the paddle update function (`updatePaddle` or wherever movement is calculated), if paddle overlaps pocket zone, cap speed.

**Expose:** `NP.updateTimePocket = updateTimePocket;`

**Integration in loop.**

**Verification:** `node -c lib/logic.js`

---

### Task 7: Kaiju rendering in render.js

**Objective:** Draw the kaiju arm, shockwave rings, rumble terrain, and warning indicators.

**Files:**
- Modify: `lib/render.js`

**New functions:**

1. **`drawKaiju()`** — Main drawing function, only if `NP.kaiju.active`:
   - **Arm:** A large segmented neon-green/purple arm that extends from top of screen. Draw as a series of rectangles (upper arm, forearm, fist) with neon glow. Arm position interpolated from `armX, armY`.
   - **Fingers/claws:** 3 claw shapes at the fist. Glowing.
   - **Warning phase:** Bright pulsing crosshair at the target impact point.
   - **Arm animations per pattern:**
     - *Slam:* Arm lifts up, then slams down. On impact, expanding shockwave ring.
     - *Sweep:* Arm stays low, moves horizontally.
     - *Rumble:* Arm segments appear along the floor as jagged neon lines.
     - *Roar:* Arm rears up, pulsing rings emanate from it.

2. **`drawShockwave()`** — Expanding circle rings from epicenter when `kaiju.shockwaveActive`:
   ```js
   // Multiple concentric expanding rings with decreasing opacity
   for (var i = 0; i < 3; i++) {
     var ringR = shockwaveRadius * (1 - i * 0.2);
     var alpha = 0.7 - i * 0.2;
     // draw ring
   }
   ```

3. **`drawRumbleTerrain()`** — When kaiju pattern is 'rumble', draw jagged line segments near the floor that deflect balls.

**Integration in render():**
- Add `drawKaiju()` after `drawDisco()`
- Add `drawShockwave()` after drawKaiju

**Expose:** `NP.drawKaiju = drawKaiju; NP.drawShockwave = drawShockwave;`

**Verification:** `node -c lib/render.js`

---

### Task 8: Storm + Time Pocket rendering in render.js

**Objective:** Draw lightning bolts and time pocket slow-field zone.

**Files:**
- Modify: `lib/render.js`

**New functions:**

1. **`drawStorm()`:**
   - Draw bolt strikes: jagged zigzag lines from top to strike point. White/cyan core with blue glow bleed.
   - Warning bolts: pulsing red circles at pending strike positions.
   - Active bolts: bright white flash (0.2s), then fading cyan residual arcs.
   - Use `NP.storm.bolts` array — each bolt has {x, y, life, phase}.

2. **`drawTimePocket()`:**
   - When `NP.timePocket.active`:
   - Draw a distortion ring (orange/amber): Multiple concentric circles with animated distortion (sinusoidal radius variation).
   - Inner amber glow fill at low opacity.
   - Particle wisps swirling within the zone (small dots orbiting center).
   - Slow-time visual: small clock/timer glyphs floating.

**Integration in render():**
- Add `drawStorm()` and `drawTimePocket()` after drawDisco.

**Expose:** `NP.drawStorm = drawStorm; NP.drawTimePocket = drawTimePocket;`

**Verification:** `node -c lib/render.js`

---

### Task 9: New power-up rendering additions in render.js

**Objective:** Visual differentiation for gravity/magnet/blink/void power-up items and their effects.

**Files:**
- Modify: `lib/render.js`

**Changes:**

1. **drawPowerUp** already handles generic rendering via color/label from config. No changes needed for the power-up pickups themselves — the new types will auto-render with their defined colors and labels.

2. **Add effect visuals in the activeEffects loop:**
   - **Gravity effect:** Draw subtle pull-field lines on the affected player's side (converging lines toward opponent goal).
   - **Magnet effect:** Draw a faint attractor aura around the affected paddle.
   - **Blink effect:** Brief flash particles (already handled by spawnParticles in powerup.js).
   - **Void effect:** Draw `NP.voidHole` as a dark circle with purple accretion disk rings and light-absorption effect.

3. **New function `drawVoidHole()`:**
   ```js
   if (NP.voidHole) {
     // Dark center with purple glow rings
     // Particles being pulled into it
     // Rotation animation
   }
   ```

**Integration:**
- Add `drawVoidHole()` in the render loop after drawPowerUps.

**Verification:** `node -c lib/render.js`

---

### Task 10: Kaiju audio effects in audio.js

**Objective:** Kaiju roar, slam, sweep, and rumble SFX + music pause during event.

**Files:**
- Modify: `lib/audio.js`

**New SFX functions:**

1. **`sfxKaijuRoar()`** — Deep low-frequency sawtooth sweep (40Hz → 120Hz → 40Hz over 1.5s), layered with a square wave at 60Hz. Volume 0.4, slow decay.
2. **`sfxKaijuSlam()`** — Impact sound: noise burst (0.15s) + low sine (80Hz → 30Hz slide, 0.5s). Volume 0.35.
3. **`sfxKaijuSweep()`** — Rising sawtooth (80Hz → 200Hz over 0.6s) with stereo-ish detune. Volume 0.25.
4. **`sfxKaijuRumble()`** — Filtered noise at low volume, looping, 1.5s duration. Lowpass at 200Hz.
5. **`sfxStormStrike()`** — Bright crackle: high-frequency noise burst (0.08s) + sine ping at 2000Hz (0.05s). Volume 0.3.
6. **`sfxTimePocket()`** — Warp sound: sine wave with frequency oscillation (400Hz → 200Hz → 400Hz, 0.8s). Volume 0.2.

**Expose** all new functions on `NP.AudioEngine`.

**Verification:** `node -c lib/audio.js`

---

### Task 11: Polish pass — trail heat map, paddle impact, near-miss, score flash

**Objective:** Visual polish improvements across render.js and logic.js.

**Files:**
- Modify: `lib/render.js`
- Modify: `lib/logic.js`

**Changes:**

1. **Ball trail heat map (render.js — drawTrails):**
   - Color trails based on ball speed: get max ball speed from `NP.balls`
   - If speed < 400: yellow. 400-700: orange. >700: red.
   - Modify `drawTrails()` to check ball speeds and color accordingly.

2. **Paddle impact burst (render.js — drawPaddle):**
   - When a paddle is hit, a brief expanding ring emanates from the paddle face.
   - Store `NP.paddleHitBursts` array with {owner, timer, radius} — add from logic.js on hit, render in drawPaddle.
   - Expands and fades over 0.3s.

3. **Near-miss indicator (render.js — drawNearMiss):**
   - When ball passes within 30px of a paddle edge without hitting, flash a thin warning line.
   - Store `NP.nearMisses` array: {owner, y, timer}. Rendered as short horizontal neon line at the paddle X position.
   - Fades over 0.2s.

4. **Score flash particles (render.js — spawnParticles call on score):**
   - When a point is scored, burst 30 particles in the scorer's color.
   - Already partially handled by `NP.state.flash`. Enhance with directional particles flowing toward the scorer's side.

**Integration:**
- Add `NP.paddleHitBursts` and `NP.nearMisses` initialization in engine.js state init.
- Add ring burst on paddle hit in logic.js paddle collision section.
- Add near-miss check in logic.js ball update (when ball passes paddle edge zone).
- Draw near-miss lines in render loop.

**Verification:** `node -c lib/render.js && node -c lib/logic.js`

---

### Task 12: Update smoke tests

**Objective:** Ensure smoke tests cover new power-ups and events.

**Files:**
- Modify: `tools/smoke-test.js`

**Changes:**
1. Add test that `NP.config.POWER_UP_TYPES.length === 15` (was 11).
2. Add test that kaiju/storm/pocket config constants exist.
3. Add test that `NP.kaiju`, `NP.storm`, `NP.timePocket` state objects initialize with correct defaults.
4. Verify `NP.updateKaiju`, `NP.updateStorm`, `NP.updateTimePocket` are functions.

**Verification:** `node tools/smoke-test.js` — all pass.

---

### Task 13: Integration review + fix

**Objective:** Final review — verify everything works together.

**Files:** All modified files.

**Steps:**
1. `node tools/smoke-test.js` — all pass
2. `node -c lib/config.js` and so on for every JS file — no syntax errors
3. Review changes git diff for any obvious issues
4. Open `index.html` in browser and verify:
   - Game loads
   - Menu works
   - New power-ups appear and function
   - Events fire correctly
5. Commit all changes

**Verification:** All tests green, game playable in browser.

---

### Task ordering rationale

Tasks are ordered by dependency:
1. Config first (constants needed by everything)
2. State init (state needed by logic & render)
3. Powerup logic (self-contained)
4-6. Event logic (can be parallel as they touch different functions, but I've ordered them sequentially to avoid merge conflicts in logic.js)
7-9. Rendering (depends on state and logic being defined)
10. Audio (fully independent)
11. Polish (touches multiple files, does last to avoid conflicts)
12. Tests (validates everything)
