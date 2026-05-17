// main.js - Game Orchestrator (Entry Point)
// Clean, minimal version to get the game working

document.addEventListener('DOMContentLoaded', function() {
  console.log('Game initializing...');
  
  // Verify NP is available
  if (typeof NP === 'undefined') {
    console.error('FATAL: NP is not defined - check if engine.js loaded properly');
    return;
  }
  
  // Set up canvas resize
  function resizeCanvas() {
    if (!NP) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
      console.error('FATAL: Canvas element not found');
      return;
    }
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    NP.state.width = w;
    NP.state.height = h;
    NP.scale = Math.min(w, h) / 800;
  }
  
  // Initial resize and listener
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Initialize input state (matches logic.js expectations)
  NP.input = { w: false, s: false, up: false, down: false, p1TouchY: null, p2TouchY: null };
  
  // Initialize UI elements (matches logic.js expectations)
  NP.ui = {
    scoreP1: document.getElementById('score-p1'),
    scoreP2: document.getElementById('score-p2'),
    effectStrip: document.getElementById('effect-strip'),
    modeLabel: document.getElementById('mode-label'),
    winnerText: document.getElementById('winner-text'),
    finalP1: document.getElementById('final-p1'),
    finalP2: document.getElementById('final-p2'),
    controlsHint: document.getElementById('controls-hint'),
    hintP2: document.getElementById('hint-p2'),
    saveStats: document.getElementById('save-stats'),
    leaderboardList: document.getElementById('leaderboard-list'),
    gameoverSaveStats: document.getElementById('gameover-save-stats'),
    gameoverLeaderboard: document.getElementById('gameover-leaderboard'),
    statRally: document.getElementById('stat-rally'),
    statSpeed: document.getElementById('stat-speed'),
    statPowerups: document.getElementById('stat-powerups'),
    statDuration: document.getElementById('stat-duration'),
  };
  
  // Verify UI elements are found
  var missing = [];
  for (var key in NP.ui) {
    if (!NP.ui[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    console.error('FATAL: UI elements not found:', missing);
    return;
  }

  // Initialize screen elements (matches logic.js expectations)
  NP.screens = {
    menu: document.getElementById('menu-screen'),
    hud: document.getElementById('hud'),
    pause: document.getElementById('pause-screen'),
    gameover: document.getElementById('gameover-screen'),
    settings: document.getElementById('settings-screen'),
    campaign: document.getElementById('campaign-screen')
  };

  // Verify screen elements are found
  var missingScreens = [];
  for (var key in NP.screens) {
    if (!NP.screens[key]) {
      missingScreens.push(key);
    }
  }
  if (missingScreens.length > 0) {
    console.error('FATAL: Screen elements not found:', missingScreens);
    return;
  }

  
  // Keyboard controls
  window.addEventListener('keydown', function(e) {
    const k = e.key.toLowerCase();
    if (k === 'w') { NP.input.w = true; NP.input.p1TouchY = null; }
    if (k === 's') { NP.input.s = true; NP.input.p1TouchY = null; }
    if (k === 'arrowup') { NP.input.up = true; NP.input.p2TouchY = null; e.preventDefault(); }
    if (k === 'arrowdown') { NP.input.down = true; NP.input.p2TouchY = null; e.preventDefault(); }
    if (k === 'p' || k === 'escape') {
      if (NP.state.screen === 'playing') NP.pauseGame();
      else if (NP.state.screen === 'paused') NP.resumeGame();
    }
  });
  
  window.addEventListener('keyup', function(e) {
    const k = e.key.toLowerCase();
    if (k === 'w') NP.input.w = false;
    if (k === 's') NP.input.s = false;
    if (k === 'arrowup') { NP.input.up = false; e.preventDefault(); }
    if (k === 'arrowdown') { NP.input.down = false; e.preventDefault(); }
  });
  
  // Mouse control for Player 1
  window.addEventListener('mousemove', function(e) {
    if (NP.state.screen === 'playing') {
      NP.input.p1TouchY = e.clientY;
    }
  });
  
  // Touch controls
  function handleTouch(e) {
    if (NP.state.screen !== 'playing') return;
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const zone = touch.clientX < NP.state.width / 2 ? 'p1' : 'p2';
      if (zone === 'p1') NP.input.p1TouchY = touch.clientY;
      else if (NP.state.mode === '2p') NP.input.p2TouchY = touch.clientY;
    }
  }
  
  const touchLeft = document.getElementById('touch-left');
  const touchRight = document.getElementById('touch-right');
  
  if (touchLeft) {
    touchLeft.addEventListener('touchstart', handleTouch, { passive: false });
    touchLeft.addEventListener('touchmove', handleTouch, { passive: false });
    touchLeft.addEventListener('touchend', function(e) { e.preventDefault(); NP.input.p1TouchY = null; }, { passive: false });
  }
  
  if (touchRight) {
    touchRight.addEventListener('touchstart', handleTouch, { passive: false });
    touchRight.addEventListener('touchmove', handleTouch, { passive: false });
    touchRight.addEventListener('touchend', function(e) { e.preventDefault(); NP.input.p2TouchY = null; }, { passive: false });
  }
  
  // Menu button handlers - using the proven pattern from backup
  const modeButtons = document.querySelectorAll('.neon-btn[data-mode]');
  console.log('Found', modeButtons.length, 'menu buttons');
  
  modeButtons.forEach(button => {
    button.addEventListener('click', function() {
      try {
        const mode = this.getAttribute('data-mode');
        let difficulty = this.getAttribute('data-difficulty');
        // For AI modes, difficulty is required; for 2P, it's not used
        if (mode === 'ai' && !difficulty) difficulty = 'normal';

        console.log('Starting game:', {mode, difficulty});

        if (mode === 'campaign') {
          // Campaign mode: show campaign screen instead of starting game
          NP.showCampaignScreen();
          if (typeof NP.loop === 'function') {
            console.log('Starting animation loop');
            NP.loop(performance.now());
          }
        } else {
          // Start the game using the modular API
          NP.startGame(mode, difficulty);

          // Start the animation loop
          if (typeof NP.loop === 'function' && NP.state.screen === 'playing') {
            console.log('Starting animation loop');
            NP.loop(performance.now());
          } else {
            console.error('Cannot start loop: NP.loop not available or not in playing state');
          }
        }
      } catch (error) {
        console.error('Error starting game:', error);
        console.error(error.stack);
      }
    });
  });
  
  // Mute buttons
  const muteBtn = document.getElementById('mute-btn');
  const hudMuteBtn = document.getElementById('hud-mute-btn');
  
  if (muteBtn) {
    muteBtn.addEventListener('click', function() {
      console.log('Main mute button clicked');
      NP.AudioEngine.toggleMute();
    });
  }
  
  if (hudMuteBtn) {
    hudMuteBtn.addEventListener('click', function() {
      console.log('HUD mute button clicked');
      NP.AudioEngine.toggleMute();
    });
  }

  // Settings button in menu
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function() {
      console.log('Settings button clicked');
      NP.screens.menu.classList.remove('active');
      NP.screens.settings.classList.add('active');
      NP.state.screen = 'settings';
    });
  }

  // Settings back button
  const settingsBackBtn = document.getElementById('settings-back-btn');
  if (settingsBackBtn) {
    settingsBackBtn.addEventListener('click', function() {
      console.log('Settings back button clicked');
      NP.screens.settings.classList.remove('active');
      NP.screens.menu.classList.add('active');
      NP.state.screen = 'menu';
    });
  }

  // Campaign start button
  const campaignStartBtn = document.getElementById('campaign-start-btn');
  if (campaignStartBtn) {
    campaignStartBtn.addEventListener('click', function() {
      console.log('Campaign start button clicked');
      if (NP.selectedCampaignLevel >= 0) {
        NP.startCampaignLevel(NP.selectedCampaignLevel);
        if (typeof NP.loop === 'function' && NP.state.screen === 'playing') {
          console.log('Starting animation loop');
          NP.loop(performance.now());
        }
      }
    });
  }

  // Campaign back button
  const campaignBackBtn = document.getElementById('campaign-back-btn');
  if (campaignBackBtn) {
    campaignBackBtn.addEventListener('click', function() {
      console.log('Campaign back button clicked');
      NP.screens.campaign.classList.remove('active');
      NP.screens.menu.classList.add('active');
      NP.state.screen = 'menu';
    });
  }

  // Volume sliders
  const musicSlider = document.getElementById('music-volume');
  const sfxSlider = document.getElementById('sfx-volume');
  const musicLabel = document.getElementById('music-volume-label');
  const sfxLabel = document.getElementById('sfx-volume-label');

  function updateSlider(slider, label, setter) {
    slider.addEventListener('input', function() {
      const v = parseFloat(this.value);
      label.textContent = Math.round(v * 100) + '%';
      setter(v);
      NP.settings[setter === NP.AudioEngine.setMusicVolume ? 'musicVolume' : 'sfxVolume'] = v;
      NP.saveSettings();
    });
  }

  if (musicSlider && musicLabel) {
    musicSlider.value = NP.settings.musicVolume;
    musicLabel.textContent = Math.round(NP.settings.musicVolume * 100) + '%';
    updateSlider(musicSlider, musicLabel, function(v) { NP.AudioEngine.setMusicVolume(v); });
  }
  if (sfxSlider && sfxLabel) {
    sfxSlider.value = NP.settings.sfxVolume;
    sfxLabel.textContent = Math.round(NP.settings.sfxVolume * 100) + '%';
    updateSlider(sfxSlider, sfxLabel, function(v) { NP.AudioEngine.setSfxVolume(v); });
  }

  // Toggle buttons
  function setupToggle(id, getter, setter, labelKey) {
    const btn = document.getElementById(id);
    if (!btn) return;
    function updateBtn() {
      const on = getter();
      btn.textContent = on ? 'ON' : 'OFF';
      btn.className = 'toggle-btn' + (on ? ' on' : '');
    }
    btn.addEventListener('click', function() {
      setter();
      updateBtn();
    });
    updateBtn();
  }

  setupToggle('crt-toggle',
    function() { return NP.settings.crtEnabled; },
    function() { NP.toggleCRT(); },
    'crtEnabled'
  );
  setupToggle('particles-toggle',
    function() { return NP.settings.particlesEnabled; },
    function() { NP.toggleParticles(); },
    'particlesEnabled'
  );

  // Pause button in HUD
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', function() {
      console.log('Pause button clicked');
      if (NP.state.screen === 'playing') {
        NP.pauseGame();
      } else if (NP.state.screen === 'paused') {
        NP.resumeGame();
      }
    });
  }

  // Pause screen buttons
  const resumeBtn = document.getElementById('resume-btn');
  const quitBtn = document.getElementById('quit-btn');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', function() {
      console.log('Resume button clicked');
      NP.resumeGame();
    });
  }
  if (quitBtn) {
    quitBtn.addEventListener('click', function() {
      console.log('Quit to menu button clicked');
      NP.quitToMenu();
    });
  }

  // Game over screen buttons
  const restartBtn = document.getElementById('restart-btn');
  const menuBtn = document.getElementById('menu-btn');
  const nextLevelBtn = document.getElementById('next-level-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', function() {
      console.log('Restart button clicked');
      // Restart the game with the same mode and difficulty
      if (NP.state.mode === 'campaign' && NP.campaignLevel != null) {
        // Restart same campaign level
        NP.startCampaignLevel(NP.campaignLevel);
      } else if (NP.state.mode && NP.state.difficulty) {
        NP.startGame(NP.state.mode, NP.state.difficulty);
      } else {
        // Default to AI normal if state not available
        NP.startGame('ai', 'normal');
      }
      if (typeof NP.loop === 'function' && NP.state.screen === 'playing') {
        console.log('Starting animation loop');
        NP.loop(performance.now());
      }
    });
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function() {
      console.log('Main menu button clicked');
      if (NP.state.mode === 'campaign') {
        NP.quitToCampaign();
      } else {
        NP.quitToMenu();
      }
    });
  }
  if (nextLevelBtn) {
    nextLevelBtn.addEventListener('click', function() {
      console.log('Next level button clicked');
      if (NP.campaignLevel != null) {
        var nextIdx = NP.campaignLevel + 1;
        if (nextIdx < NP.config.CAMPAIGN_LEVELS.length) {
          NP.startCampaignLevel(nextIdx);
          if (typeof NP.loop === 'function' && NP.state.screen === 'playing') {
            console.log('Starting animation loop');
            NP.loop(performance.now());
          }
        }
      }
    });
  }

  console.log('Game initialization complete');
  NP.applySettings();
});
