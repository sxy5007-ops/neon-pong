/**
 * Neon Pong — State Management
 * Centralized game state initialization.
 */
(function () {
  'use strict';

  var NP = window.NP || (window.NP = {});

  NP.state = {
    screen: 'menu', mode: 'ai', difficulty: 'normal',
    muted: false, width: 0, height: 0, lastTime: 0,
    shake: 0, shakeDecay: 0, gridOffset: 0, scoreLimit: NP.config.WIN_SCORE, flash: 0,
    scoreFlashP1: 0, scoreFlashP2: 0,
    combo: 0,
    comboTimer: 0,
    lasers: [],
    laserTimer: 0,
    laserCooldown: 0
  };

  // Settings (merged with defaults on load)
  NP.settings = {};

  // Optional: expose a reset function to restore initial state
  NP.state.reset = function () {
    this.screen = 'menu';
    this.mode = 'ai';
    this.difficulty = 'normal';
    this.muted = false;
    this.width = 0;
    this.height = 0;
    this.lastTime = 0;
    this.shake = 0;
    this.shakeDecay = 0;
    this.gridOffset = 0;
    this.scoreLimit = NP.config.WIN_SCORE; // Note: depends on NP.config being loaded
    this.flash = 0;
    this.scoreFlashP1 = 0;
    this.scoreFlashP2 = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.lasers = [];
    this.laserTimer = 0;
    this.laserCooldown = 0;
  };
})();