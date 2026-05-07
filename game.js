/**
 * NEON PONG — Cyberpunk Browser Game
 * Single-file vanilla JS game engine with procedural audio and neon visuals.
 */

(function () {
  'use strict';

  /* ============================================================
     DOM References
     ============================================================ */
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const screens = {
    menu: document.getElementById('menu-screen'),
    hud: document.getElementById('hud'),
    pause: document.getElementById('pause-screen'),
    gameover: document.getElementById('gameover-screen'),
  };

  const ui = {
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
  };

  /* ============================================================
     Constants & Config
     ============================================================ */
  const WIN_SCORE = 10;
  const PADDLE_WIDTH = 14;
  const PADDLE_HEIGHT_RATIO = 0.18;
  const BALL_RADIUS = 8;
  const INITIAL_SPEED = 420;
  const SPEED_INCREMENT = 18;
  const MAX_SPEED = 900;

  const COLORS = {
    bg: '#0a0a0f',
    grid: 'rgba(0, 255, 255, 0.06)',
    paddleP1: '#00ffff',
    paddleP2: '#ff00ff',
    ball: '#f0e100',
    ballTrail: 'rgba(240, 225, 0, 0.35)',
    particle: ['#00ffff', '#ff00ff', '#f0e100', '#b026ff'],
  };

  const DIFFICULTY = {
    easy:   { reaction: 0.22, maxSpeedPct: 0.7, error: 0.18 },
    normal: { reaction: 0.12, maxSpeedPct: 0.95, error: 0.08 },
    hard:   { reaction: 0.06, maxSpeedPct: 1.15, error: 0.02 },
  };

  const SAVE_KEY = 'neon-pong-save-v1';
  const DEFAULT_SAVE = {
    gamesPlayed: 0,
    p1Wins: 0,
    aiWins: 0,
    p2Wins: 0,
    leaderboard: [],
  };

  /* ============================================================
     Game State
     ============================================================ */
  let state = {
    screen: 'menu',     // menu | playing | paused | gameover
    mode: 'ai',         // ai | 2p
    difficulty: 'normal',
    muted: false,
    width: 0,
    height: 0,
    lastTime: 0,
    shake: 0,
    shakeDecay: 0,
    gridOffset: 0,
    scoreLimit: WIN_SCORE,
  };

  let paddles = { p1: null, p2: null };
  let ball = null;
  let particles = [];
  let trails = [];
  let scores = { p1: 0, p2: 0 };
  let saveData = loadSave();

  let input = {
    w: false, s: false,
    up: false, down: false,
    p1TouchY: null, p2TouchY: null,
  };

  /* ============================================================
     Save Data & Leaderboards
     ============================================================ */
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULT_SAVE };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SAVE,
        ...parsed,
        leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
      };
    } catch (err) {
      return { ...DEFAULT_SAVE };
    }
  }

  function saveGameData() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (err) {
      // localStorage can fail in private browsing; gameplay should continue.
    }
  }

  function formatMode(entry) {
    return entry.mode === 'ai' ? 'AI ' + entry.difficulty.toUpperCase() : '2P LOCAL';
  }

  function renderLeaderboard(target) {
    if (!target) return;
    target.innerHTML = '';
    const entries = saveData.leaderboard.slice(0, 5);
    if (!entries.length) {
      const li = document.createElement('li');
      li.textContent = 'No saved wins yet';
      target.appendChild(li);
      return;
    }
    entries.forEach((entry) => {
      const li = document.createElement('li');
      li.textContent = entry.winner + ' ' + entry.score + ' - ' + formatMode(entry);
      target.appendChild(li);
    });
  }

  function updateSaveUI() {
    const record = saveData.p1Wins + '-' + (saveData.aiWins + saveData.p2Wins);
    const stats = 'Save file: ' + saveData.gamesPlayed + ' games | P1 record ' + record;
    if (ui.saveStats) ui.saveStats.textContent = stats;
    if (ui.gameoverSaveStats) ui.gameoverSaveStats.textContent = stats;
    renderLeaderboard(ui.leaderboardList);
    renderLeaderboard(ui.gameoverLeaderboard);
  }

  function recordGameResult(winner) {
    const winnerName = winner === 'p1' ? 'P1' : (state.mode === 'ai' ? 'AI' : 'P2');
    const entry = {
      winner: winnerName,
      score: scores.p1 + '-' + scores.p2,
      mode: state.mode,
      difficulty: state.difficulty,
      margin: Math.abs(scores.p1 - scores.p2),
      at: Date.now(),
    };

    saveData.gamesPlayed++;
    if (winner === 'p1') saveData.p1Wins++;
    else if (state.mode === 'ai') saveData.aiWins++;
    else saveData.p2Wins++;

    saveData.leaderboard.push(entry);
    saveData.leaderboard.sort((a, b) => {
      if (b.margin !== a.margin) return b.margin - a.margin;
      return b.at - a.at;
    });
    saveData.leaderboard = saveData.leaderboard.slice(0, 5);
    saveGameData();
    updateSaveUI();
  }

  /* ============================================================
     Audio Engine — Procedural Synthwave + SFX
     ============================================================ */
  const AudioEngine = (() => {
    let ctx = null;
    let masterGain = null;
    let musicNodes = [];
    let isPlaying = false;

    function init() {
      if (ctx) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = state.muted ? 0 : 0.35;
      masterGain.connect(ctx.destination);
    }

    function setMute(muted) {
      state.muted = muted;
      if (masterGain) {
        masterGain.gain.setTargetAtTime(muted ? 0 : 0.35, ctx.currentTime, 0.05);
      }
      const icon = muted ? '🔇' : '🔊';
      ui.muteBtn.textContent = icon;
      ui.hudMuteBtn.textContent = icon;
    }

    function toggleMute() {
      setMute(!state.muted);
    }

    function playTone({ type = 'sine', freq = 440, duration = 0.15, volume = 0.3, attack = 0.01, decay = 0.12, slideTo = null }) {
      if (!ctx || state.muted) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration);
      }
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    }

    function sfxPaddleHit() {
      playTone({ type: 'square', freq: 520, duration: 0.12, volume: 0.25, attack: 0.005, decay: 0.08, slideTo: 320 });
      playTone({ type: 'sine', freq: 260, duration: 0.1, volume: 0.15, attack: 0.005, decay: 0.08 });
    }

    function sfxWallHit() {
      playTone({ type: 'sine', freq: 180, duration: 0.14, volume: 0.2, attack: 0.01, decay: 0.1, slideTo: 140 });
    }

    function sfxScore() {
      playTone({ type: 'sawtooth', freq: 640, duration: 0.35, volume: 0.2, attack: 0.01, decay: 0.28, slideTo: 120 });
      playTone({ type: 'square', freq: 320, duration: 0.3, volume: 0.12, attack: 0.01, decay: 0.25, slideTo: 80 });
    }

    function sfxWin() {
      const notes = [440, 554, 659, 880];
      notes.forEach((f, i) => {
        playTone({ type: 'square', freq: f, duration: 0.5, volume: 0.18, attack: 0.01, decay: 0.4, slideTo: f * 0.5 });
      });
    }

    /* --- Background procedural synthwave loop --- */
    let musicInterval = null;
    let step = 0;

    function startMusic() {
      if (!ctx || isPlaying) return;
      isPlaying = true;
      step = 0;
      // Bassline + arpeggio loop
      musicInterval = setInterval(() => {
        if (state.muted || !isPlaying) return;
        const t = ctx.currentTime;
        const bpm = 110;
        const beat = 60 / bpm;

        const bassNotes = [55, 55, 65.41, 73.42, 55, 55, 49, 49];
        const arpNotes = [220, 261.63, 329.63, 392, 440, 392, 329.63, 261.63];

        const noteIdx = step % 8;
        const bassFreq = bassNotes[noteIdx];
        const arpFreq = arpNotes[noteIdx];

        // Bass (triangle, lowpass filtered)
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 280;
        bassFilter.Q.value = 1;
        bassOsc.type = 'triangle';
        bassOsc.frequency.value = bassFreq;
        bassGain.gain.setValueAtTime(0, t);
        bassGain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.9);
        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(masterGain);
        bassOsc.start(t);
        bassOsc.stop(t + beat);

        // Arp (sawtooth, lowpass, shorter)
        const arpOsc = ctx.createOscillator();
        const arpGain = ctx.createGain();
        const arpFilter = ctx.createBiquadFilter();
        arpFilter.type = 'lowpass';
        arpFilter.frequency.value = 900;
        arpFilter.Q.value = 2;
        arpOsc.type = 'sawtooth';
        arpOsc.frequency.value = arpFreq;
        arpGain.gain.setValueAtTime(0, t);
        arpGain.gain.linearRampToValueAtTime(0.06, t + 0.01);
        arpGain.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.5);
        arpOsc.connect(arpFilter);
        arpFilter.connect(arpGain);
        arpGain.connect(masterGain);
        arpOsc.start(t);
        arpOsc.stop(t + beat * 0.5);

        step++;
      }, (60 / 110) * 1000 / 2); // twice per beat for 16th feel
    }

    function stopMusic() {
      isPlaying = false;
      if (musicInterval) {
        clearInterval(musicInterval);
        musicInterval = null;
      }
    }

    return { init, setMute, toggleMute, sfxPaddleHit, sfxWallHit, sfxScore, sfxWin, startMusic, stopMusic };
  })();

  /* ============================================================
     Entities
     ============================================================ */
  function makePaddle(side) {
    const h = Math.max(60, state.height * PADDLE_HEIGHT_RATIO);
    return {
      side, // 'left' | 'right'
      x: side === 'left' ? PADDLE_WIDTH * 2 : state.width - PADDLE_WIDTH * 3,
      y: state.height / 2 - h / 2,
      w: PADDLE_WIDTH,
      h,
      vy: 0,
      speed: 720,
      color: side === 'left' ? COLORS.paddleP1 : COLORS.paddleP2,
      glow: side === 'left' ? '#00ffff' : '#ff00ff',
    };
  }

  function makeBall() {
    const dir = Math.random() > 0.5 ? 1 : -1;
    const angle = (Math.random() - 0.5) * (Math.PI / 3);
    return {
      x: state.width / 2,
      y: state.height / 2,
      r: BALL_RADIUS,
      vx: Math.cos(angle) * INITIAL_SPEED * dir,
      vy: Math.sin(angle) * INITIAL_SPEED,
      speed: INITIAL_SPEED,
      baseSpeed: INITIAL_SPEED,
      hits: 0,
    };
  }

  /* ============================================================
     Particles
     ============================================================ */
  function spawnParticles(x, y, count, colors) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 240;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.5,
        maxLife: 0.4 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ============================================================
     Trails
     ============================================================ */
  function updateTrails() {
    trails.push({ x: ball.x, y: ball.y, life: 0.35 });
    for (let i = trails.length - 1; i >= 0; i--) {
      trails[i].life -= 0.016;
      if (trails[i].life <= 0) trails.splice(i, 1);
    }
    if (trails.length > 40) trails.splice(0, trails.length - 40);
  }

  function drawTrails() {
    for (const t of trails) {
      const alpha = Math.max(0, t.life / 0.35) * 0.5;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS.ballTrail;
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ============================================================
     Rendering
     ============================================================ */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.width = w;
    state.height = h;
  }

  function drawGrid() {
    const spacing = 60;
    state.gridOffset = (state.gridOffset + 12) % spacing;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = state.gridOffset - spacing; x < state.width; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, state.height);
    }
    for (let y = state.gridOffset - spacing; y < state.height; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(state.width, y);
    }
    ctx.stroke();
  }

  function drawCenterLine() {
    const dash = 16;
    const gap = 12;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let y = 0; y < state.height; y += dash + gap) {
      ctx.moveTo(state.width / 2, y);
      ctx.lineTo(state.width / 2, y + dash);
    }
    ctx.stroke();
  }

  function drawPaddle(p) {
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = p.glow;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 4);
    ctx.fill();
    ctx.restore();
  }

  function drawBall() {
    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = COLORS.ball;
    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function applyShake() {
    if (state.shake > 0) {
      const dx = (Math.random() - 0.5) * state.shake * 2;
      const dy = (Math.random() - 0.5) * state.shake * 2;
      ctx.translate(dx, dy);
      state.shake *= state.shakeDecay;
      if (state.shake < 0.5) state.shake = 0;
    }
  }

  function render() {
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.save();
    applyShake();
    drawGrid();
    drawCenterLine();
    if (paddles.p1 && paddles.p2 && ball) {
      drawTrails();
      drawPaddle(paddles.p1);
      drawPaddle(paddles.p2);
      drawBall();
    }
    drawParticles();
    ctx.restore();
  }

  /* ============================================================
     Physics & Game Logic
     ============================================================ */
  function resetBall(winner) {
    ball = makeBall();
    ball.vx *= winner === 'p1' ? -1 : 1;
    trails = [];
  }

  function startRound(winner) {
    resetBall(winner);
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function updatePaddle(p, dt) {
    p.y += p.vy * dt;
    p.y = clamp(p.y, 0, state.height - p.h);
  }

  function reflectBall(paddle) {
    const hitPoint = (ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
    const maxBounceAngle = Math.PI / 3;
    const bounceAngle = hitPoint * maxBounceAngle;
    const speed = Math.min(ball.baseSpeed + ball.hits * SPEED_INCREMENT, MAX_SPEED);
    const dir = paddle.side === 'left' ? 1 : -1;
    ball.vx = Math.cos(bounceAngle) * speed * dir;
    ball.vy = Math.sin(bounceAngle) * speed;
    ball.speed = speed;
    ball.hits++;
  }

  function updateBall(dt) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Wall collisions (top/bottom)
    if (ball.y - ball.r <= 0) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy);
      AudioEngine.sfxWallHit();
      spawnParticles(ball.x, ball.y, 6, COLORS.particle);
    } else if (ball.y + ball.r >= state.height) {
      ball.y = state.height - ball.r;
      ball.vy = -Math.abs(ball.vy);
      AudioEngine.sfxWallHit();
      spawnParticles(ball.x, ball.y, 6, COLORS.particle);
    }

    // Paddle collisions
    const checkPaddle = (p) => {
      const closestX = clamp(ball.x, p.x, p.x + p.w);
      const closestY = clamp(ball.y, p.y, p.y + p.h);
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;
      return (dx * dx + dy * dy) < (ball.r * ball.r);
    };

    if (checkPaddle(paddles.p1)) {
      ball.x = paddles.p1.x + paddles.p1.w + ball.r;
      reflectBall(paddles.p1);
      AudioEngine.sfxPaddleHit();
      state.shake = 6;
      state.shakeDecay = 0.82;
      spawnParticles(ball.x, ball.y, 10, COLORS.particle);
    } else if (checkPaddle(paddles.p2)) {
      ball.x = paddles.p2.x - ball.r;
      reflectBall(paddles.p2);
      AudioEngine.sfxPaddleHit();
      state.shake = 6;
      state.shakeDecay = 0.82;
      spawnParticles(ball.x, ball.y, 10, COLORS.particle);
    }

    // Score detection
    if (ball.x + ball.r < 0) {
      scores.p2++;
      AudioEngine.sfxScore();
      spawnParticles(0, ball.y, 18, COLORS.particle);
      state.shake = 10;
      state.shakeDecay = 0.78;
      updateScoreUI();
      checkWin();
      if (state.screen === 'playing') startRound('p2');
    } else if (ball.x - ball.r > state.width) {
      scores.p1++;
      AudioEngine.sfxScore();
      spawnParticles(state.width, ball.y, 18, COLORS.particle);
      state.shake = 10;
      state.shakeDecay = 0.78;
      updateScoreUI();
      checkWin();
      if (state.screen === 'playing') startRound('p1');
    }
  }

  function updateAI(dt) {
    if (state.mode !== 'ai') return;
    const diff = DIFFICULTY[state.difficulty];
    const p = paddles.p2;
    const targetY = ball.y - p.h / 2;
    // Add imperfection
    const error = (Math.random() - 0.5) * p.h * diff.error * 2;
    const desiredY = targetY + error;
    const diffY = desiredY - p.y;
    const maxSpeed = p.speed * diff.maxSpeedPct;
    const step = diffY / diff.reaction;
    p.vy = clamp(step, -maxSpeed, maxSpeed);
  }

  function updateInput(dt) {
    const p1 = paddles.p1;
    const p2 = paddles.p2;

    // P1 keyboard
    const p1KeyboardActive = input.w !== input.s;
    const p2KeyboardActive = input.up !== input.down;

    if (p1KeyboardActive) {
      p1.vy = input.w ? -p1.speed : p1.speed;
    } else if (input.p1TouchY !== null) {
      const target = input.p1TouchY - p1.h / 2;
      p1.vy = (target - p1.y) * 6;
      p1.vy = clamp(p1.vy, -p1.speed, p1.speed);
    } else {
      p1.vy *= 0.85;
      if (Math.abs(p1.vy) < 10) p1.vy = 0;
    }

    // P2 keyboard (2P mode)
    if (state.mode === '2p') {
      if (p2KeyboardActive) {
        p2.vy = input.up ? -p2.speed : p2.speed;
      } else if (input.p2TouchY !== null) {
        const target = input.p2TouchY - p2.h / 2;
        p2.vy = (target - p2.y) * 6;
        p2.vy = clamp(p2.vy, -p2.speed, p2.speed);
      } else {
        p2.vy *= 0.85;
        if (Math.abs(p2.vy) < 10) p2.vy = 0;
      }
    }
  }

  function checkWin() {
    if (scores.p1 >= state.scoreLimit || scores.p2 >= state.scoreLimit) {
      const winnerKey = scores.p1 >= state.scoreLimit ? 'p1' : 'p2';
      state.screen = 'gameover';
      AudioEngine.sfxWin();
      showScreen('gameover');
      const winner = winnerKey === 'p1' ? 'PLAYER 1' : (state.mode === 'ai' ? 'AI' : 'PLAYER 2');
      ui.winnerText.textContent = winner + ' WINS';
      ui.finalP1.textContent = scores.p1;
      ui.finalP2.textContent = scores.p2;
      recordGameResult(winnerKey);
    }
  }

  function updateScoreUI() {
    ui.scoreP1.textContent = scores.p1;
    ui.scoreP2.textContent = scores.p2;
  }

  /* ============================================================
     Game Loop
     ============================================================ */
  function loop(timestamp) {
    requestAnimationFrame(loop);
    if (!state.lastTime) state.lastTime = timestamp;
    let dt = (timestamp - state.lastTime) / 1000;
    state.lastTime = timestamp;
    dt = Math.min(dt, 0.05); // cap delta time

    if (state.screen === 'playing') {
      updateInput(dt);
      updateAI(dt);
      updatePaddle(paddles.p1, dt);
      updatePaddle(paddles.p2, dt);
      updateBall(dt);
      updateTrails();
    }
    updateParticles(dt);
    render();
  }

  /* ============================================================
     Screen Management
     ============================================================ */
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
    if (name === 'hud') screens.hud.classList.add('active');
  }

  function startGame(mode, difficulty) {
    AudioEngine.init();
    AudioEngine.startMusic();
    state.mode = mode;
    state.difficulty = difficulty || 'normal';
    state.screen = 'playing';
    scores = { p1: 0, p2: 0 };
    updateScoreUI();
    ui.modeLabel.textContent = mode === 'ai' ? 'VS AI (' + difficulty.toUpperCase() + ')' : '2 PLAYERS';
    paddles.p1 = makePaddle('left');
    paddles.p2 = makePaddle('right');
    ball = makeBall();
    trails = [];
    particles = [];
    input = {
      w: false, s: false,
      up: false, down: false,
      p1TouchY: null, p2TouchY: null,
    };
    ui.controlsHint.classList.remove('hidden');
    ui.hintP2.style.display = mode === 'ai' ? 'none' : 'flex';
    showScreen('hud');
  }

  function pauseGame() {
    if (state.screen !== 'playing') return;
    state.screen = 'paused';
    screens.pause.classList.add('active');
  }

  function resumeGame() {
    if (state.screen !== 'paused') return;
    state.screen = 'playing';
    screens.pause.classList.remove('active');
    state.lastTime = 0;
  }

  function quitToMenu() {
    state.screen = 'menu';
    AudioEngine.stopMusic();
    screens.pause.classList.remove('active');
    screens.gameover.classList.remove('active');
    ui.controlsHint.classList.add('hidden');
    showScreen('menu');
  }

  /* ============================================================
     Event Listeners
     ============================================================ */
  window.addEventListener('resize', () => {
    resize();
    if (paddles.p1) paddles.p1.h = Math.max(60, state.height * PADDLE_HEIGHT_RATIO);
    if (paddles.p2) paddles.p2.h = Math.max(60, state.height * PADDLE_HEIGHT_RATIO);
  });

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w') {
      if (state.screen === 'playing') {
        input.w = true;
        input.p1TouchY = null;
      }
    }
    if (k === 's') {
      if (state.screen === 'playing') {
        input.s = true;
        input.p1TouchY = null;
      }
    }
    if (k === 'arrowup') {
      if (state.screen === 'playing') {
        input.up = true;
        input.p2TouchY = null;
      }
      e.preventDefault();
    }
    if (k === 'arrowdown') {
      if (state.screen === 'playing') {
        input.down = true;
        input.p2TouchY = null;
      }
      e.preventDefault();
    }
    if (k === 'p' || k === 'escape') {
      if (state.screen === 'playing') pauseGame();
      else if (state.screen === 'paused') resumeGame();
    }
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w') input.w = false;
    if (k === 's') input.s = false;
    if (k === 'arrowup') { input.up = false; e.preventDefault(); }
    if (k === 'arrowdown') { input.down = false; e.preventDefault(); }
  });

  // Mouse control for P1
  window.addEventListener('mousemove', (e) => {
    if (state.screen !== 'playing') return;
    input.p1TouchY = e.clientY;
  });

  // Touch controls
  function handleTouch(e) {
    if (state.screen !== 'playing') return;
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const zone = touch.clientX < state.width / 2 ? 'p1' : 'p2';
      if (zone === 'p1') input.p1TouchY = touch.clientY;
      else if (state.mode === '2p') input.p2TouchY = touch.clientY;
    }
  }
  ui.touchLeft.addEventListener('touchstart', handleTouch, { passive: false });
  ui.touchLeft.addEventListener('touchmove', handleTouch, { passive: false });
  ui.touchLeft.addEventListener('touchend', (e) => { e.preventDefault(); input.p1TouchY = null; }, { passive: false });
  ui.touchRight.addEventListener('touchstart', handleTouch, { passive: false });
  ui.touchRight.addEventListener('touchmove', handleTouch, { passive: false });
  ui.touchRight.addEventListener('touchend', (e) => { e.preventDefault(); input.p2TouchY = null; }, { passive: false });

  // Menu buttons
  document.querySelectorAll('.neon-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      const diff = btn.dataset.difficulty || 'normal';
      startGame(mode, diff);
    });
  });

  ui.muteBtn.addEventListener('click', AudioEngine.toggleMute);
  ui.hudMuteBtn.addEventListener('click', AudioEngine.toggleMute);
  ui.pauseBtn.addEventListener('click', pauseGame);
  ui.resumeBtn.addEventListener('click', resumeGame);
  ui.quitBtn.addEventListener('click', quitToMenu);
  ui.restartBtn.addEventListener('click', () => startGame(state.mode, state.difficulty));
  ui.menuBtn.addEventListener('click', quitToMenu);

  /* ============================================================
     Init
     ============================================================ */
  resize();
  updateSaveUI();
  requestAnimationFrame(loop);
})();
