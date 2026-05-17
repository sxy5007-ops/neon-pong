# Cyberpunk Pong — Feature Expansion Plan

> **For Hermes:** Use subagent-driven-development to implement this plan task-by-task with two-stage review.

**Goal:** Add 6 new features: laser grid hazard, data worm hazard, combo counter, animated neon signs, post-match stats, and synth voice callouts.

**Architecture:** Each feature touches the relevant IIFE modules in dependency order (config → state → engine → audio → powerups → powerup → render → logic → main). No new files needed — all changes are additions to existing modules.

**Module load order (for reference):** config.js → state.js → engine.js → audio.js → powerups.js → powerup.js → render.js → logic.js → main.js

---

## Phases

### Phase 1: Synth Voice Callouts

**Objective:** Add synthesized voice-like callouts for events (kaiju, disco, score, power-up) using Web Audio API oscillators/filters for a glitchy cyberpunk feel.

**Files:**
- Modify: `lib/audio.js`

**Details:**
- Add `say(text)` method to `NP.AudioEngine` that generates a robotic voice using:
  - A carrier oscillator (sine wave, ~150-300 Hz base pitch)
  - An envelope per phoneme/syllable
  - A low-pass filter with sweep for the "synth" timbre
  - Optional: slight distortion/wobble for glitch effect
- Add `sfxCallout(text)` which:
  1. Splits text into syllables (by hyphen or capital letters)
  2. Plays each syllable as a pitched burst with frequency modulation
  3. Short gap (50-80ms) between syllables
- Specific callouts to wire:
  - Power-up collection: short chirp + "BOOST"
  - Kaiju event: "KAI-JU" (two syllables)
  - Disco: "DIS-CO"
  - Time pocket: "TIME POCKET"
  - Score point: short ascending tone
  - Win: "VIC-TOR-Y" + descending tones
- Start with just the core `say()` synth voice generator and `sfxCallout()` dispatcher
- Call `NP.AudioEngine.sfxCallout('BOOST')` etc. from various modules — but wire the calls in Phase 6 (main.js event wiring pass)
- Export on `NP.AudioEngine`

**Verification:** Open `index.html`, trigger events, hear synth voice.

**Commit:** `feat: add synth voice callout system to audio engine`

---

### Phase 2: Combo Counter

**Objective:** Track consecutive volleys (paddle hits) without the ball passing, display a neon combo counter on screen.

**Files:**
- Modify: `lib/state.js` — add combo state
- Modify: `lib/logic.js` — increment on paddle hit, reset on score
- Modify: `lib/render.js` — draw combo counter with neon glow

**Step 1: State (lib/state.js)**
- Add `NP.state.combo = 0` to initial state
- Add `NP.state.maxCombo = 0` for tracking longest rally

**Step 2: Logic (lib/logic.js)**
- In `reflectBallFor()`: increment `NP.state.combo++`, track `NP.state.maxCombo = Math.max(NP.state.maxCombo, NP.state.combo)`
- In the scoring section (where a point is awarded): reset `NP.state.combo = 0`

**Step 3: Render (lib/render.js)**
- In the HUD section (after drawing scores), add combo display:
  - If `NP.state.combo >= 3` (only show meaningful combos):
    - Draw text like "3x COMBO" centered below scores
    - Neon glow effect with color cycling (hue shift based on time)
    - Scale up slightly with higher combos
  - If `NP.state.combo >= 10`: add extra particle sparkle effect

**Verification:** Play game, hit ball back and forth, see combo counter appear at 3+.

**Commit:** `feat: add combo counter with neon display`

---

### Phase 3: Animated Neon Signs

**Objective:** Decorative animated billboard-style neon signs on the top and bottom borders of the playfield with scrolling cyberpunk text.

**Files:**
- Modify: `lib/config.js` — add sign text/messages
- Modify: `lib/render.js` — draw scrolling neon signs

**Step 1: Config (lib/config.js)**
- Add `NEON_SIGNS` array with scrolling message strings:
  ```
  NEON_SIGNS: [
    'WELCOME TO THE GRID',
    'NEON PONG // 2084',
    'WATCH YOUR BACK',
    'THE FUTURE IS NOW',
    '/// SYSTEM ACTIVE ///',
    'PLAY OR BE PLAYED',
  ],
  ```
- Add `NEON_SIGN_SPEED: 30` (pixels per second scroll speed)

**Step 2: Render (lib/render.js)**
- In the main draw function (before paddle/ball drawing), add sign rendering:
  - Pick a message from `NP.config.NEON_SIGNS` based on `Math.floor(Date.now() / 8000) % NP.config.NEON_SIGNS.length` (rotates every 8s)
  - Draw on the top border (y = 4) with right-to-left scrolling marquee effect
  - Use `NP.state.scrollOffset` or `Date.now()` for offset
  - Neon cyan color (`#00ffff`) with glow shadow
  - Small font (12px scaled)
  - Also draw a second sign on the bottom border scrolling left-to-right with a different message

**Step 3: State init (lib/state.js)**
- Ensure `NP.state.signIndex` tracks which sign is active (or derive from time)

**Verification:** Open game, see scrolling neon text on top/bottom borders.

**Commit:** `feat: add animated neon marquee signs`

---

### Phase 4: Laser Grid Map Hazard

**Objective:** Sweeping horizontal/vertical lasers as a map hazard. Balls passing through a laser beam get teleported to a random y-position (same x-side).

**Files:**
- Modify: `lib/config.js` — add laser grid constants
- Modify: `lib/state.js` — add laser grid state
- Modify: `lib/logic.js` — add laser spawning, movement, ball collision
- Modify: `lib/render.js` — draw laser beams

**Step 1: Config (lib/config.js)**
```js
/* == Laser Grid Hazard == */
LASER_COUNT: 3,
LASER_WIDTH: 6,          // beam thickness
LASER_LENGTH: 40,        // how far the laser sweeps
LASER_SPEED: 120,        // sweep speed px/s
LASER_COOLDOWN_MIN: 15,  // seconds between laser phases
LASER_COOLDOWN_MAX: 30,
LASER_DURATION: 8,       // how long lasers are active
LASER_COLOR: '#ff0040',  // hot red
```

**Step 2: State (lib/state.js)**
- Add `NP.lasers = []` — array of laser objects
- Each laser: `{ x, y, angle, active, rotationSpeed, timer, cooldown, phase }`
- Add `NP.laserTimer = 0` and `NP.laserCooldown = 0` (or use per-laser timers)

**Step 3: Logic (lib/logic.js)**
- Add `updateLasers(dt)` function:
  - Manage cooldown → activate phase (spawn 3 lasers at random positions)
  - Each laser rotates (sweeps) at its own speed
  - Check collision with all balls:
    - For each ball, test if ball center is within `LASER_WIDTH/2` of the laser line segment
    - If hit: teleport ball to random y position on same side (preserve x-side relative position)
    - Small screen shake on teleport
    - Spawn particles at teleport point
  - Deactivate after `LASER_DURATION`, set new cooldown
- Wire into main loop: call `updateLasers(dt)` in the main update function

**Step 4: Render (lib/render.js)**
- In the main draw function (before balls, after background):
  - For each active laser:
    - Save context
    - Translate to laser position
    - Rotate by laser angle
    - Draw a glowing red beam rectangle (laser line with `LASER_WIDTH` thickness, `LASER_LENGTH` long)
    - Add shadow glow effect (`shadowBlur: 20, shadowColor: '#ff0040'`)
    - Draw small end-cap dots
    - Restore context

**Verification:** Open game, wait for lasers to activate, see rotating red beams, ball passes through and teleports.

**Commit:** `feat: add laser grid map hazard with ball teleport`

---

### Phase 5: Data Worm Map Hazard

**Objective:** A segmented worm that patrols the field edges. On contact with a ball, it "eats" the ball and spits it out at high speed in a random direction after a brief delay.

**Files:**
- Modify: `lib/config.js` — add worm constants
- Modify: `lib/state.js` — add worm state
- Modify: `lib/logic.js` — add worm AI, ball collision
- Modify: `lib/render.js` — draw segmented worm

**Step 1: Config (lib/config.js)**
```js
/* == Data Worm Hazard == */
WORM_SEGMENTS: 8,
WORM_SEGMENT_RADIUS: 10,
WORM_SPEED: 100,          // patrol speed px/s
WORM_PATROL_MARGIN: 30,   // how close to edge
WORM_EJECT_SPEED: 600,    // speed when spitting ball out
WORM_EJECT_DELAY: 0.3,    // seconds before spitting
WORM_COOLDOWN_MIN: 25,
WORM_COOLDOWN_MAX: 45,
WORM_DURATION: 12,
WORM_COLOR: '#39ff14',    // neon green
```

**Step 2: State (lib/state.js)**
- Add `NP.worm = null` — worm object when active
- Worm object shape: `{ segments: [{x, y}], active, life, cooldown, patrolAngle, eatenBall, eatenTimer }`

**Step 3: Logic (lib/logic.js)**
- Add `updateWorm(dt)` function:
  - Cooldown management: spawn worm when cooldown expires
  - Patrol: worm head follows a path around the field perimeter at `WORM_SPEED`
  - Body segments follow the head like a snake (each segment lerps toward the previous segment's position, maintaining `SEGMENT_RADIUS * 2` spacing)
  - Collision detection with balls:
    - Check head position against each ball
    - If hit: "eat" the ball — store it in `worm.eatenBall`, hide it (set `life = -1` or a special flag), start `worm.eatenTimer`
    - After `WORM_EJECT_DELAY`: spit ball out at `WORM_EJECT_SPEED` in a random direction, restore ball visibility, clear `worm.eatenBall`
    - Screen shake on eat and spit
  - Expire after `WORM_DURATION`, set new cooldown
- Wire into main loop

**Step 4: Render (lib/render.js)**
- In main draw function (after background, before balls):
  - If worm is active:
    - Draw each segment as a filled circle with neon glow
    - Head segment: brighter, slightly larger
    - Alternating color between segments (green/cyan or green/dark-green)
    - If a ball is eaten: draw a pulsing glow ring around the head
    - Draw connection lines between segments (thin, glowing)
    - Add data-stream particle trail behind tail

**Verification:** Open game, wait for worm to appear, see it patrol edges, ball contact gets eaten and spat out fast.

**Commit:** `feat: add data worm map hazard with eat-and-spit mechanic`

---

### Phase 6: Post-Match Stats

**Objective:** After game over, show a stats overlay with: final score, longest rally (max combo), fastest hit speed, power-ups collected, game duration.

**Files:**
- Modify: `lib/config.js` — no new constants needed
- Modify: `lib/state.js` — add tracking state
- Modify: `lib/engine.js` — add tracking increment helpers
- Modify: `lib/logic.js` — record stats during gameplay
- Modify: `lib/render.js` — draw stats on gameover screen
- Modify: `index.html` — add stats container in gameover screen
- Modify: `style.css` — style the stats
- Modify: `main.js` — connect stats display to gameover screen

**Step 1: State (lib/state.js)**
- Add to initial state:
  ```js
  NP.stats = {
    longestRally: 0,     // longest combo streak
    fastestHit: 0,       // fastest ball speed recorded
    powerupsCollected: 0, // total power-ups collected
    startTime: 0,        // Date.now() when game starts
    duration: 0,         // seconds the game lasted
  };
  ```

**Step 2: Tracking during gameplay (lib/logic.js)**
- In `reflectBallFor()`:
  - Track max combo: `NP.stats.longestRally = Math.max(NP.stats.longestRally, NP.state.combo)`
  - Track fastest hit: `NP.stats.fastestHit = Math.max(NP.stats.fastestHit, b.speed || 0)`
- In power-up collection (wherever `NP.callouts.push(...)` or `applyTimedEffect` happens):
  - Increment `NP.stats.powerupsCollected++`
- At game start (where `NP.state.screen = 'playing'`):
  - Set `NP.stats.startTime = Date.now()`
- On game over (in `checkWin()`):
  - Set `NP.stats.duration = Math.floor((Date.now() - NP.stats.startTime) / 1000)`

**Step 3: Render (lib/render.js)**
- In the `drawGameOver()` or gameover draw section:
  - Draw a translucent overlay
  - Draw stats below the winner text:
    ```
    ─── MATCH STATS ───
    Score:        7 - 5
    Longest Rally:  12
    Fastest Hit:   892 px/s
    Power-ups:      8
    Duration:     2m 34s
    ```
  - Neon cyan/green styling matching the cyberpunk theme

**Step 4: HTML/CSS (index.html, style.css)**
- In the `#gameover` screen div, add:
  ```html
  <div id="stats-container" class="stats-panel">
    <div id="stats-content"></div>
  </div>
  ```
- Style `.stats-panel` with glassmorphism background, neon border, monospace font

**Step 5: main.js**
- On gameover screen show: populate stats content from `NP.stats` into the DOM element
- Or alternatively, do it all in canvas (simpler, no DOM needed)
- Reset stats on new game start

**Verification:** Play game to completion, see stats on game over screen.

**Commit:** `feat: add post-match stats tracking and display`

---

### Phase 7: Wire Callouts & Final Integration

**Objective:** Wire the synth voice callouts from Phase 1 into all the appropriate events across the codebase.

**Files:**
- Modify: `lib/logic.js` — add callout triggers for events
- Modify: `lib/powerup.js` — add callout on power-up collection
- Verify: `lib/audio.js` — all callout functions exist

**Details:**
- In `lib/logic.js`:
  - `checkWin()`: add `NP.AudioEngine.sfxCallout('VICTORY')`
  - `updateKaiju()` on spawn: add `NP.AudioEngine.sfxCallout('KAI-JU')`
  - `updateDisco()` on spawn: add `NP.AudioEngine.sfxCallout('DIS-CO')`
  - `updateTimePocket()` on spawn: add `NP.AudioEngine.sfxCallout('TIME POCKET')`
  - Score point: add a short ascending tone (not a full callout, just a pitch blip)
- In `lib/powerup.js`:
  - On power-up collection (after `applyTimedEffect`): add `NP.AudioEngine.sfxCallout('BOOST')`

**Verification:** Play game, hear synth voice on events.

**Commit:** `feat: wire synth voice callouts to game events`

---

## Verification

After all phases:
1. Open `index.html` in browser
2. Play a full game
3. Verify: combo counter shows at 3+ hits
4. Verify: neon signs scroll on borders
5. Verify: laser grid appears and teleports balls
6. Verify: data worm patrols edges, eats and spits balls
7. Verify: game over screen shows post-match stats
8. Verify: synth voice callouts play on events
9. Run `node tools/smoke-test.js` — all tests pass
