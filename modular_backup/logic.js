/**
 * Neon Pong — Game Logic
 * AI, input handling, paddle physics, ball physics, scoring, screens.
 */
(function () {
  'use strict';

  var NP = window.NP;
  if (!NP) return;

  function updatePaddle(p, dt) {
    var owner = p.side === 'left' ? 'p1' : 'p2';
    var effects = NP.activeEffects[owner] || {};
    p.h = getPaddleHeight(owner);
    p.y += p.vy * dt;
    p.y = NP.clamp(p.y, 0, NP.state.height - p.h);
    p.displayShield = effects.shield > 0;
  }

  function getPaddleHeight(owner) {
    var base = Math.max(60, NP.state.height * NP.PADDLE_HEIGHT_RATIO);
    var effects = NP.activeEffects[owner] || {};
    var scale = 1;
    if (effects.mega > 0) scale *= 1.65;
    if (effects.tiny > 0) scale *= 0.58;
    return NP.clamp(base * scale, 42, NP.state.height * 0.42);
  }

  function getPaddleSpeed(owner, baseSpeed) {
    var effects = NP.activeEffects[owner] || {};
    var speed = baseSpeed;
    if (effects.slow > 0) speed *= 0.55;
    return speed;
  }

  function reflectBallFor(b, paddle) {
    var hitPoint = (b.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
    var maxBounceAngle = Math.PI / 3;
    var bounceAngle = hitPoint * maxBounceAngle;
    var owner = paddle.side === 'left' ? 'p1' : 'p2';
    if (NP.activeEffects[owner].glitch > 0) {
      bounceAngle += (Math.random() - 0.5) * 1.4;
      NP.activeEffects[owner].glitch = 0;
      NP.state.shake = 12;
      NP.state.shakeDecay = 0.8;
    }
    var turbo = NP.activeEffects.global.turbo > 0 ? 1.24 : 1;
    var speed = Math.min((b.baseSpeed + b.hits * NP.SPEED_INCREMENT) * turbo, NP.MAX_SPEED * 1.08);
    var dir = paddle.side === 'left' ? 1 : -1;
    b.vx = Math.cos(bounceAngle) * speed * dir;
    b.vy = Math.sin(bounceAngle) * speed;
    b.speed = speed;
    b.hits++;
    NP.lastHitBy = owner;
  }

  function reflectBall(paddle) {
    reflectBallFor(NP.ball, paddle);
  }

  function updateOneBall(b, dt) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (!b.isMain) b.life -= dt;

    // Wall collisions
    if (b.y - b.r <= 0) {
      b.y = b.r; b.vy = Math.abs(b.vy);
      NP.AudioEngine.sfxWallHit();
      NP.spawnParticles(b.x, b.y, 6, NP.COLORS.particle);
    } else if (b.y + b.r >= NP.state.height) {
      b.y = NP.state.height - b.r; b.vy = -Math.abs(b.vy);
      NP.AudioEngine.sfxWallHit();
      NP.spawnParticles(b.x, b.y, 6, NP.COLORS.particle);
    }

    // Paddle collisions (fixed: independent checks with dedup)
    var hitPaddle = false;
    var checkPaddle = function (p) {
      var closestX = NP.clamp(b.x, p.x, p.x + p.w);
      var closestY = NP.clamp(b.y, p.y, p.y + p.h);
      var dx = b.x - closestX;
      var dy = b.y - closestY;
      return (dx * dx + dy * dy) < (b.r * b.r);
    };

    if (checkPaddle(NP.paddles.p1) && !hitPaddle) {
      b.x = NP.paddles.p1.x + NP.paddles.p1.w + b.r;
      reflectBallFor(b, NP.paddles.p1);
      NP.AudioEngine.sfxPaddleHit();
      NP.state.shake = 6; NP.state.shakeDecay = 0.82;
      NP.spawnParticles(b.x, b.y, 10, NP.COLORS.particle);
      hitPaddle = true;
    }
    if (checkPaddle(NP.paddles.p2) && !hitPaddle) {
      b.x = NP.paddles.p2.x - b.r;
      reflectBallFor(b, NP.paddles.p2);
      NP.AudioEngine.sfxPaddleHit();
      NP.state.shake = 6; NP.state.shakeDecay = 0.82;
      NP.spawnParticles(b.x, b.y, 10, NP.COLORS.particle);
      hitPaddle = true;
    }

    if (!b.isMain) return;

    // Score detection
    if (b.x + b.r < 0) {
      if (NP.activeEffects.p1.shield > 0) {
        NP.activeEffects.p1.shield = 0;
        startRound('p2'); return;
      }
      NP.scores.p2++;
      NP.AudioEngine.sfxScore();
      NP.spawnParticles(0, b.y, 18, NP.COLORS.particle);
      NP.state.shake = 10; NP.state.shakeDecay = 0.78;
      updateScoreUI();
      checkWin();
      if (NP.state.screen === 'playing') startRound('p2');
    } else if (b.x - b.r > NP.state.width) {
      if (NP.activeEffects.p2.shield > 0) {
        NP.activeEffects.p2.shield = 0;
        startRound('p1'); return;
      }
      NP.scores.p1++;
      NP.AudioEngine.sfxScore();
      NP.spawnParticles(NP.state.width, b.y, 18, NP.COLORS.particle);
      NP.state.shake = 10; NP.state.shakeDecay = 0.78;
      updateScoreUI();
      checkWin();
      if (NP.state.screen === 'playing') startRound('p1');
    }
  }

  function updateBall(dt) {
    NP.balls.forEach(function (b) { updateOneBall(b, dt); });
    NP.balls = NP.balls.filter(function (b) { return b.isMain || b.life > 0; });
    NP.ball = NP.balls.find(function (b) { return b.isMain; }) || NP.ball;
  }

  function resetBall(winner) {
    NP.ball = NP.makeBall();
    NP.ball.vx *= winner === 'p1' ? -1 : 1;
    NP.balls = [NP.ball];
    NP.trails = [];
  }

  function startRound(winner) {
    resetBall(winner);
  }

  /* == AI == */
  function updateAI(dt) {
    if (NP.state.mode !== 'ai') return;
    var diff = NP.DIFFICULTY[NP.state.difficulty];
    var p = NP.paddles.p2;
    if (!p) return;
    if (NP.ball.vx < 0 || NP.ball.x < NP.state.width * (1 - diff.awareness)) {
      p.vy *= 0.88; return;
    }
    var projectedY = NP.ball.y + NP.ball.vy * diff.reaction * (NP.state.difficulty === 'hard' ? 1.4 : 0.55);
    var targetY = NP.clamp(projectedY, 0, NP.state.height) - p.h / 2;
    var error = (Math.random() - 0.5) * p.h * diff.error * 2;
    var desiredY = targetY + error;
    var diffY = desiredY - p.y;
    var maxSpeed = getPaddleSpeed('p2', p.speed) * diff.maxSpeedPct;
    var step = diffY / diff.reaction;
    p.vy = NP.clamp(step, -maxSpeed, maxSpeed);
    if (NP.activeEffects.p2.reverse > 0) p.vy *= -0.65;
  }

  /* == Input == */
  function updateInput(dt) {
    var p1 = NP.paddles.p1;
    var p2 = NP.paddles.p2;
    var p1KeyboardActive = NP.input.w !== NP.input.s;
    var p2KeyboardActive = NP.input.up !== NP.input.down;
    var p1Dir = NP.activeEffects.p1.reverse > 0 ? -1 : 1;
    var p2Dir = NP.activeEffects.p2.reverse > 0 ? -1 : 1;
    var p1Speed = getPaddleSpeed('p1', p1.speed);
    var p2Speed = getPaddleSpeed('p2', p2.speed);

    if (p1KeyboardActive) {
      p1.vy = (NP.input.w ? -p1Speed : p1Speed) * p1Dir;
    } else if (NP.input.p1TouchY !== null) {
      var target = NP.input.p1TouchY - p1.h / 2;
      p1.vy = (target - p1.y) * 6;
      p1.vy = NP.clamp(p1.vy, -p1Speed, p1Speed);
    } else {
      p1.vy *= 0.85;
      if (Math.abs(p1.vy) < 10) p1.vy = 0;
    }

    if (NP.state.mode === '2p') {
      if (p2KeyboardActive) {
        p2.vy = (NP.input.up ? -p2Speed : p2Speed) * p2Dir;
      } else if (NP.input.p2TouchY !== null) {
        var target2 = NP.input.p2TouchY - p2.h / 2;
        p2.vy = (target2 - p2.y) * 6;
        p2.vy = NP.clamp(p2.vy, -p2Speed, p2Speed);
      } else {
        p2.vy *= 0.85;
        if (Math.abs(p2.vy) < 10) p2.vy = 0;
      }
    }
  }

  /* == Scoring / Win == */
  function checkWin() {
    if (NP.scores.p1 >= NP.state.scoreLimit || NP.scores.p2 >= NP.state.scoreLimit) {
      var winnerKey = NP.scores.p1 >= NP.state.scoreLimit ? 'p1' : 'p2';
      NP.state.screen = 'gameover';
      NP.AudioEngine.sfxWin();
      showScreen('gameover');
      var winner = winnerKey === 'p1' ? 'PLAYER 1' : (NP.state.mode === 'ai' ? 'AI' : 'PLAYER 2');
      NP.ui.winnerText.textContent = winner + ' WINS';
      NP.ui.finalP1.textContent = NP.scores.p1;
      NP.ui.finalP2.textContent = NP.scores.p2;
      NP.recordGameResult(winnerKey);
    }
  }

  function updateScoreUI() {
    NP.ui.scoreP1.textContent = NP.scores.p1;
    NP.ui.scoreP2.textContent = NP.scores.p2;
  }

  /* == Screens == */
  function showScreen(name) {
    NP.screens.menu.classList.remove('active');
    NP.screens.hud.classList.remove('active');
    NP.screens.pause.classList.remove('active');
    NP.screens.gameover.classList.remove('active');
    NP.screens[name].classList.add('active');
  }

  function startGame(mode, difficulty) {
    NP.AudioEngine.init();
    NP.state.screen = 'playing';
    NP.state.mode = mode;
    NP.state.difficulty = difficulty || 'normal';
    NP.scores = { p1: 0, p2: 0 };
    updateScoreUI();
    NP.ui.modeLabel.textContent = mode === 'ai' ? 'VS AI (' + difficulty.toUpperCase() + ')' : '2 PLAYERS';
    NP.paddles.p1 = NP.makePaddle('left');
    NP.paddles.p2 = NP.makePaddle('right');
    NP.ball = NP.makeBall();
    NP.balls = [NP.ball];
    NP.trails = [];
    NP.particles = [];
    NP.powerUps = [];
    NP.powerUpWarnings = [];
    NP.callouts = [];
    NP.powerUpTimer = 3 + Math.random() * 3;
    NP.lastHitBy = 'p1';
    NP.activeEffects = { p1: {}, p2: {}, global: {} };
    updateEffectUI();
    NP.input = { w: false, s: false, up: false, down: false, p1TouchY: null, p2TouchY: null };
    NP.ui.controlsHint.classList.remove('hidden');
    NP.ui.hintP2.style.display = mode === 'ai' ? 'none' : 'flex';
    showScreen('hud');
  }

  function pauseGame() {
    if (NP.state.screen !== 'playing') return;
    NP.state.screen = 'paused';
    NP.screens.pause.classList.add('active');
  }

  function resumeGame() {
    if (NP.state.screen !== 'paused') return;
    NP.state.screen = 'playing';
    NP.screens.pause.classList.remove('active');
    NP.state.lastTime = 0;
  }

  function quitToMenu() {
    NP.state.screen = 'menu';
    NP.AudioEngine.stopMusic();
    NP.screens.pause.classList.remove('active');
    NP.screens.gameover.classList.remove('active');
    NP.ui.controlsHint.classList.add('hidden');
    NP.powerUps = [];
    NP.powerUpWarnings = [];
    NP.callouts = [];
    NP.activeEffects = { p1: {}, p2: {}, global: {} };
    updateEffectUI();
    showScreen('menu');
  }

  /* == Loop == */
  function loop(timestamp) {
    requestAnimationFrame(loop);
    if (!NP.state.lastTime) NP.state.lastTime = timestamp;
    var dt = (timestamp - NP.state.lastTime) / 1000;
    NP.state.lastTime = timestamp;
    dt = Math.min(dt, 0.05);

    if (NP.state.screen === 'playing') {
      updateInput(dt);
      updateAI(dt);
      updatePaddle(NP.paddles.p1, dt);
      updatePaddle(NP.paddles.p2, dt);
      updateOneBall(NP.ball, dt);
      NP.updatePowerUps(dt);
      NP.updateCallouts(dt);
      NP.updateEffects(dt);
      NP.updateParticles(dt);
      NP.updateTrails();
    }

    render();
  }

  NP.updatePaddle = updatePaddle;
  NP.getPaddleHeight = getPaddleHeight;
  NP.getPaddleSpeed = getPaddleSpeed;
  NP.reflectBallFor = reflectBallFor;
  NP.reflectBall = reflectBall;
  NP.updateOneBall = updateOneBall;
  NP.updateBall = updateBall;
  NP.resetBall = resetBall;
  NP.startRound = startRound;
  NP.updateAI = updateAI;
  NP.updateInput = updateInput;
  NP.checkWin = checkWin;
  NP.updateScoreUI = updateScoreUI;
  NP.showScreen = showScreen;
  NP.startGame = startGame;
  NP.pauseGame = pauseGame;
  NP.resumeGame = resumeGame;
  NP.quitToMenu = quitToMenu;
  NP.loop = loop;

})();
