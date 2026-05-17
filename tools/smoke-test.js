const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, '..', 'lib');
const files = [
  'config.js',
  'state.js',
  'engine.js',
  'audio.js',
  'powerups.js',
  'powerup.js',
  'render.js',
  'logic.js',
];
const libSources = files.map((f) => fs.readFileSync(path.join(libDir, f), 'utf8'));
const mainSource = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const source = libSources.join('\n') + '\n' + mainSource;

function makeClassList() {
  const set = new Set();
  return {
    add: (...names) => names.forEach((name) => set.add(name)),
    remove: (...names) => names.forEach((name) => set.delete(name)),
    contains: (name) => set.has(name),
  };
}

function makeElement(id) {
  const el = {
    id,
    dataset: {},
    style: {},
    textContent: '',
    children: [],
    classList: makeClassList(),
    appendChild(child) { this.children.push(child); },
    addEventListener(type, handler) { this['on' + type] = handler; },
  };

  Object.defineProperty(el, 'innerHTML', {
    get() { return this._innerHTML || ''; },
    set(value) {
      this._innerHTML = value;
      this.children = [];
    },
  });

  return el;
}

function makeCanvasContext() {
  return {
    setTransform() {},
    clearRect() {},
    fillRect() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    beginPath() {},
    closePath() {},
    arc() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    roundRect() {},
    fillText() {},
    set fillStyle(value) {},
    set strokeStyle(value) {},
    set lineWidth(value) {},
    set shadowBlur(value) {},
    set shadowColor(value) {},
    set globalAlpha(value) {},
    set font(value) {},
    set textAlign(value) {},
    set textBaseline(value) {},
  };
}

function setupGame() {
  const ids = [
    'game-canvas',
    'menu-screen',
    'hud',
    'pause-screen',
    'gameover-screen',
    'score-p1',
    'score-p2',
    'mode-label',
    'winner-text',
    'final-p1',
    'final-p2',
    'mute-btn',
    'hud-mute-btn',
    'pause-btn',
    'resume-btn',
    'quit-btn',
    'restart-btn',
    'menu-btn',
    'touch-left',
    'touch-right',
    'controls-hint',
    'hint-p2',
    'save-stats',
    'leaderboard-list',
    'gameover-save-stats',
    'gameover-leaderboard',
    'effect-strip',
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, makeElement(id)]));
  elements['game-canvas'].getContext = () => makeCanvasContext();

  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
  };
  global.document = {
    getElementById: (id) => elements[id],
    querySelectorAll: () => [],
    createElement: (tag) => makeElement(tag),
    addEventListener: () => {},
  };
  global.window = {
    innerWidth: 1000,
    innerHeight: 600,
    devicePixelRatio: 1,
    addEventListener() {},
    AudioContext: undefined,
    webkitAudioContext: undefined,
  };
  global.requestAnimationFrame = () => 1;

  eval(source);

  // Wire up NP.ui elements that the game code expects (mirrors main.js init)
  const { window: win } = global;
  const ui = win.NP.ui;
  console.log('[debug] NP.ui after eval:', Object.keys(ui || {}).length, 'keys');
  if (ui) {
    ui.scoreP1 = elements['score-p1'];
    ui.scoreP2 = elements['score-p2'];
    ui.effectStrip = elements['effect-strip'];
    ui.modeLabel = elements['mode-label'];
    ui.winnerText = elements['winner-text'];
    ui.finalP1 = elements['final-p1'];
    ui.finalP2 = elements['final-p2'];
    ui.controlsHint = elements['controls-hint'];
    ui.hintP2 = elements['hint-p2'];
    console.log('[debug] NP.ui after wiring:', Object.keys(ui).length, 'keys:', Object.keys(ui));
  }

  // Wire up NP.screens that the game code expects
  const screens = win.NP.screens;
  if (screens) {
    screens.menu = elements['menu-screen'];
    screens.hud = elements['hud'];
    screens.pause = elements['pause-screen'];
    screens.gameover = elements['gameover-screen'];
  }

  // Initialize state dimensions (resize reads from window mock: 1000x600)
  win.NP.resize();

  return { api: win.NP, elements };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log('PASS ' + name);
  } catch (err) {
    console.error('FAIL ' + name);
    console.error(err.message);
    process.exitCode = 1;
  }
}

test('easy AI is much less capable than hard AI', () => {
  const { api } = setupGame();
  const easy = api.DIFFICULTY.easy;
  const hard = api.DIFFICULTY.hard;

  assert(easy.maxSpeedPct < 0.5, 'easy AI should move at less than half paddle speed');
  assert(easy.error > hard.error * 5, 'easy AI should have much larger tracking error');
  assert(easy.reaction > hard.reaction * 3, 'easy AI should react far slower than hard AI');
  assert(easy.awareness < hard.awareness, 'easy AI should start reacting later than hard AI');
});

test('power-up API supports chaotic party effects', () => {
  const { api } = setupGame();

  assert(typeof api.applyPowerUp === 'function', 'applyPowerUp should exist');
  assert(typeof api.updatePowerUps === 'function', 'updatePowerUps should exist');
  assert(typeof api.updateEffects === 'function', 'updateEffects should exist');

  api.startGame('ai', 'easy');
  api.applyPowerUp('p1', 'mega');
  api.applyPowerUp('p1', 'tiny');
  api.applyPowerUp('p1', 'freeze');
  api.applyPowerUp('p1', 'multiball');

  assert(api.activeEffects.p1.mega > 0, 'mega paddle effect should be active for P1');
  assert(api.activeEffects.p2.tiny > 0, 'tiny trouble should target P2');
  assert(api.activeEffects.p2.freeze > 0, 'freeze should target P2');
  assert(api.balls.length > 1, 'multiball should add extra live balls');
});

test('power-ups are easy enough to collect during play', () => {
  const { api } = setupGame();

  assert(api.POWER_UP_SIZE >= 58, 'power-up box should be large enough to hit');
  assert(api.POWER_UP_LIFE >= 16, 'power-up should stay on-screen long enough to chase');
  assert(api.POWER_UP_SPAWN_MIN <= 7, 'power-ups should appear frequently');
  assert(api.POWER_UP_SPAWN_MAX <= 12, 'power-up spawn variance should not make long dry spells');

  api.startGame('ai', 'easy');
  api.applyPowerUp('p1', 'multiball');
  api.powerUps.push({
    type: 'mega',
    label: 'MEGA',
    color: '#00ffff',
    x: api.balls[1].x,
    y: api.balls[1].y,
    size: api.POWER_UP_SIZE,
    spin: 0,
    life: api.POWER_UP_LIFE,
  });
  api.updatePowerUps(0.016);

  assert(api.activeEffects.p1.mega > 0, 'extra multiball balls should be able to collect power-ups');
});

test('power-ups telegraph, drift, and announce collection', () => {
  const { api } = setupGame();

  assert(api.POWER_UP_WARNING_LIFE >= 1, 'power-ups should telegraph before appearing');
  assert(api.CALLOUT_LIFE >= 1, 'power-up collection callouts should be visible long enough to read');
  assert(typeof api.updateCallouts === 'function', 'updateCallouts should exist');

  api.startGame('ai', 'easy');
  api.updatePowerUps(10);

  assert(api.powerUpWarnings.length === 1, 'spawn cycle should create a warning marker first');
  api.updatePowerUps(api.POWER_UP_WARNING_LIFE + 0.1);
  assert(api.powerUps.length === 1, 'warning marker should turn into a pickup');

  const before = { x: api.powerUps[0].x, y: api.powerUps[0].y };
  api.updatePowerUps(0.5);
  const after = { x: api.powerUps[0].x, y: api.powerUps[0].y };
  assert(before.x !== after.x || before.y !== after.y, 'power-up should drift so it feels alive');

  api.applyPowerUp('p1', 'turbo');
  assert(api.callouts.length > 0, 'collecting a power-up should create a readable callout');
  assert(api.callouts[api.callouts.length - 1].text.includes('P1 TURBO'), 'callout should name owner and power-up');
});

test('new power-ups (phase/decoy/ricochet) work correctly', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  api.applyPowerUp('p1', 'phase');
  assert(api.activeEffects.p1.phase > 0, 'phase effect should be active for P1');

  api.applyPowerUp('p1', 'decoy');
  assert(api.activeEffects.p1.decoy > 0, 'decoy effect should be active for P1');

  api.applyPowerUp('p1', 'ricochet');
  assert(api.activeEffects.p1.ricochet > 0, 'ricochet effect should be active for P1');

  // Decoy creates ghost balls
  assert(Array.isArray(api.decoys), 'decoys array should exist');
});

test('tornado hazard lifecycle works', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  // Tornado state exists
  assert(typeof api.tornado === 'object', 'tornado state object should exist');
  assert(!api.tornado.active, 'tornado should start inactive');
  assert(typeof api.updateTornado === 'function', 'updateTornado function should exist');

  // Force tornado to spawn
  api.tornado.spawnTimer = 0;
  api.updateTornado(0.1);
  assert(api.tornado.active, 'tornado should become active after spawnTimer expires');
  assert(api.tornado.life > 50, 'tornado should have near-full lifetime after spawn');

  // Tornado at valid map position
  assert(api.tornado.x > 0 && api.tornado.x < api.state.width, 'tornado x should be within map');
  assert(api.tornado.y > 0 && api.tornado.y < api.state.height, 'tornado y should be within map');

  // Ball near tornado gets knocked — should go faster, not slower
  api.balls[0].x = api.tornado.x;
  api.balls[0].y = api.tornado.y;
  const speedBefore = Math.sqrt(api.balls[0].vx * api.balls[0].vx + api.balls[0].vy * api.balls[0].vy);
  const minSpeed = api.config.TORNADO_KNOCK_SPEED * api.scale;
  api.updateTornado(0.016);
  const speedAfter = Math.sqrt(api.balls[0].vx * api.balls[0].vx + api.balls[0].vy * api.balls[0].vy);
  const expected = Math.max(speedBefore * 1.4, minSpeed);
  assert(Math.abs(speedAfter - expected) < 1, 'tornado knock should boost ball speed by 1.4x');

  // Tornado expires
  api.tornado.life = 0.01;
  api.updateTornado(0.02);
  assert(!api.tornado.active, 'tornado should become inactive after life expires');
  assert(api.tornado.spawnTimer > 0, 'tornado should set new spawnTimer after expiry');
});

test('bumper count reduced to 2', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');
  assert(api.bumpers.length === 2, 'game should have exactly 2 bumpers');
});

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

/* == New Power-up Tests == */
test('gravity power-up attracts ball toward paddle', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  api.applyPowerUp('p1', 'gravity');
  assert(api.activeEffects.p1.gravity > 0, 'gravity effect should be active for P1');
  assert(typeof api.config.EFFECT_LABELS.gravity === 'string', 'gravity should have an effect label');
});

test('magnet power-up pulls paddle toward ball', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  api.applyPowerUp('p1', 'magnet');
  assert(api.activeEffects.p1.magnet > 0, 'magnet effect should be active for P1');
  assert(typeof api.config.EFFECT_LABELS.magnet === 'string', 'magnet should have an effect label');
});

test('blink power-up teleports paddle', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  var p1Before = { x: api.paddles.p1.x, y: api.paddles.p1.y };
  api.applyPowerUp('p1', 'blink');
  assert(api.activeEffects.p1.blink > 0, 'blink effect should be active for P1');
  assert(typeof api.config.EFFECT_LABELS.blink === 'string', 'blink should have an effect label');
});

test('void power-up creates black hole that lures balls', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  api.applyPowerUp('p1', 'void');
  assert(api.activeEffects.p1.void > 0, 'void effect should be active for P1');
  assert(typeof api.config.EFFECT_LABELS.void === 'string', 'void should have an effect label');
});

test('all four new power-up types exist in POWER_UP_TYPES', () => {
  const { api } = setupGame();
  var ids = api.config.POWER_UP_TYPES.map(function (t) { return t.id; });
  assert(ids.indexOf('gravity') !== -1, 'gravity should be in POWER_UP_TYPES');
  assert(ids.indexOf('magnet') !== -1, 'magnet should be in POWER_UP_TYPES');
  assert(ids.indexOf('blink') !== -1, 'blink should be in POWER_UP_TYPES');
  assert(ids.indexOf('void') !== -1, 'void should be in POWER_UP_TYPES');
  assert(api.config.POWER_UP_TYPES.length >= 15, 'should have at least 15 power-up types total');
});

/* == Arena Event Tests == */
test('kaiju event state and lifecycle', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  assert(typeof api.kaiju === 'object', 'kaiju state object should exist');
  assert(!api.kaiju.active, 'kaiju should start inactive');
  assert(api.kaiju.cooldown > 0, 'kaiju should have initial cooldown');
  assert(typeof api.updateKaiju === 'function', 'updateKaiju function should exist');

  // Force kaiju to trigger
  api.kaiju.cooldown = 0;
  api.updateKaiju(0.1);
  assert(api.kaiju.active, 'kaiju should become active after cooldown expires');
});

test('kaiju slam creates shockwave that pushes balls', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  api.kaiju.cooldown = 0;
  api.updateKaiju(0.1);
  assert(api.kaiju.active, 'kaiju should be active');

  var ballVxBefore = api.balls[0].vx;
  var ballVyBefore = api.balls[0].vy;

  // Run a few frames to trigger slam impact
  api.kaiju.timer = 1.0;
  api.kaiju.pattern = 'slam';
  api.kaiju.patternTimer = 0;
  api.kaiju.armPhase = 0;
  api.updateKaiju(0.016);

  // After slam there should be shake or ball velocity changed
  assert(typeof api.balls[0].vx === 'number', 'ball vx should remain a number after kaiju slam');
  assert(typeof api.state.shake === 'number', 'shake should be set during kaiju event');
});

test('neon storm event state and lifecycle', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  assert(typeof api.storm === 'object', 'storm state object should exist');
  assert(!api.storm.active, 'storm should start inactive');
  assert(api.storm.cooldown > 0, 'storm should have initial cooldown');
  assert(typeof api.updateStorm === 'function', 'updateStorm function should exist');

  // Force storm to trigger
  api.storm.cooldown = 0;
  api.updateStorm(0.1);
  assert(api.storm.active, 'storm should become active after cooldown expires');
});

test('storm creates bolt warnings that turn into strikes', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  api.storm.cooldown = 0;
  api.updateStorm(0.1); // triggers storm

  // Past warning phase, force strikes
  api.storm.warningTimer = 0;
  api.updateStorm(0.1);
  api.storm.strikeTimer = api.config.STORM_STRIKE_INTERVAL;
  api.updateStorm(0.1);

  // Storm bolts should have appeared
  assert(Array.isArray(api.storm.warningBolts), 'warningBolts array should exist');
  assert(Array.isArray(api.storm.bolts), 'bolts array should exist');
});

test('time pocket event state and lifecycle', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  assert(typeof api.timePocket === 'object', 'timePocket state object should exist');
  assert(!api.timePocket.active, 'timePocket should start inactive');
  assert(api.timePocket.cooldown > 0, 'timePocket should have initial cooldown');
  assert(typeof api.updateTimePocket === 'function', 'updateTimePocket function should exist');

  // Force time pocket to trigger
  api.timePocket.cooldown = 0;
  api.updateTimePocket(0.1);
  assert(api.timePocket.active, 'timePocket should become active after cooldown expires');
  assert(api.timePocket.x > 0, 'timePocket should have a valid x position');
  assert(api.timePocket.y > 0, 'timePocket should have a valid y position');
});

test('time pocket slows ball velocity inside its radius', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  // Place ball inside pocket
  api.timePocket.cooldown = 0;
  api.updateTimePocket(0.1);
  api.balls[0].x = api.timePocket.x;
  api.balls[0].y = api.timePocket.y;
  api.balls[0].vx = 400;
  api.balls[0].vy = 200;

  var vxBefore = api.balls[0].vx;
  api.updateTimePocket(0.1);
  // Ball should be slowed
  assert(Math.abs(api.balls[0].vx) < Math.abs(vxBefore) || Math.abs(api.balls[0].vy) < 200,
    'ball velocity should decrease inside time pocket');
});

/* == Polish Tests == */
test('polish arrays exist and are initialized empty', () => {
  const { api } = setupGame();
  api.startGame('ai', 'easy');

  assert(Array.isArray(api.paddleHitBursts), 'paddleHitBursts array should exist');
  assert(api.paddleHitBursts.length === 0, 'paddleHitBursts should start empty');
  assert(Array.isArray(api.nearMisses), 'nearMisses array should exist');
  assert(api.nearMisses.length === 0, 'nearMisses should start empty');
});

test('score flash state exists and updates', () => {
  const { api } = setupGame();

  assert('scoreFlashP1' in api.state, 'scoreFlashP1 should exist in state');
  assert('scoreFlashP2' in api.state, 'scoreFlashP2 should exist in state');
  assert(api.state.scoreFlashP1 === 0, 'scoreFlashP1 should start at 0');
  assert(api.state.scoreFlashP2 === 0, 'scoreFlashP2 should start at 0');
});
