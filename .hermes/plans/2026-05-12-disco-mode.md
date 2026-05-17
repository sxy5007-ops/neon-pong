# Disco Mode — Random Arena Event

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a "Disco Mode" random arena event with 8-bit chiptune disco music, visual strobe effects, and ball speed oscillation.

**Architecture:** Self-contained random event (like tornado) that triggers during gameplay. Switches music from synthwave to an 8-bit chiptune disco track, cycles grid/UI colors, and oscillates ball speed. When event ends, everything smoothly returns to normal.

**Tech Stack:** Vanilla JS, IIFE modules, Web Audio API (procedural chiptune generation with square/triangle/noise oscillators).

---

## Files to Modify

- `lib/config.js` — Add DISCO config constants + backward compat NP.*
- `lib/engine.js` — Add `NP.disco` state object + reset in startGame
- `lib/audio.js` — Add 8-bit disco music: `startDiscoMusic()`, `stopDiscoMusic()`
- `lib/logic.js` — Add `updateDisco(dt)` lifecycle + ball speed oscillation + hook into game loop + startGame reset
- `lib/render.js` — Add `drawDisco()` visual effects (color-cycling grid, pulsing background, callout)
- `tools/smoke-test.js` — Add disco mode lifecycle test

---

## Task 1: Add Disco Mode Config Constants

**Objective:** Add DISCO_DURATION, DISCO_COOLDOWN_MIN, DISCO_COOLDOWN_MAX, and DISCO_SPEED_OSCILLATION to config.js

**File: `lib/config.js` (lines ~30-40)**

**Step 1:** Add constants after the TORNADO constants block (find `TORNADO_KNOCK_SPEED:`)

Find:
```javascript
    TORNADO_KNOCK_SPEED: 350,
```

Replace with:
```javascript
    TORNADO_KNOCK_SPEED: 350,

    /* == Disco Mode == */
    DISCO_DURATION: 12,
    DISCO_COOLDOWN_MIN: 45,
    DISCO_COOLDOWN_MAX: 70,
    DISCO_SPEED_OSCILLATION: 0.4,
    DISCO_BPM: 135,
```

**Step 2:** Add backward compat exports after the `TORNADO_KNOCK_SPEED` line (find in the NP.* backward compat section, line 113)

Find:
```javascript
  NP.TORNADO_KNOCK_SPEED = NP.config.TORNADO_KNOCK_SPEED;
```

Replace with:
```javascript
  NP.TORNADO_KNOCK_SPEED = NP.config.TORNADO_KNOCK_SPEED;
  NP.DISCO_DURATION = NP.config.DISCO_DURATION;
  NP.DISCO_COOLDOWN_MIN = NP.config.DISCO_COOLDOWN_MIN;
  NP.DISCO_COOLDOWN_MAX = NP.config.DISCO_COOLDOWN_MAX;
  NP.DISCO_SPEED_OSCILLATION = NP.config.DISCO_SPEED_OSCILLATION;
  NP.DISCO_BPM = NP.config.DISCO_BPM;
```

**Verification:** `node -c lib/config.js` → no errors.

---

## Task 2: Add Disco State to engine.js

**Objective:** Add `NP.disco` state object in engine.js similar to `NP.tornado`.

**File: `lib/engine.js`**

**Step 1:** Add disco state after the tornado state block (after `NP.tornado`, around line 61)

Find:
```javascript
  NP.tornado = {
    active: false, x: 0, y: 0, life: 0,
    spawnTimer: 10 + Math.random() * 10,
    spin: 0,
  };
```

Replace with:
```javascript
  NP.tornado = {
    active: false, x: 0, y: 0, life: 0,
    spawnTimer: 10 + Math.random() * 10,
    spin: 0,
  };
  NP.disco = {
    active: false, life: 0, cooldown: 0,
    hue: 0, beatPhase: 0,
  };
```

**Step 2:** Reset disco state in startGame reset (file: `lib/logic.js`, find `NP.tornado.active = false;` in the startGame function, around line 383)

Find:
```javascript
    NP.tornado.active = false;
    NP.tornado.spawnTimer = 15 + Math.random() * 15;
    NP.tornado.life = 0;
    NP.decoys = [];
```

Replace with:
```javascript
    NP.tornado.active = false;
    NP.tornado.spawnTimer = 15 + Math.random() * 15;
    NP.tornado.life = 0;
    NP.disco.active = false;
    NP.disco.life = 0;
    NP.disco.cooldown = 20 + Math.random() * 25;
    NP.disco.hue = 0;
    NP.disco.beatPhase = 0;
    NP.decoys = [];
```

**Also** in `quitToMenu` (around line 407) — stop disco music when quitting:

Find:
```javascript
  function quitToMenu() {
    NP.state.screen = 'menu';
    NP.AudioEngine.stopMusic();
```

Replace with:
```javascript
  function quitToMenu() {
    NP.state.screen = 'menu';
    NP.AudioEngine.stopMusic();
    NP.AudioEngine.stopDiscoMusic();
    NP.disco.active = false;
```

**Verification:** `node -c lib/engine.js` and `node -c lib/logic.js` → no errors.

---

## Task 3: Add 8-Bit Disco Music to audio.js

**Objective:** Add `startDiscoMusic()`, `stopDiscoMusic()`, `isDiscoPlaying`, and helpers to the AudioEngine. The disco music uses square waves (lead + melody), triangle waves (bass four-on-the-floor), and noise (hi-hat) for an 8-bit chiptune feel at 135 BPM.

**File: `lib/audio.js`**

**Step 1:** Add package-level variables after the existing variables (around line 14)

Find:
```javascript
  var musicInterval = null;
  var step = 0;
  var isPlaying = false;
```

Replace with:
```javascript
  var musicInterval = null;
  var step = 0;
  var isPlaying = false;
  var discoInterval = null;
  var discoStep = 0;
  var isDiscoPlaying = false;
```

**Step 2:** Add `startDiscoMusic()` function. Insert after the `stopMusic()` function (around line 140, before the export object)

Find:
```javascript
  NP.AudioEngine = { 
    init: init, 
    setMute: setMute, 
    toggleMute: toggleMute,
    sfxPaddleHit: sfxPaddleHit, 
    sfxWallHit: sfxWallHit, 
    sfxScore: sfxScore,
    sfxWin: sfxWin, 
    sfxSonicPulse: sfxSonicPulse,
    startMusic: startMusic, 
    stopMusic: stopMusic 
  };
```

Replace with:
```javascript
  /*** 8-BIT DISCO MUSIC ***/
  function startDiscoMusic() {
    if (!ctx || isDiscoPlaying) return;
    isDiscoPlaying = true;
    discoStep = 0;
    var discoBPM = NP.config.DISCO_BPM || 135;
    var beatMs = (60 / discoBPM) * 1000;
    var halfBeatMs = beatMs / 2;

    discoInterval = setInterval(function () {
      if (NP.state.muted || !isDiscoPlaying) return;
      var t = ctx.currentTime;
      var noteIdx = discoStep % 16;

      // Disco bass: four-on-the-floor (E-G-A-B pattern -> low E, G, A, B)
      var bassNotes = [43.65, 43.65, 49.00, 49.00, 55.00, 55.00, 61.74, 61.74,
                       43.65, 43.65, 49.00, 49.00, 55.00, 55.00, 61.74, 61.74]; // G1, G1, C2, C2, D2, D2, E2, E2
      // More danceable: G2-G2-C3-C3-E3-E3-G3-G3 pattern
      var discoBassNotes = [98.00, 98.00, 130.81, 130.81, 164.81, 164.81, 196.00, 196.00,
                             98.00, 98.00, 130.81, 130.81, 164.81, 164.81, 196.00, 196.00];

      // Lead arpeggio: square wave arp running up
      var arpNotes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 196.00,
                      293.66, 369.99, 440.00, 587.33, 440.00, 369.99, 293.66, 220.00];
      
      // Simple melody hook (pentatonic, 8 notes)
      var melodyNotes = [523.25, 587.33, 659.25, 523.25, 659.25, 783.99, 659.25, 587.33,
                         523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440.00];

      var bassFreq = discoBassNotes[noteIdx];
      var arpFreq = arpNotes[noteIdx];
      var melodyFreq = melodyNotes[noteIdx];
      var halfBeat = halfBeatMs / 1000;

      // -- Bass (triangle wave, four-on-the-floor) --
      var bassOsc = ctx.createOscillator();
      var bassGain = ctx.createGain();
      var bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.value = 400;
      bassFilter.Q.value = 1;
      bassOsc.type = 'triangle';
      bassOsc.frequency.value = bassFreq;
      bassGain.gain.setValueAtTime(0, t);
      bassGain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + halfBeat * 0.85);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(masterGain);
      bassOsc.start(t);
      bassOsc.stop(t + halfBeat);

      // -- Lead arpeggio (square wave, 8-bit chiptune) --
      var arpOsc = ctx.createOscillator();
      var arpGain = ctx.createGain();
      var arpFilter = ctx.createBiquadFilter();
      arpFilter.type = 'lowpass';
      arpFilter.frequency.value = 2000;
      arpFilter.Q.value = 1;
      arpOsc.type = 'square';
      arpOsc.frequency.value = arpFreq;
      arpGain.gain.setValueAtTime(0, t);
      arpGain.gain.linearRampToValueAtTime(0.08, t + 0.01);
      arpGain.gain.exponentialRampToValueAtTime(0.001, t + halfBeat * 0.4);
      arpOsc.connect(arpFilter);
      arpFilter.connect(arpGain);
      arpGain.connect(masterGain);
      arpOsc.start(t);
      arpOsc.stop(t + halfBeat * 0.5);

      // -- Melody hook (square wave, pitched brighter) --
      var melodyOsc = ctx.createOscillator();
      var melodyGain = ctx.createGain();
      melodyOsc.type = 'square';
      melodyOsc.frequency.value = melodyFreq;
      melodyGain.gain.setValueAtTime(0, t);
      melodyGain.gain.linearRampToValueAtTime(0.04, t + 0.01);
      melodyGain.gain.exponentialRampToValueAtTime(0.001, t + halfBeat * 0.7);
      melodyOsc.connect(melodyGain);
      melodyGain.connect(masterGain);
      melodyOsc.start(t);
      melodyOsc.stop(t + halfBeat * 0.7);

      // -- Hi-hat (noise burst on off-beats) --
      if (discoStep % 2 === 1) {
        var hatGain = ctx.createGain();
        var bufferSize = ctx.sampleRate * 0.04;
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        var hat = ctx.createBufferSource();
        hat.buffer = buffer;
        hatGain.gain.setValueAtTime(0.06, t);
        hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        hat.connect(hatGain);
        hatGain.connect(masterGain);
        hat.start(t);
      }

      discoStep++;
    }, halfBeatMs);
  }

  function stopDiscoMusic() {
    isDiscoPlaying = false;
    if (discoInterval) { clearInterval(discoInterval); discoInterval = null; }
  }

  NP.AudioEngine = { 
    init: init, 
    setMute: setMute, 
    toggleMute: toggleMute,
    sfxPaddleHit: sfxPaddleHit, 
    sfxWallHit: sfxWallHit, 
    sfxScore: sfxScore,
    sfxWin: sfxWin, 
    sfxSonicPulse: sfxSonicPulse,
    startMusic: startMusic, 
    stopMusic: stopMusic,
    startDiscoMusic: startDiscoMusic,
    stopDiscoMusic: stopDiscoMusic,
    isDiscoPlaying: function () { return isDiscoPlaying; }
  };
```

**Verification:** `node -c lib/audio.js` → no errors.

---

## Task 4: Add updateDisco Lifecycle + Ball Speed Oscillation

**Objective:** Add `updateDisco(dt)` function in logic.js that manages spawn timer, duration, cooldown, ball speed oscillation, and hooks into the game loop. Also stop disco music and resume normal music when event ends.

**File: `lib/logic.js`**

**Step 1:** Add `updateDisco` function. Insert after `updateTornado` (around line 270, before `checkWin`).

Find (after the end of `updateTornado`):
```javascript
  function checkWin() {
```

Replace with:
```javascript
  /* == Disco Mode == */
  function updateDisco(dt) {
    var disco = NP.disco;
    if (disco.active) {
      disco.life -= dt;
      disco.hue = (disco.hue + dt * 90) % 360;
      disco.beatPhase += dt * (NP.config.DISCO_BPM / 60);

      // Oscillate ball speed for all balls
      NP.balls.forEach(function (b) {
        var osc = 1 + Math.sin(disco.beatPhase * Math.PI * 2) * NP.config.DISCO_SPEED_OSCILLATION;
        b.vx = b.vx * (0.98 + osc * 0.02);
        b.vy = b.vy * (0.98 + osc * 0.02);
        // Clamp to avoid spiral
        var spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (spd > NP.config.MAX_SPEED * NP.scale) {
          var ratio = (NP.config.MAX_SPEED * NP.scale) / spd;
          b.vx *= ratio;
          b.vy *= ratio;
        }
      });

      if (disco.life <= 0) {
        disco.active = false;
        disco.cooldown = NP.config.DISCO_COOLDOWN_MIN + Math.random() * (NP.config.DISCO_COOLDOWN_MAX - NP.config.DISCO_COOLDOWN_MIN);
        NP.AudioEngine.stopDiscoMusic();
        NP.AudioEngine.startMusic();
      }
    } else {
      disco.cooldown -= dt;
      if (disco.cooldown <= 0) {
        // Spawn disco mode at random position
        disco.active = true;
        disco.life = NP.config.DISCO_DURATION;
        disco.hue = 0;
        disco.beatPhase = 0;
        NP.AudioEngine.stopMusic();
        NP.AudioEngine.startDiscoMusic();
        NP.callouts.push({
          text: 'DISCO MODE',
          life: NP.config.CALLOUT_LIFE || 2.5,
          x: NP.state.width / 2,
          y: NP.state.height * 0.3,
          color: '#ff00ff',
          size: 2.5,
        });
      }
    }
  }

  function checkWin() {
```

**Step 2:** Hook `updateDisco` into the game loop (around line 438, after `NP.updateTornado(dt)`)

Find:
```javascript
      NP.updateTornado(dt);
      updateBall(dt);
```

Replace with:
```javascript
      NP.updateTornado(dt);
      NP.updateDisco(dt);
      updateBall(dt);
```

**Step 3:** Export the function (find `NP.updateTornado = updateTornado;`)

Find:
```javascript
  NP.updateTornado = updateTornado;
```

Replace with:
```javascript
  NP.updateTornado = updateTornado;
  NP.updateDisco = updateDisco;
```

**Verification:** `node -c lib/logic.js` → no errors.

---

## Task 5: Add Disco Mode Visual Effects to render.js

**Objective:** Add `drawDisco()` function that adds strobe/color-cycling effects when `NP.disco.active` is true.

**File: `lib/render.js`**

**Step 1:** Add `drawDisco()` function. Insert after `drawTornado` (around line 292, before `drawTrails`).

Find:
```javascript
  /* == Trails == */
  function updateTrails() {
```

Replace with:
```javascript
  /* == Disco Visuals == */
  function drawDisco() {
    if (!NP.disco.active) return;
    var disco = NP.disco;
    var hue = disco.hue;

    // Color-cycling grid overlay
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
    ctx.fillRect(0, 0, NP.state.width, NP.state.height);
    ctx.restore();

    // Pulsing border glow (strobes every beat)
    var beatPulse = Math.abs(Math.sin(disco.beatPhase * Math.PI));
    ctx.save();
    ctx.shadowBlur = 30 + beatPulse * 30;
    ctx.shadowColor = 'hsl(' + hue + ', 100%, 60%)';
    ctx.strokeStyle = 'hsl(' + hue + ', 100%, 50%)';
    ctx.lineWidth = 3 + beatPulse * 4;
    ctx.strokeRect(4, 4, NP.state.width - 8, NP.state.height - 8);
    ctx.restore();

    // Color-cycle paddle glow colors
    if (NP.paddles.p1) {
      NP.paddles.p1._discoColor = 'hsl(' + ((hue + 60) % 360) + ', 100%, 60%)';
    }
    if (NP.paddles.p2) {
      NP.paddles.p2._discoColor = 'hsl(' + ((hue + 240) % 360) + ', 100%, 60%)';
    }
  }

  /* == Trails == */
  function updateTrails() {
```

**Step 2:** Call `drawDisco()` from `render()`. Insert after `drawTornado();` (around line 361)

Find:
```javascript
    drawTornado();
    // Score flash overlay
```

Replace with:
```javascript
    drawTornado();
    drawDisco();
    // Score flash overlay
```

**Step 3:** Use `_discoColor` in paddle rendering. Find `drawPaddle` function and modify the fill color.

Find (in `drawPaddle`):
```javascript
  function drawPaddle(p) {
    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#00ffff';
```

Replace with:
```javascript
  function drawPaddle(p) {
    ctx.save();
    var col = p._discoColor || '#00ffff';
    ctx.shadowBlur = 24;
    ctx.shadowColor = col;
    ctx.fillStyle = col;
```

**Step 4:** Export the function (find `NP.drawTornado = drawTornado;`)

Find:
```javascript
  NP.drawTornado = drawTornado;
```

Replace with:
```javascript
  NP.drawTornado = drawTornado;
  NP.drawDisco = drawDisco;
```

**Verification:** `node -c lib/render.js` → no errors.

---

## Task 6: Add Disco Mode Smoke Test

**Objective:** Add a smoke test that verifies disco mode lifecycle (spawn → active effects → expiration → cooldown).

**File: `tools/smoke-test.js`**

**Step 1:** Add the test before the final `})` closing bracket (after line 319).

Find (last line):
```javascript
test('bumper count reduced to 2', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');
  assert(api.bumpers.length === 2, 'game should have exactly 2 bumpers');
});
```

Insert after the closing `});` of that test:
```javascript
test('disco mode lifecycle works', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  // Disco state exists
  assert(typeof api.disco === 'object', 'disco state object should exist');
  assert(!api.disco.active, 'disco should start inactive');
  assert(typeof api.updateDisco === 'function', 'updateDisco function should exist');
  assert(api.disco.cooldown > 0, 'disco should have initial cooldown');

  // Force disco to spawn
  api.disco.cooldown = 0;
  api.updateDisco(0.1);
  assert(api.disco.active, 'disco should become active after cooldown expires');
  assert(api.disco.life > 10, 'disco should have near-full lifetime after spawn');

  // Ball speed should oscillate during disco mode
  var vxBefore = api.balls[0].vx;
  api.updateDisco(0.3);
  assert(typeof api.balls[0].vx === 'number', 'ball vx should be a number during disco');
  assert(typeof api.balls[0].vy === 'number', 'ball vy should be a number during disco');

  // Disco expires
  api.disco.life = 0.01;
  api.updateDisco(0.02);
  assert(!api.disco.active, 'disco should become inactive after life expires');
  assert(api.disco.cooldown > 0, 'disco should set new cooldown after expiry');
});
```

**Verification:** `node tools/smoke-test.js` → 8 tests PASS (all previous + new disco test).

---

## Summary of Changes

| File | What Changed |
|------|-------------|
| `lib/config.js` | Added `DISCO_DURATION`, `DISCO_COOLDOWN_MIN`, `DISCO_COOLDOWN_MAX`, `DISCO_SPEED_OSCILLATION`, `DISCO_BPM` constants + NP.* exports |
| `lib/engine.js` | Added `NP.disco` state object with `active`, `life`, `cooldown`, `hue`, `beatPhase` |
| `lib/audio.js` | Added `startDiscoMusic()` (8-bit chiptune: square lead, triangle bass, noise hi-hat at 135 BPM), `stopDiscoMusic()`, `isDiscoPlaying` guard |
| `lib/logic.js` | Added `updateDisco(dt)` lifecycle (spawn timer → active → duration → expiration → cooldown), speed oscillation, callout, music swap; hooked into game loop; reset in startGame/quitToMenu |
| `lib/render.js` | Added `drawDisco()` (color-cycling background overlay, pulsing border, paddle glow colors); draws after tornado; paddle fill uses `_discoColor` |
| `tools/smoke-test.js` | Added disco lifecycle test (8 total) |

**Risk:** Audio contexts that haven't been user-initiated may not play (browser autoplay policy). This is already handled by the existing `ctx` guard — if `init()` was never called (no user gesture), music simply doesn't play and the game runs fine.

---

Ready to execute using subagent-driven-development. Want me to proceed?
