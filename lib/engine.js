/**
 * Neon Pong — Engine Core
 * State, constants, save/load, and shared utilities.
 */
(function () {
  'use strict';

  var NP = window.NP || (window.NP = {});

  /* == Constants == */
  NP.WIN_SCORE = 10;
  NP.PADDLE_WIDTH = 14;
  NP.PADDLE_HEIGHT_RATIO = 0.18;
  NP.BALL_RADIUS = 8;
  NP.INITIAL_SPEED = 480;
  NP.SPEED_INCREMENT = 24;
  NP.MAX_SPEED = 1000;
  NP.POWER_UP_SIZE = 62;
  NP.POWER_UP_LIFE = 18;
  NP.POWER_UP_SPAWN_MIN = 6;
  NP.POWER_UP_SPAWN_MAX = 11;
  NP.POWER_UP_WARNING_LIFE = 1.4;
  NP.CALLOUT_LIFE = 1.8;

  NP.COLORS = {
    bg: '#0a0a0f', grid: 'rgba(0, 255, 255, 0.06)',
    paddleP1: '#00ffff', paddleP2: '#ff00ff',
    ball: '#f0e100', ballTrail: 'rgba(240, 225, 0, 0.35)',
    particle: ['#00ffff', '#ff00ff', '#f0e100', '#b026ff'],
  };

  NP.POWER_UP_TYPES = [
    { id: 'mega', label: 'MEGA', color: '#00ffff' },
    { id: 'tiny', label: 'TINY', color: '#ff00ff' },
    { id: 'turbo', label: 'TURBO', color: '#f0e100' },
    { id: 'glitch', label: 'GLITCH', color: '#b026ff' },
    { id: 'reverse', label: 'REVERSE', color: '#ff5c8a' },
    { id: 'freeze', label: 'FREEZE', color: '#4fc3f7' },
    { id: 'multiball', label: 'MULTI', color: '#ffffff' },
  ];

  NP.EFFECT_LABELS = {
    mega: 'Mega Paddle', tiny: 'Tiny Trouble', turbo: 'Turbo Ball',
    glitch: 'Glitch Bounce', reverse: 'Reverse', freeze: 'Freeze',
    slow: 'Slow Field', multiball: 'Multiball',
  };

  NP.DIFFICULTY = {
    easy:   { reaction: 0.46, maxSpeedPct: 0.42, error: 0.34, awareness: 0.42 },
    normal: { reaction: 0.22, maxSpeedPct: 0.76, error: 0.14, awareness: 0.68 },
    hard:   { reaction: 0.08, maxSpeedPct: 1.06, error: 0.035, awareness: 0.9 },
  };

  var SAVE_KEY = 'neon-pong-save-v1';
  var DEFAULT_SAVE = {
    gamesPlayed: 0, p1Wins: 0, aiWins: 0, p2Wins: 0, leaderboard: [],
  };

  function makePaddle(side) {
    var s = NP.scale;
    const h = Math.max(60 * s, NP.state.height * NP.PADDLE_HEIGHT_RATIO);
    return {
        side, // 'left' | 'right'
        x: side === 'left' ? NP.PADDLE_WIDTH * 2 * s : NP.state.width - NP.PADDLE_WIDTH * 3 * s,
        y: NP.state.height / 2 - h / 2,
        w: Math.round(NP.PADDLE_WIDTH * s),
        h,
        vy: 0,
        speed: Math.round(720 * s),
        color: side === 'left' ? NP.COLORS.paddleP1 : NP.COLORS.paddleP2,
        glow: side === 'left' ? '#00ffff' : '#ff00ff',
    };
}

function makeBall() {
    var s = NP.scale;
    const dir = Math.random() > 0.5 ? 1 : -1;
    const angle = (Math.random() - 0.5) * (Math.PI / 3);
    return {
        x: NP.state.width / 2,
        y: NP.state.height / 2,
        r: Math.round(NP.BALL_RADIUS * s),
        vx: Math.cos(angle) * NP.INITIAL_SPEED * s * dir,
        vy: Math.sin(angle) * NP.INITIAL_SPEED * s,
        speed: NP.INITIAL_SPEED * s,
        baseSpeed: NP.INITIAL_SPEED * s,
        hits: 0,
        isMain: true,
        life: Infinity,
    };
}

function makeExtraBall(source, angleOffset) {
    var s = NP.scale;
    const speed = Math.max(NP.INITIAL_SPEED * s * 0.82, source.speed * 0.78);
    const angle = Math.atan2(source.vy, source.vx) + angleOffset;
    return {
        x: source.x,
        y: source.y,
        r: Math.max(4, Math.round(source.r * 0.62)),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed,
        baseSpeed: speed,
        hits: 0,
        isMain: false,
        life: 6,
    };
}

  /* == Scale == */
  NP.scale = 1;

  /* == State == */
  NP.state = {
    screen: 'menu', mode: 'ai', difficulty: 'normal',
    muted: false, width: 0, height: 0, lastTime: 0,
    shake: 0, shakeDecay: 0, gridOffset: 0, scoreLimit: NP.WIN_SCORE, flash: 0,
  };

  NP.screens = {};
  NP.ui = {};
  NP.scores = { p1: 0, p2: 0 };
  NP.paddles = { p1: null, p2: null };
  NP.ball = null;
  NP.balls = [];
  NP.particles = [];
  NP.trails = [];
  NP.powerUps = [];
  NP.powerUpWarnings = [];
  NP.callouts = [];
  NP.activeEffects = { p1: {}, p2: {}, global: {} };
  NP.lastHitBy = 'p1';
  NP.powerUpTimer = 8;
  NP.input = { w: false, s: false, up: false, down: false, p1TouchY: null, p2TouchY: null };

  /* == Save == */
  NP.saveData = loadSave();

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULT_SAVE };
      var parsed = JSON.parse(raw);
      return { ...DEFAULT_SAVE, ...parsed,
        leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
      };
    } catch { return { ...DEFAULT_SAVE }; }
  }

  function saveGameData() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(NP.saveData)); } catch {}
  }

  function formatMode(entry) {
    return entry.mode === 'ai' ? 'AI ' + entry.difficulty.toUpperCase() : '2P LOCAL';
  }

  function renderLeaderboard(target) {
    if (!target) return;
    target.innerHTML = '';
    var entries = NP.saveData.leaderboard.slice(0, 5);
    if (!entries.length) {
      var li = document.createElement('li');
      li.textContent = 'No saved wins yet';
      target.appendChild(li);
      return;
    }
    entries.forEach(function (entry) {
      var el = document.createElement('li');
      el.textContent = entry.winner + ' ' + entry.score + ' - ' + formatMode(entry);
      target.appendChild(el);
    });
  }

  function updateSaveUI(target) {
    var record = NP.saveData.p1Wins + '-' + (NP.saveData.aiWins + NP.saveData.p2Wins);
    var stats = 'Save file: ' + NP.saveData.gamesPlayed + ' games | P1 record ' + record;
    if (target.saveStats) target.saveStats.textContent = stats;
    if (target.gameoverSaveStats) target.gameoverSaveStats.textContent = stats;
    renderLeaderboard(target.leaderboardList);
    renderLeaderboard(target.gameoverLeaderboard);
  }

  function recordGameResult(winner) {
    var winnerName = winner === 'p1' ? 'P1' : (NP.state.mode === 'ai' ? 'AI' : 'P2');
    NP.saveData.gamesPlayed++;
    if (winner === 'p1') NP.saveData.p1Wins++;
    else if (NP.state.mode === 'ai') NP.saveData.aiWins++;
    else NP.saveData.p2Wins++;
    NP.saveData.leaderboard.push({
      winner: winnerName, score: NP.scores.p1 + '-' + NP.scores.p2,
      mode: NP.state.mode, difficulty: NP.state.difficulty,
      margin: Math.abs(NP.scores.p1 - NP.scores.p2), at: Date.now(),
    });
    NP.saveData.leaderboard.sort(function (a, b) {
      return a.margin !== b.margin ? b.margin - a.margin : b.at - a.at;
    });
    NP.saveData.leaderboard = NP.saveData.leaderboard.slice(0, 5);
    saveGameData();
    updateSaveUI(NP.ui);
  }

  NP.clamp = function (val, lo, hi) { return Math.max(lo, Math.min(hi, val)); };
  NP.loadSave = loadSave;
  NP.saveGameData = saveGameData;
  NP.formatMode = formatMode;
  NP.renderLeaderboard = renderLeaderboard;
  NP.updateSaveUI = updateSaveUI;
  NP.recordGameResult = recordGameResult;
  NP.makePaddle = makePaddle;
  NP.makeBall = makeBall;
  NP.makeExtraBall = makeExtraBall;
  NP.opponentOf = function (owner) { return owner === 'p1' ? 'p2' : 'p1'; };

})();
