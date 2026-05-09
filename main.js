/**
 * Neon Pong — Main Entry Point
 * DOM binding, event listeners, and initialization.
 */
(function () {
  'use strict';

  var NP = window.NP;
  if (!NP) return;

  /* == DOM References == */
  NP.screens = {
    menu: document.getElementById('menu-screen'),
    hud: document.getElementById('hud'),
    pause: document.getElementById('pause-screen'),
    gameover: document.getElementById('gameover-screen'),
  };

  NP.ui = {
    scoreP1: document.getElementById('score-p1'),
    scoreP2: document.getElementById('score-p2'),
    modeLabel: document.getElementById('mode-label'),
    winnerText: document.getElementById('winner-text'),
    finalP1: document.getElementById('final-p1'),
    finalP2: document.getElementById('final-p2'),
    muteBtn: document.getElementById('mute-btn'),
    hudMuteBtn: document.getElementById('hud-mute-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    resumeBtn: document.getElementById('resume-btn'),
    quitBtn: document.getElementById('quit-btn'),
    restartBtn: document.getElementById('restart-btn'),
    menuBtn: document.getElementById('menu-btn'),
    touchLeft: document.getElementById('touch-left'),
    touchRight: document.getElementById('touch-right'),
    controlsHint: document.getElementById('controls-hint'),
    hintP2: document.getElementById('hint-p2'),
    saveStats: document.getElementById('save-stats'),
    leaderboardList: document.getElementById('leaderboard-list'),
    gameoverSaveStats: document.getElementById('gameover-save-stats'),
    gameoverLeaderboard: document.getElementById('gameover-leaderboard'),
    effectStrip: document.getElementById('effect-strip'),
  };

  /* == Event Listeners == */
  window.addEventListener('resize', function () {
    NP.resize();
    if (NP.paddles.p1) NP.paddles.p1.h = NP.getPaddleHeight('p1');
    if (NP.paddles.p2) NP.paddles.p2.h = NP.getPaddleHeight('p2');
  });

  window.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (k === 'w') {
      if (NP.state.screen === 'playing') {
        NP.input.w = true;
        NP.input.p1TouchY = null;
      }
    }
    if (k === 's') {
      if (NP.state.screen === 'playing') {
        NP.input.s = true;
        NP.input.p1TouchY = null;
      }
    }
    if (k === 'arrowup') {
      if (NP.state.screen === 'playing') {
        NP.input.up = true;
        NP.input.p2TouchY = null;
      }
      e.preventDefault();
    }
    if (k === 'arrowdown') {
      if (NP.state.screen === 'playing') {
        NP.input.down = true;
        NP.input.p2TouchY = null;
      }
      e.preventDefault();
    }
    if (k === 'p' || k === 'escape') {
      if (NP.state.screen === 'playing') NP.pauseGame();
      else if (NP.state.screen === 'paused') NP.resumeGame();
    }
  });

  window.addEventListener('keyup', function (e) {
    var k = e.key.toLowerCase();
    if (k === 'w') NP.input.w = false;
    if (k === 's') NP.input.s = false;
    if (k === 'arrowup') { NP.input.up = false; e.preventDefault(); }
    if (k === 'arrowdown') { NP.input.down = false; e.preventDefault(); }
  });

  window.addEventListener('mousemove', function (e) {
    if (NP.state.screen !== 'playing') return;
    NP.input.p1TouchY = e.clientY;
  });

  function handleTouch(e) {
    if (NP.state.screen !== 'playing') return;
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var touch = e.changedTouches[i];
      var zone = touch.clientX < NP.state.width / 2 ? 'p1' : 'p2';
      if (zone === 'p1') NP.input.p1TouchY = touch.clientY;
      else if (NP.state.mode === '2p') NP.input.p2TouchY = touch.clientY;
    }
  }

  NP.ui.touchLeft.addEventListener('touchstart', handleTouch, { passive: false });
  NP.ui.touchLeft.addEventListener('touchmove', handleTouch, { passive: false });
  NP.ui.touchLeft.addEventListener('touchend', function (e) {
    e.preventDefault(); NP.input.p1TouchY = null;
  }, { passive: false });
  NP.ui.touchRight.addEventListener('touchstart', handleTouch, { passive: false });
  NP.ui.touchRight.addEventListener('touchmove', handleTouch, { passive: false });
  NP.ui.touchRight.addEventListener('touchend', function (e) {
    e.preventDefault(); NP.input.p2TouchY = null;
  }, { passive: false });

  document.querySelectorAll('.neon-btn[data-mode]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      NP.startGame(btn.dataset.mode, btn.dataset.difficulty || 'normal');
    });
  });

  NP.ui.muteBtn.addEventListener('click', NP.AudioEngine.toggleMute);
  NP.ui.hudMuteBtn.addEventListener('click', NP.AudioEngine.toggleMute);
  NP.ui.pauseBtn.addEventListener('click', NP.pauseGame);
  NP.ui.resumeBtn.addEventListener('click', NP.resumeGame);
  NP.ui.quitBtn.addEventListener('click', NP.quitToMenu);
  NP.ui.restartBtn.addEventListener('click', function () {
    NP.startGame(NP.state.mode, NP.state.difficulty);
  });
  NP.ui.menuBtn.addEventListener('click', NP.quitToMenu);

  /* == Init == */
  NP.resize();
  NP.updateSaveUI(NP.ui);
  NP.loop();

})();
