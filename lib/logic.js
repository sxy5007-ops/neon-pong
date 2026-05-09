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
    p.h = NP.getPaddleHeight(owner);
    p.frozen = effects.freeze > 0;
    if (effects.freeze > 0) { p.vy = 0; return; }
    p.y += p.vy * dt;
    p.y = NP.clamp(p.y, 0, NP.state.height - p.h);
  }

  function getPaddleHeight(owner) {
    var s = NP.scale;
    var base = Math.max(60 * s, NP.state.height * NP.PADDLE_HEIGHT_RATIO);
    var effects = NP.activeEffects[owner] || {};
    var scale = 1;
    if (effects.mega > 0) scale *= 1.65;
    if (effects.tiny > 0) scale *= 0.58;
    return NP.clamp(base * scale, 42 * s, NP.state.height * 0.42);
  }

  function getPaddleSpeed(owner, baseSpeed) {
    var effects = NP.activeEffects[owner] || {};
    var speed = baseSpeed;
    if (effects.slow > 0) speed *= 0.55;
    if (effects.freeze > 0) return 0;
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
    var speed = Math.min((b.baseSpeed + b.hits * NP.SPEED_INCREMENT * NP.scale) * turbo, NP.MAX_SPEED * NP.scale * 1.08);
    var dir = paddle.side === 'left' ? 1 : -1;
    b.vx = Math.cos(bounceAngle) * speed * dir;
    b.vy = Math.sin(bounceAngle) * speed;
    b.speed = speed;
    b.hits++;
    NP.lastHitBy = owner;
  }

  function updateOneBall(b, dt) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life !== Infinity) b.life -= dt;

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

    // Paddle collisions
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

    // Score detection (all balls can score)
    if (b.x + b.r < 0) {
      NP.scores.p2++;
      NP.AudioEngine.sfxScore();
      NP.spawnParticles(0, b.y, 18, NP.COLORS.particle);
      NP.state.shake = 10; NP.state.shakeDecay = 0.78;
      NP.state.flash = 0.15;
      NP.updateScoreUI();
      checkWin();
      if (NP.state.screen === 'playing') NP.startRound('p2');
    } else if (b.x - b.r > NP.state.width) {
      NP.scores.p1++;
      NP.AudioEngine.sfxScore();
      NP.spawnParticles(NP.state.width, b.y, 18, NP.COLORS.particle);
      NP.state.shake = 10; NP.state.shakeDecay = 0.78;
      NP.state.flash = 0.15;
      NP.updateScoreUI();
      checkWin();
      if (NP.state.screen === 'playing') NP.startRound('p1');
    }
  }

  function updateBall(dt) {
    NP.balls.forEach(function (b) { updateOneBall(b, dt); });
    NP.balls = NP.balls.filter(function (b) { return b.life === Infinity || b.life > 0; });
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

    // Ball moving away — drift toward center
    if (NP.ball.vx < 0 || NP.ball.x < NP.state.width * (1 - diff.awareness)) {
      var center = NP.state.height / 2 - p.h / 2;
      var drift = (center - p.y) * 0.03;
      p.vy = p.vy * 0.88 + drift;
      return;
    }

    // Anticipation: project ball position forward accounting for wall bounces
    var projectionTime = diff.reaction * (NP.state.difficulty === 'hard' ? 1.6 : 0.7);
    var projX = NP.ball.x;
    var projY = NP.ball.y;
    var projVx = NP.ball.vx;
    var projVy = NP.ball.vy;
    var steps = Math.max(1, Math.floor(projectionTime / 0.016));
    for (var i = 0; i < steps; i++) {
      projX += projVx * 0.016;
      projY += projVy * 0.016;
      if (projY - NP.ball.r <= 0) { projY = NP.ball.r; projVy = Math.abs(projVy); }
      if (projY + NP.ball.r >= NP.state.height) { projY = NP.state.height - NP.ball.r; projVy = -Math.abs(projVy); }
      // Ball reaches AI paddle plane — stop projecting
      if (projX >= NP.paddles.p2.x) break;
    }

    var targetY = NP.clamp(projY, 0, NP.state.height) - p.h / 2;
    var error = (Math.random() - 0.5) * p.h * diff.error * 2;
    var desiredY = targetY + error;
    var diffY = desiredY - p.y;
    var maxSpeed = NP.getPaddleSpeed('p2', p.speed) * diff.maxSpeedPct;

    // Hard AI aggression bonus: speed boost when ball is close
    if (NP.state.difficulty === 'hard' && NP.ball.x > NP.state.width * 0.6) {
      maxSpeed *= 1.25;
    }

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
    var p1Speed = NP.getPaddleSpeed('p1', p1.speed);
    var p2Speed = NP.getPaddleSpeed('p2', p2.speed);

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
      console.log('[NeonPong] checkWin triggered: p1=' + NP.scores.p1 + ' p2=' + NP.scores.p2 + ' limit=' + NP.state.scoreLimit);
      var winnerKey = NP.scores.p1 >= NP.state.scoreLimit ? 'p1' : 'p2';
      NP.state.screen = 'gameover';
      NP.state.flash = 0.35;
      NP.AudioEngine.sfxWin();
      // Win particle burst
      for (var i = 0; i < 4; i++) {
        NP.spawnParticles(NP.state.width / 2, NP.state.height / 2, 30, NP.COLORS.particle);
      }
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
    Object.keys(NP.screens).forEach(function (key) {
      NP.screens[key].classList.remove('active');
    });
    NP.screens[name].classList.add('active');
  }

  function startGame(mode, difficulty) {
    NP.AudioEngine.init();
    NP.AudioEngine.startMusic();
    NP.state.screen = 'playing';
    NP.state.mode = mode;
    NP.state.difficulty = difficulty || 'normal';
    NP.scores.p1 = 0;
    NP.scores.p2 = 0;
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
    NP.updateEffectUI();
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
    NP.updateEffectUI();
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
      NP.updateEffects(dt);
      NP.updatePowerUps(dt);
      updateBall(dt);
      NP.updateTrails();
      NP.updateCallouts(dt);
    }
    NP.updateParticles(dt);
    NP.render();
  }

  NP.updatePaddle = updatePaddle;
  NP.getPaddleHeight = getPaddleHeight;
  NP.getPaddleSpeed = getPaddleSpeed;
  NP.reflectBallFor = reflectBallFor;
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
