/**
 * Neon Pong — Engine Core
 * State, constants, save/load, and shared utilities.
 */
(function () {
  'use strict';

  var NP = window.NP || (window.NP = {});

  /* == Config constants loaded from lib/config.js (backward compat NP.* assignments) == */
  var SAVE_KEY = 'neon-pong-save-v1';
  var SETTINGS_KEY = 'neon-pong-settings-v1';
  var DEFAULT_SAVE = {
    gamesPlayed: 0, p1Wins: 0, aiWins: 0, p2Wins: 0, leaderboard: [],
  };




  /* == Scale == */
  NP.scale = 1;

  /* == Bumpers == */
  function generateBumpers() {
    var s = NP.scale;
    var bumpers = [];
    var marginX = NP.state.width * 0.2;
    var marginY = NP.state.height * 0.15;
    var colors = ['#00ffff', '#ff00ff', '#f0e100', '#4fc3f7', '#ff6b35', '#b026ff'];
    for (var i = 0; i < NP.config.BUMPER_COUNT; i++) {
      bumpers.push({
        x: marginX + Math.random() * (NP.state.width - marginX * 2),
        y: marginY + Math.random() * (NP.state.height - marginY * 2),
        r: Math.round(NP.config.BUMPER_RADIUS * s),
        color: colors[i % colors.length],
        glowPhase: Math.random() * Math.PI * 2,
      });
    }
    return bumpers;
  }

  /* == State == */


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
  NP.bumpers = [];
  NP.decoys = [];
  NP.callouts = [];
  NP.tornado = {
    active: false, x: 0, y: 0, life: 0,
    spawnTimer: 10 + Math.random() * 10,
    spin: 0,
  };
  NP.disco = {
    active: false, life: 0, cooldown: 0,
    hue: 0, beatPhase: 0,
  };
  NP.kaiju = {
    active: false, timer: 0,
    cooldown: NP.config.KAIJU_COOLDOWN_MIN + Math.random() * (NP.config.KAIJU_COOLDOWN_MAX - NP.config.KAIJU_COOLDOWN_MIN),
    pattern: 'slam', patternTimer: 0,
    armX: 0, armY: 0, armTargetX: 0, armTargetY: 0,
    armPhase: 0, shockwaveActive: false,
    shockwaveTimer: 0, shockwaveRadius: 0,
    warningTimer: 0,
  };
  NP.storm = {
    active: false, timer: 0,
    cooldown: NP.config.STORM_COOLDOWN_MIN + Math.random() * (NP.config.STORM_COOLDOWN_MAX - NP.config.STORM_COOLDOWN_MIN),
    strikeTimer: 0, bolts: [], warningTimer: 0, warningBolts: [],
  };
  NP.timePocket = {
    active: false, timer: 0,
    cooldown: NP.config.POCKET_COOLDOWN_MIN + Math.random() * (NP.config.POCKET_COOLDOWN_MAX - NP.config.POCKET_COOLDOWN_MIN),
    x: 0, y: 0, vx: 0, vy: 0,
  };
  NP.voidHole = null;
  NP.worm = null;
  NP.paddleHitBursts = [];
  NP.nearMisses = [];
  NP.activeEffects = { p1: {}, p2: {}, global: {} };
  NP.lastHitBy = 'p1';
  NP.powerUpTimer = 8;
  NP.input = { w: false, s: false, up: false, down: false, p1TouchY: null, p2TouchY: null };

  /* == Stats Tracking == */
  NP.stats = {
    longestRally: 0,
    fastestHit: 0,
    powerupsCollected: 0,
    startTime: 0,
    duration: 0,
  };
  NP.resetStats = function () {
    NP.stats.longestRally = 0;
    NP.stats.fastestHit = 0;
    NP.stats.powerupsCollected = 0;
    NP.stats.startTime = 0;
    NP.stats.duration = 0;
  };

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

  /* == Settings Save / Load == */

  function loadSettings() {
    var defaults = NP.config.DEFAULT_SETTINGS;
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...defaults };
      var parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    } catch { return { ...defaults }; }
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(NP.settings)); } catch {}
  }

  function applySettings() {
    // Sync CRT overlay visibility
    var crt = document.getElementById('crt-overlay');
    if (crt) crt.style.display = NP.settings.crtEnabled ? '' : 'none';
    // Sync audio volume (if engine initialized)
    if (NP.AudioEngine.setMusicVolume) NP.AudioEngine.setMusicVolume(NP.settings.musicVolume);
    if (NP.AudioEngine.setSfxVolume) NP.AudioEngine.setSfxVolume(NP.settings.sfxVolume);
  }

  function toggleCRT() {
    NP.settings.crtEnabled = !NP.settings.crtEnabled;
    applySettings();
    saveSettings();
  }

  function toggleParticles() {
    NP.settings.particlesEnabled = !NP.settings.particlesEnabled;
    saveSettings();
  }

  // Load settings on boot
  NP.settings = loadSettings();

  NP.clamp = function (val, lo, hi) { return Math.max(lo, Math.min(hi, val)); };
  NP.loadSave = loadSave;
  NP.saveGameData = saveGameData;
  NP.loadSettings = loadSettings;
  NP.saveSettings = saveSettings;
  NP.applySettings = applySettings;
  NP.toggleCRT = toggleCRT;
  NP.toggleParticles = toggleParticles;
  NP.formatMode = formatMode;
  NP.renderLeaderboard = renderLeaderboard;
  NP.updateSaveUI = updateSaveUI;
  NP.recordGameResult = recordGameResult;
  NP.generateBumpers = generateBumpers;
  NP.opponentOf = function (owner) { return owner === 'p1' ? 'p2' : 'p1'; };

})();
