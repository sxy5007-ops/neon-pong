const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, '..', 'lib');
const files = [
  'engine.js',
  'audio.js',
  'powerups.js',
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
  return { api: window.NP, elements };
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
