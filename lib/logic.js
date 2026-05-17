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
    if (effects.freeze > 0 || effects.stun > 0) { p.vy = 0; if (effects.freeze > 0) return; }
    p.y += p.vy * dt;
    p.y = NP.clamp(p.y, 0, NP.state.height - p.h);
  }

  function getPaddleHeight(owner) {
    var s = NP.scale;
    var base = Math.max(60 * s, NP.state.height * NP.config.PADDLE_HEIGHT_RATIO);
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
    var speed = Math.min((b.baseSpeed + b.hits * NP.config.SPEED_INCREMENT * NP.scale) * turbo, NP.config.MAX_SPEED * NP.scale * 1.08);
    var dir = paddle.side === 'left' ? 1 : -1;
    b.vx = Math.cos(bounceAngle) * speed * dir;
    b.vy = Math.sin(bounceAngle) * speed;
    b.speed = speed;
    b.hits++;
    // Combo: increment on consecutive hits
    if (NP.lastHitBy === owner) {
      NP.state.combo++;
    } else {
      NP.state.combo = 1;
    }
    NP.state.comboTimer = 3; // seconds before combo resets
    NP.lastHitBy = owner;
    // Stats tracking
    NP.stats.longestRally = Math.max(NP.stats.longestRally, NP.state.combo);
    NP.stats.fastestHit = Math.max(NP.stats.fastestHit, b.speed || 0);
  }

  function updateOneBall(b, dt) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life !== Infinity) b.life -= dt;

    // Wall collisions
    var ricochetActive = NP.activeEffects[NP.lastHitBy] && NP.activeEffects[NP.lastHitBy].ricochet > 0;
    if (b.y - b.r <= 0) {
      b.y = b.r; b.vy = Math.abs(b.vy);
      if (ricochetActive) { b.vy *= 1.15; b.vx *= 1.15; }
      NP.AudioEngine.sfxWallHit();
      NP.spawnParticles(b.x, b.y, 6, NP.config.COLORS.particle);
    } else if (b.y + b.r >= NP.state.height) {
      b.y = NP.state.height - b.r; b.vy = -Math.abs(b.vy);
      if (ricochetActive) { b.vy *= 1.15; b.vx *= 1.15; }
      NP.AudioEngine.sfxWallHit();
      NP.spawnParticles(b.x, b.y, 6, NP.config.COLORS.particle);
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

    // Phase shift: ball passes through paddles for collector
    if (!(NP.activeEffects[NP.lastHitBy] && NP.activeEffects[NP.lastHitBy].phase > 0)) {
      if (checkPaddle(NP.paddles.p1) && !hitPaddle) {
        b.x = NP.paddles.p1.x + NP.paddles.p1.w + b.r;
        reflectBallFor(b, NP.paddles.p1);
        NP.AudioEngine.sfxPaddleHit();
        NP.state.shake = 6; NP.state.shakeDecay = 0.82;
        NP.spawnParticles(b.x, b.y, 10, NP.config.COLORS.particle);
        NP.paddleHitBursts.push({ x: b.x, y: b.y, life: 0.4, maxLife: 0.4, count: 8, phase: Math.random() * Math.PI * 2, color: '#00ffff' });
        hitPaddle = true;
      }
      if (checkPaddle(NP.paddles.p2) && !hitPaddle) {
        b.x = NP.paddles.p2.x - b.r;
        reflectBallFor(b, NP.paddles.p2);
        NP.AudioEngine.sfxPaddleHit();
        NP.state.shake = 6; NP.state.shakeDecay = 0.82;
        NP.spawnParticles(b.x, b.y, 10, NP.config.COLORS.particle);
        NP.paddleHitBursts.push({ x: b.x, y: b.y, life: 0.4, maxLife: 0.4, count: 8, phase: Math.random() * Math.PI * 2, color: '#ff00ff' });
        hitPaddle = true;
      }
      // Near-miss detection: ball passed very close to paddle edge without hitting
      if (!hitPaddle) {
        // Check p1 paddle sides
        var p1 = NP.paddles.p1;
        if (b.x > p1.x + p1.w && b.x < p1.x + p1.w + 25) {
          var p1Top = p1.y - 15;
          var p1Bot = p1.y + p1.h + 15;
          if (b.y >= p1Top && b.y <= p1Bot) {
            NP.nearMisses.push({ x: b.x + 15, y: b.y, life: 0.6, maxLife: 0.6, color: '#00ffff' });
          }
        }
        // Check p2 paddle sides
        var p2 = NP.paddles.p2;
        if (b.x < p2.x && b.x > p2.x - 25) {
          var p2Top = p2.y - 15;
          var p2Bot = p2.y + p2.h + 15;
          if (b.y >= p2Top && b.y <= p2Bot) {
            NP.nearMisses.push({ x: b.x - 15, y: b.y, life: 0.6, maxLife: 0.6, color: '#ff00ff' });
          }
        }
      }
    }

    // Reset combo on score
    NP.state.combo = 0;
    NP.state.comboTimer = 0;

    // Score detection (all balls can score)
    if (b.x + b.r < 0) {
      NP.scores.p2++;
      NP.AudioEngine.sfxScore();
      NP.spawnParticles(0, b.y, 18, NP.config.COLORS.particle);
      var speedRatio = Math.min(b.speed / NP.config.INITIAL_SPEED, 3);
      NP.state.shake = 6 + speedRatio * 8; NP.state.shakeDecay = 0.78;
      NP.state.flash = 0.35;
      NP.state.scoreFlashP2 = 0.8;
      NP.updateScoreUI();
      checkWin();
      if (NP.state.screen === 'playing') {
        if (b.isMain) NP.startRound('p2');
        else b.life = -1;
      }
    } else if (b.x - b.r > NP.state.width) {
      NP.scores.p1++;
      NP.AudioEngine.sfxScore();
      NP.spawnParticles(NP.state.width, b.y, 18, NP.config.COLORS.particle);
      var speedRatio = Math.min(b.speed / NP.config.INITIAL_SPEED, 3);
      NP.state.shake = 6 + speedRatio * 8; NP.state.shakeDecay = 0.78;
      NP.state.flash = 0.35;
      NP.state.scoreFlashP1 = 0.8;
      NP.updateScoreUI();
      checkWin();
      if (NP.state.screen === 'playing') {
        if (b.isMain) NP.startRound('p1');
        else b.life = -1;
      }
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
    var diff = NP.config.DIFFICULTY[NP.state.difficulty];
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

  /* == Tornado Hazard == */
  function updateTornado(dt) {
    if (NP.tornado.active) {
      NP.tornado.life -= dt;
      NP.tornado.spin += dt * 3;
      // Gentle sway
      NP.tornado.y += Math.sin(Date.now() * 0.001) * 20 * dt;
      // Clamp to map
      var r = NP.config.TORNADO_RADIUS * NP.scale;
      NP.tornado.x = NP.clamp(NP.tornado.x, r, NP.state.width - r);
      NP.tornado.y = NP.clamp(NP.tornado.y, r, NP.state.height - r);
      
      // Check collision with all balls
      NP.balls.forEach(function (b) {
        if (b.life <= 0 && b.life !== Infinity) return;
        var dx = b.x - NP.tornado.x;
        var dy = b.y - NP.tornado.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var minDist = b.r + r;
        if (dist < minDist) {
          // Random knock direction — boosts current speed, never slows
          var angle = Math.random() * Math.PI * 2;
          var currentSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          var minSpeed = NP.config.TORNADO_KNOCK_SPEED * NP.scale;
          var newSpeed = Math.max(currentSpeed * 1.4, minSpeed);
          b.vx = Math.cos(angle) * newSpeed;
          b.vy = Math.sin(angle) * newSpeed;
          // Push ball out of tornado
          var overlap = minDist - dist;
          b.x += (dx / dist || 1) * overlap;
          b.y += (dy / dist || 1) * overlap;
          // Visual feedback
          NP.state.shake = 10;
          NP.state.shakeDecay = 0.78;
          NP.spawnParticles(b.x, b.y, 16, ['#00ffff', '#39ff14', '#ffffff']);
        }
      });
      
      // Expire after lifetime
      if (NP.tornado.life <= 0) {
        NP.tornado.active = false;
        NP.tornado.spawnTimer = NP.config.TORNADO_COOLDOWN_MIN + Math.random() * (NP.config.TORNADO_COOLDOWN_MAX - NP.config.TORNADO_COOLDOWN_MIN);
      }
    } else {
      NP.tornado.spawnTimer -= dt;
      if (NP.tornado.spawnTimer <= 0) {
        // Spawn tornado at random position
        var r = NP.config.TORNADO_RADIUS * NP.scale;
        var margin = r * 2;
        NP.tornado.active = true;
        NP.tornado.x = margin + Math.random() * (NP.state.width - margin * 2);
        NP.tornado.y = margin + Math.random() * (NP.state.height - margin * 2);
        NP.tornado.life = NP.config.TORNADO_LIFETIME;
        NP.tornado.spin = 0;
        NP.state.shake = 8;
        NP.state.shakeDecay = 0.82;
      }
    }
  }

  /* == Laser Grid Hazard == */
  function updateLasers(dt) {
    var cfg = NP.config;
    if (NP.state.lasers.length > 0) {
      // Lasers active — rotate and check collision
      NP.state.laserTimer -= dt;
      NP.state.lasers.forEach(function (l) {
        l.angle += l.rotationSpeed * dt;
        // Check collision with all balls
        NP.balls.forEach(function (b) {
          if (b.life <= 0 && b.life !== Infinity) return;
          var dx = b.x - l.x;
          var dy = b.y - l.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var beamHalf = cfg.LASER_LENGTH * NP.scale * 0.5;
          if (dist < beamHalf + b.r) {
            // Approx angle check — ball is near the laser direction axis
            var a = Math.atan2(dy, dx) - l.angle;
            a = ((a % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
            if (a > Math.PI) a -= Math.PI * 2;
            if (Math.abs(a) < 0.3) {
              // Teleport ball to random Y on same X side
              var margin = 40 * NP.scale;
              var side = b.x < NP.state.width * 0.5 ? -1 : 1;
              b.y = margin + Math.random() * (NP.state.height - margin * 2);
              b.x = side < 0 ? NP.state.width * 0.15 : NP.state.width * 0.85;
              NP.state.shake = 12;
              NP.state.shakeDecay = 0.75;
              NP.spawnParticles(b.x, b.y, 20, ['#ff0040', '#ff0066', '#ffffff']);
            }
          }
        });
      });
      // Expire
      if (NP.state.laserTimer <= 0) {
        NP.state.lasers = [];
        NP.state.laserCooldown = cfg.LASER_COOLDOWN_MIN + Math.random() * (cfg.LASER_COOLDOWN_MAX - cfg.LASER_COOLDOWN_MIN);
      }
    } else {
      // Cooldown
      NP.state.laserCooldown -= dt;
      if (NP.state.laserCooldown <= 0) {
        NP.state.laserTimer = cfg.LASER_DURATION;
        NP.state.lasers = [];
        var margin = 100 * NP.scale;
        for (var i = 0; i < cfg.LASER_COUNT; i++) {
          NP.state.lasers.push({
            x: margin + Math.random() * (NP.state.width - margin * 2),
            y: margin + Math.random() * (NP.state.height - margin * 2),
            angle: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * cfg.LASER_SPEED * 2
          });
        }
        NP.state.shake = 6;
        NP.state.shakeDecay = 0.85;
      }
    }
  }

  /* == Data Worm Hazard == */
  function updateWorm(dt) {
    var cfg = NP.config;
    if (NP.worm && NP.worm.active) {
      NP.worm.life -= dt;
      // Update head position — patrol along edges or hold during eat
      if (NP.worm.eatenBall) {
        NP.worm.eatenTimer -= dt;
        if (NP.worm.eatenTimer <= 0) {
          // Spit ball out
          var angle = Math.random() * Math.PI * 2;
          var spd = cfg.WORM_EJECT_SPEED * NP.scale;
          NP.worm.eatenBall.vx = Math.cos(angle) * spd;
          NP.worm.eatenBall.vy = Math.sin(angle) * spd;
          NP.worm.eatenBall.life = Infinity;
          NP.worm.eatenBall = null;
          NP.state.shake = 8;
          NP.state.shakeDecay = 0.8;
          NP.spawnParticles(NP.worm.segments[0].x, NP.worm.segments[0].y, 12, ['#39ff14', '#00ff00', '#ffffff']);
        }
        return; // Don't move while holding ball
      }
      // Patrol around field edges
      var margin = cfg.WORM_PATROL_MARGIN * NP.scale;
      var head = NP.worm.segments[0];
      NP.worm.patrolAngle += dt * 0.15;
      var patrolX = margin + (NP.state.width - margin * 2) * (0.5 + 0.5 * Math.sin(NP.worm.patrolAngle));
      var patrolY = margin + (NP.state.height - margin * 2) * (0.5 + 0.5 * Math.cos(NP.worm.patrolAngle * 0.7));
      var dx = patrolX - head.x;
      var dy = patrolY - head.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        var speed = cfg.WORM_SPEED * NP.scale * dt;
        head.x += (dx / dist) * speed;
        head.y += (dy / dist) * speed;
      }
      // Body segments follow head
      var spacing = cfg.WORM_SEGMENT_RADIUS * NP.scale * 2.2;
      for (var i = 1; i < NP.worm.segments.length; i++) {
        var prev = NP.worm.segments[i - 1];
        var seg = NP.worm.segments[i];
        var sdx = prev.x - seg.x;
        var sdy = prev.y - seg.y;
        var sdist = Math.sqrt(sdx * sdx + sdy * sdy);
        if (sdist > spacing) {
          seg.x = prev.x - (sdx / sdist) * spacing;
          seg.y = prev.y - (sdy / sdist) * spacing;
        }
      }
      // Collision with balls
      if (!NP.worm.eatenBall) {
        NP.balls.forEach(function (b) {
          if (b.life <= 0 && b.life !== Infinity) return;
          var h = NP.worm.segments[0];
          var bdx = b.x - h.x;
          var bdy = b.y - h.y;
          var bdist = Math.sqrt(bdx * bdx + bdy * bdy);
          var minDist = b.r + cfg.WORM_SEGMENT_RADIUS * NP.scale * 1.5;
          if (bdist < minDist) {
            // Eat the ball
            NP.worm.eatenBall = b;
            NP.worm.eatenTimer = cfg.WORM_EJECT_DELAY;
            b.life = -1; // Hide ball
            NP.state.shake = 6;
            NP.state.shakeDecay = 0.82;
            NP.spawnParticles(h.x, h.y, 16, ['#39ff14', '#00ff00', '#ffffff']);
          }
        });
      }
      // Expire
      if (NP.worm.life <= 0) {
        NP.worm.active = false;
        NP.worm.cooldown = cfg.WORM_COOLDOWN_MIN + Math.random() * (cfg.WORM_COOLDOWN_MAX - cfg.WORM_COOLDOWN_MIN);
        if (NP.worm.eatenBall) {
          // Release ball if still eaten when expiring
          NP.worm.eatenBall.life = Infinity;
          NP.worm.eatenBall = null;
        }
      }
    } else {
      // Cooldown
      if (!NP.worm) {
        NP.worm = { segments: [], active: false, life: 0, cooldown: 15 + Math.random() * 20, patrolAngle: 0, eatenBall: null, eatenTimer: 0 };
      }
      NP.worm.cooldown -= dt;
      if (NP.worm.cooldown <= 0) {
        // Spawn worm
        var segs = [];
        var margin = 100 * NP.scale;
        var sx = margin + Math.random() * (NP.state.width - margin * 2);
        var sy = margin + Math.random() * (NP.state.height - margin * 2);
        for (var si = 0; si < cfg.WORM_SEGMENTS; si++) {
          segs.push({ x: sx - si * cfg.WORM_SEGMENT_RADIUS * NP.scale * 2, y: sy });
        }
        NP.worm = {
          segments: segs,
          active: true,
          life: cfg.WORM_DURATION,
          cooldown: 0,
          patrolAngle: Math.random() * Math.PI * 2,
          eatenBall: null,
          eatenTimer: 0,
        };
        NP.state.shake = 4;
        NP.state.shakeDecay = 0.88;
      }
    }
  }

  /* == Bumpers == */
  function updateBumpers(dt) {
    NP.balls.forEach(function (b) {
      NP.bumpers.forEach(function (bu) {
        var dx = b.x - bu.x;
        var dy = b.y - bu.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var minDist = b.r + bu.r;
        if (dist < minDist) {
          // Push ball out of bumper
          var overlap = minDist - dist;
          var nx = dx / dist;
          var ny = dy / dist;
          b.x += nx * overlap;
          b.y += ny * overlap;
          // Bounce with amplified speed
          var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          var boost = 1.15;
          b.vx = nx * speed * boost;
          b.vy = ny * speed * boost;
          // Visual feedback
          NP.state.shake = 4;
          NP.state.shakeDecay = 0.82;
          bu.glowPhase += 1; // flash on hit
        }
      });
    });
  }

  /* == Disco Mode == */
  function updateDisco(dt) {
    var disco = NP.disco;
    if (disco.active) {
      disco.life -= dt;
      disco.hue = (disco.hue + dt * 90) % 360;
      disco.beatPhase += dt * (NP.config.DISCO_BPM / 60);

      // Boost ball speed by 60% for all balls
      NP.balls.forEach(function (b) {
        var spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        var targetSpeed = b.baseSpeed * 1.6;
        if (spd < targetSpeed) {
          var ratio = targetSpeed / spd;
          b.vx *= ratio;
          b.vy *= ratio;
          b.speed = spd * ratio;
        }
      });

      if (disco.life <= 0) {
        disco.active = false;
        disco.cooldown = NP.config.DISCO_COOLDOWN_MIN + Math.random() * (NP.config.DISCO_COOLDOWN_MAX - NP.config.DISCO_COOLDOWN_MIN);
        NP.AudioEngine.stopDiscoMusic();
        NP.AudioEngine.startMusic();
      }
    } else {
      disco.cooldown -= dt;
      if (disco.cooldown <= 0) {
        disco.active = true;
        disco.life = NP.config.DISCO_DURATION;
        disco.hue = 0;
        disco.beatPhase = 0;
        NP.AudioEngine.stopMusic();
        NP.AudioEngine.startDiscoMusic();
        NP.callouts.push({
          text: 'DISCO MODE',
          life: NP.config.CALLOUT_LIFE || 2.5,
          x: NP.state.width / 2,
          y: NP.state.height * 0.3,
          color: '#ff00ff',
          size: 2.5,
        });
      }
    }
  }

  /* == Kaiju Event == */
  function updateKaiju(dt) {
    var k = NP.kaiju;
    if (!k.active) {
      k.cooldown -= dt;
      if (k.cooldown <= 0) {
        k.warningTimer = 2.5;
        k.active = true;
        var patterns = NP.config.KAIJU_PATTERNS;
        k.pattern = patterns[Math.floor(Math.random() * patterns.length)];
        k.patternTimer = 2.5 + Math.random() * 3;
        k.armPhase = 0;
        k.shockwaveActive = false;
        if (k.pattern === 'slam') {
          k.armTargetX = NP.state.width * 0.3 + Math.random() * NP.state.width * 0.4;
          k.armTargetY = 0;
          k.armX = k.armTargetX;
          k.armY = -NP.config.KAIJU_ARM_HEIGHT;
        } else if (k.pattern === 'sweep') {
          k.armTargetX = NP.state.width * 0.8;
          k.armTargetY = 100 + Math.random() * (NP.state.height * 0.4);
          k.armX = -NP.config.KAIJU_ARM_WIDTH;
          k.armY = k.armTargetY;
        } else if (k.pattern === 'rumble') {
          k.armTargetX = NP.state.width * 0.7;
          k.armTargetY = NP.state.height - 40;
          k.armX = -NP.config.KAIJU_ARM_WIDTH;
          k.armY = k.armTargetY;
        } else {
          k.armTargetX = NP.state.width / 2;
          k.armTargetY = NP.state.height * 0.2;
          k.armX = k.armTargetX;
          k.armY = -NP.config.KAIJU_ARM_HEIGHT;
        }
        NP.callouts.push({
          text: 'WARNING: KAIJU INCOMING',
          life: 2.0,
          x: NP.state.width / 2,
          y: NP.state.height * 0.25,
          color: '#ff4400',
          size: 2.5,
        });
        NP.state.shake = 8;
        NP.state.shakeDecay = 0.82;
        return;
      }
      return;
    }

    if (k.warningTimer > 0) {
      k.warningTimer -= dt;
      return;
    }

    k.timer += dt;
    k.patternTimer -= dt;

    var attackTick = false;
    if (k.patternTimer <= 0 && k.timer < NP.config.KAIJU_DURATION) {
      var patterns = NP.config.KAIJU_PATTERNS;
      k.pattern = patterns[Math.floor(Math.random() * patterns.length)];
      k.patternTimer = 2 + Math.random() * 3;
      k.armPhase = 0;
      attackTick = true;
    }

    if (k.pattern === 'slam') {
      if (k.armPhase === 0) {
        k.armY += 350 * dt;
        if (k.armY >= 0) {
          k.armY = 0;
          k.armPhase = 1;
          impactSlam();
        }
      } else if (k.armPhase === 1) {
        k.shockwaveActive = true;
        k.shockwaveTimer += dt;
        k.shockwaveRadius = Math.min(k.shockwaveRadius + 600 * dt, NP.config.KAIJU_SHOCKWAVE_RADIUS);
        if (k.shockwaveTimer > 0.5) {
          k.shockwaveActive = false;
          k.shockwaveTimer = 0;
          k.shockwaveRadius = 0;
          k.armPhase = 2;
        }
      } else if (k.armPhase === 2) {
        k.armY -= 200 * dt;
      }
    } else if (k.pattern === 'sweep') {
      var sweepSpeed = 300 * dt;
      if (k.armPhase === 0) {
        k.armX += sweepSpeed;
        k.armY = k.armTargetY + Math.sin(k.timer * 3) * 40;
        var kaijuSplitBalls = [];
        NP.balls.forEach(function (b) {
          if (b.life <= 0 && b.life !== Infinity) return;
          var dx = b.x - k.armX;
          var dy = b.y - k.armY;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < NP.config.KAIJU_ARM_WIDTH * 0.5 + b.r && !b.splitByKaiju) {
            b.splitByKaiju = true;
            var splitA = NP.makeExtraBall(b, -0.6);
            var splitB = NP.makeExtraBall(b, 0.6);
            splitA.splitByKaiju = true;
            splitB.splitByKaiju = true;
            kaijuSplitBalls.push(splitA, splitB);
            b.vy = -Math.abs(b.vy) - 200;
            NP.state.shake = 10;
            NP.state.shakeDecay = 0.8;
            NP.spawnParticles(b.x, b.y, 16, ['#8b5cf6', '#ff4400', '#ffffff']);
          }
        });
        if (kaijuSplitBalls.length > 0) {
          NP.balls = NP.balls.concat(kaijuSplitBalls);
        }
        ['p1', 'p2'].forEach(function (owner) {
          var p = NP.paddles[owner];
          if (!p) return;
          if (Math.abs(p.x - k.armX) < NP.config.KAIJU_ARM_WIDTH * 0.6 &&
              Math.abs(p.y + p.h / 2 - k.armY) < 120) {
            NP.activeEffects[owner].stun = Math.max(NP.activeEffects[owner].stun || 0, NP.config.KAIJU_STUN_DURATION);
            NP.state.shake = 6;
            NP.state.shakeDecay = 0.82;
          }
        });
        if (k.armX > NP.state.width + NP.config.KAIJU_ARM_WIDTH) {
          k.armPhase = 1;
        }
      }
    } else if (k.pattern === 'rumble') {
      var rumbleSpeed = 250 * dt;
      if (k.armPhase === 0) {
        k.armX += rumbleSpeed;
        k.armY = NP.state.height - 40 + Math.sin(k.timer * 5) * 20;
        NP.balls.forEach(function (b) {
          if (b.life <= 0 && b.life !== Infinity) return;
          if (b.y > NP.state.height * 0.7 && Math.abs(b.x - k.armX) < NP.config.KAIJU_ARM_WIDTH * 0.8) {
            b.vy = -Math.abs(b.vy) - 150;
            NP.state.shake = 4;
            NP.state.shakeDecay = 0.85;
          }
        });
        if (k.armX > NP.state.width + NP.config.KAIJU_ARM_WIDTH) {
          k.armPhase = 1;
        }
      }
    } else if (k.pattern === 'roar') {
      if (k.armPhase === 0) {
        k.armY -= 150 * dt;
        if (k.timer * 1 > 1) {
          k.armPhase = 1;
          NP.balls.forEach(function (b) {
            b.vx += (Math.random() - 0.5) * 400;
            b.vy += (Math.random() - 0.5) * 400;
          });
          NP.state.shake = 20;
          NP.state.shakeDecay = 0.7;
          NP.spawnParticles(NP.state.width / 2, NP.state.height * 0.3, 50, ['#ff4400', '#ffaa00', '#ffffff', '#8b5cf6']);
          NP.callouts.push({
            text: 'KAIJU ROAR',
            life: 1.5,
            x: NP.state.width / 2,
            y: NP.state.height * 0.35,
            color: '#ff4400',
            size: 3.0,
          });
          NP.AudioEngine.sfxKaijuRoar();
        }
      } else {
        k.armY += 120 * dt;
        if (k.patternTimer <= 0) {
          k.armPhase = 0;
        }
      }
    }

    function impactSlam() {
      var sx = k.armTargetX;
      var sy = k.armTargetY;
      NP.balls.forEach(function (b) {
        var dx = b.x - sx;
        var dy = b.y - sy;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var pushForce = 350;
        b.vx += (dx / dist) * pushForce;
        b.vy += (dy / dist) * pushForce;
      });
      ['p1', 'p2'].forEach(function (owner) {
        var p = NP.paddles[owner];
        if (!p) return;
        var px = p.x + p.w / 2;
        var py = p.y + p.h / 2;
        var pDist = Math.sqrt((px - sx) * (px - sx) + (py - sy) * (py - sy));
        if (pDist < NP.config.KAIJU_SHOCKWAVE_RADIUS) {
          NP.activeEffects[owner].stun = Math.max(NP.activeEffects[owner].stun || 0, NP.config.KAIJU_STUN_DURATION);
        }
      });
      NP.state.shake = 25;
      NP.state.shakeDecay = 0.72;
      NP.spawnParticles(sx, sy, 60, ['#ff4400', '#ffaa00', '#ffffff', '#8b5cf6', '#b026ff']);
      NP.callouts.push({
        text: 'KAIJU SLAM',
        life: 1.5,
        x: NP.state.width / 2,
        y: NP.state.height * 0.3,
        color: '#ff4400',
        size: 2.5,
      });
      NP.AudioEngine.sfxKaijuSlam();
    }

    if (k.timer >= NP.config.KAIJU_DURATION) {
      k.active = false;
      k.timer = 0;
      k.cooldown = NP.config.KAIJU_COOLDOWN_MIN + Math.random() * (NP.config.KAIJU_COOLDOWN_MAX - NP.config.KAIJU_COOLDOWN_MIN);
      k.shockwaveActive = false;
      k.shockwaveRadius = 0;
    }
  }

  /* == Neon Storm Event == */
  function updateStorm(dt) {
    var s = NP.storm;
    if (!s.active) {
      s.cooldown -= dt;
      if (s.cooldown <= 0) {
        s.active = true;
        s.timer = 0;
        s.strikeTimer = 0;
        s.bolts = [];
        s.warningBolts = [];
        s.warningTimer = 1.5;
        NP.callouts.push({
          text: 'NEON STORM',
          life: 2.0,
          x: NP.state.width / 2,
          y: NP.state.height * 0.25,
          color: '#00bfff',
          size: 2.5,
        });
      }
      return;
    }

    if (s.warningTimer > 0) {
      s.warningTimer -= dt;
      return;
    }

    s.timer += dt;
    s.strikeTimer += dt;

    if (s.strikeTimer >= NP.config.STORM_STRIKE_INTERVAL) {
      s.strikeTimer = 0;
      var strikeX = 50 + Math.random() * (NP.state.width - 100);
      var strikeY = 50 + Math.random() * (NP.state.height - 100);
      s.warningBolts.push({ x: strikeX, y: strikeY, life: 0.4 });
    }

    s.warningBolts.forEach(function (wb) {
      wb.life -= dt;
    });
    s.warningBolts = s.warningBolts.filter(function (wb) {
      if (wb.life <= 0) {
        s.bolts.push({ x: wb.x, y: wb.y, life: 0.5, phase: 0 });
        NP.balls.forEach(function (b) {
          var dx = b.x - wb.x;
          var dy = b.y - wb.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < NP.config.STORM_STUN_RADIUS) {
            var angle = Math.atan2(dy, dx);
            b.vx += Math.cos(angle) * 300;
            b.vy += Math.sin(angle) * 300;
          }
        });
        ['p1', 'p2'].forEach(function (owner) {
          var p = NP.paddles[owner];
          if (!p) return;
          var px = p.x + p.w / 2;
          var py = p.y + p.h / 2;
          if (Math.sqrt((px - wb.x) * (px - wb.x) + (py - wb.y) * (py - wb.y)) < NP.config.STORM_STUN_RADIUS) {
            NP.activeEffects[owner].reverse = Math.max(NP.activeEffects[owner].reverse || 0, NP.config.STORM_REVERSE_DURATION);
          }
        });
        NP.state.shake = 8;
        NP.state.shakeDecay = 0.82;
        NP.spawnParticles(wb.x, wb.y, 20, ['#00bfff', '#ffffff', '#4fc3f7']);
        NP.AudioEngine.sfxStormStrike();
        return false;
      }
      return true;
    });

    s.bolts.forEach(function (bolt) {
      bolt.life -= dt;
    });
    s.bolts = s.bolts.filter(function (bolt) { return bolt.life > 0; });

    if (s.timer >= NP.config.STORM_DURATION) {
      s.active = false;
      s.timer = 0;
      s.cooldown = NP.config.STORM_COOLDOWN_MIN + Math.random() * (NP.config.STORM_COOLDOWN_MAX - NP.config.STORM_COOLDOWN_MIN);
    }
  }

  /* == Time Pocket Event == */
  function updateTimePocket(dt) {
    var tp = NP.timePocket;
    if (!tp.active) {
      tp.cooldown -= dt;
      if (tp.cooldown <= 0) {
        tp.active = true;
        tp.timer = 0;
        var margin = NP.config.POCKET_RADIUS + 20;
        tp.x = margin + Math.random() * (NP.state.width - margin * 2);
        tp.y = margin + Math.random() * (NP.state.height - margin * 2);
        var angle = Math.random() * Math.PI * 2;
        tp.vx = Math.cos(angle) * NP.config.POCKET_SPEED;
        tp.vy = Math.sin(angle) * NP.config.POCKET_SPEED;
        NP.callouts.push({
          text: 'TIME POCKET',
          life: 2.0,
          x: NP.state.width / 2,
          y: NP.state.height * 0.3,
          color: '#ff8c00',
          size: 2.5,
        });
      }
      return;
    }

    tp.timer += dt;

    tp.x += tp.vx * dt;
    tp.y += tp.vy * dt;
    var margin = NP.config.POCKET_RADIUS + 10;
    if (tp.x < margin) { tp.x = margin; tp.vx *= -1; }
    if (tp.x > NP.state.width - margin) { tp.x = NP.state.width - margin; tp.vx *= -1; }
    if (tp.y < margin) { tp.y = margin; tp.vy *= -1; }
    if (tp.y > NP.state.height - margin) { tp.y = NP.state.height - margin; tp.vy *= -1; }

    NP.balls.forEach(function (b) {
      if (b.life <= 0 && b.life !== Infinity) return;
      var dx = b.x - tp.x;
      var dy = b.y - tp.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < NP.config.POCKET_RADIUS) {
        b.vx *= (1 - (1 - NP.config.POCKET_SLOW_FACTOR) * dt * 3);
        b.vy *= (1 - (1 - NP.config.POCKET_SLOW_FACTOR) * dt * 3);
      }
    });

    ['p1', 'p2'].forEach(function (owner) {
      var p = NP.paddles[owner];
      if (!p) return;
      var px = p.x + p.w / 2;
      var py = p.y + p.h / 2;
      var dist = Math.sqrt((px - tp.x) * (px - tp.x) + (py - tp.y) * (py - tp.y));
      if (dist < NP.config.POCKET_RADIUS) {
        NP.activeEffects[owner].slow = Math.max(NP.activeEffects[owner].slow || 0, 0.5);
      }
    });

    if (tp.timer >= NP.config.POCKET_DURATION) {
      tp.active = false;
      tp.timer = 0;
      tp.cooldown = NP.config.POCKET_COOLDOWN_MIN + Math.random() * (NP.config.POCKET_COOLDOWN_MAX - NP.config.POCKET_COOLDOWN_MIN);
    }
  }

  /* == Scoring / Win == */
  function checkWin() {
    if (NP.scores.p1 >= NP.state.scoreLimit || NP.scores.p2 >= NP.state.scoreLimit) {
      console.log('[NeonPong] checkWin triggered: p1=' + NP.scores.p1 + ' p2=' + NP.scores.p2 + ' limit=' + NP.state.scoreLimit);
      var winnerKey = NP.scores.p1 >= NP.state.scoreLimit ? 'p1' : 'p2';
      NP.state.screen = 'gameover';
      NP.state.flash = 0.35;
      NP.stats.duration = Math.floor((Date.now() - NP.stats.startTime) / 1000);
      NP.AudioEngine.sfxWin();
      // Win particle burst
      for (var i = 0; i < 4; i++) {
        NP.spawnParticles(NP.state.width / 2, NP.state.height / 2, 30, NP.config.COLORS.particle);
      }
      showScreen('gameover');
      var winner = winnerKey === 'p1' ? 'PLAYER 1' : (NP.state.mode === 'ai' ? 'AI' : 'PLAYER 2');
      NP.ui.winnerText.textContent = winner + ' WINS';
      NP.ui.finalP1.textContent = NP.scores.p1;
      NP.ui.finalP2.textContent = NP.scores.p2;
      NP.recordGameResult(winnerKey);
      updateStatsUI();
    }
  }

  function updateScoreUI() {
    NP.ui.scoreP1.textContent = NP.scores.p1;
    NP.ui.scoreP2.textContent = NP.scores.p2;
  }

  function updateStatsUI() {
    if (!NP.ui.statRally) return;
    var s = NP.stats;
    NP.ui.statRally.textContent = s.longestRally;
    NP.ui.statSpeed.textContent = Math.round(s.fastestHit) + ' px/s';
    NP.ui.statPowerups.textContent = s.powerupsCollected;
    var min = Math.floor(s.duration / 60);
    var sec = s.duration % 60;
    NP.ui.statDuration.textContent = min > 0 ? min + 'm ' + sec + 's' : sec + 's';
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
    NP.resetStats();
    NP.stats.startTime = Date.now();
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
    NP.state.combo = 0;
    NP.state.comboTimer = 0;
    NP.activeEffects = { p1: {}, p2: {}, global: {} };
    NP.bumpers = NP.generateBumpers();
    NP.tornado.active = false;
    NP.tornado.spawnTimer = 15 + Math.random() * 15;
    NP.tornado.life = 0;
    NP.disco.active = false;
    NP.disco.life = 0;
    NP.disco.cooldown = 20 + Math.random() * 25;
    NP.disco.hue = 0;
    NP.disco.beatPhase = 0;
    NP.decoys = [];
    NP.paddleHitBursts = [];
    NP.nearMisses = [];
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
    NP.AudioEngine.stopDiscoMusic();
    NP.disco.active = false;
    NP.screens.pause.classList.remove('active');
    NP.screens.gameover.classList.remove('active');
    NP.ui.controlsHint.classList.add('hidden');
    NP.powerUps = [];
    NP.powerUpWarnings = [];
    NP.callouts = [];
    NP.activeEffects = { p1: {}, p2: {}, global: {} };
    NP.bumpers = [];
    NP.updateEffectUI();
    NP.updateSaveUI(NP.ui);
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
      NP.updateBumpers(dt);
      NP.updateTornado(dt);
      NP.updateDisco(dt);
      NP.updateKaiju(dt);
      NP.updateLasers(dt);
      NP.updateWorm(dt);
      NP.updateStorm(dt);
      NP.updateTimePocket(dt);
      updateBall(dt);
      NP.updateTrails();
      NP.updateCallouts(dt);
    }
    NP.updateParticles(dt);
    // Decay score flash timers
    if (NP.state.scoreFlashP1 > 0) NP.state.scoreFlashP1 = Math.max(0, NP.state.scoreFlashP1 - dt * 1.5);
    if (NP.state.scoreFlashP2 > 0) NP.state.scoreFlashP2 = Math.max(0, NP.state.scoreFlashP2 - dt * 1.5);
    // Combo timer decay
    if (NP.state.comboTimer > 0) {
      NP.state.comboTimer -= dt;
      if (NP.state.comboTimer <= 0) { NP.state.comboTimer = 0; NP.state.combo = 0; }
    }
    // Decay near-miss and paddle-hit-burst life values
    NP.nearMisses.forEach(function (nm) { nm.life -= dt; });
    NP.nearMisses = NP.nearMisses.filter(function (nm) { return nm.life > 0; });
    NP.paddleHitBursts.forEach(function (phb) { phb.life -= dt; });
    NP.paddleHitBursts = NP.paddleHitBursts.filter(function (phb) { return phb.life > 0; });
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
  NP.updateBumpers = updateBumpers;
  NP.updateTornado = updateTornado;
  NP.updateDisco = updateDisco;
  NP.updateKaiju = updateKaiju;
  NP.updateStorm = updateStorm;
  NP.updateLasers = updateLasers;
  NP.updateWorm = updateWorm;
  NP.updateTimePocket = updateTimePocket;
  NP.checkWin = checkWin;
  NP.updateScoreUI = updateScoreUI;
  NP.showScreen = showScreen;
  NP.startGame = startGame;
  NP.pauseGame = pauseGame;
  NP.resumeGame = resumeGame;
  NP.quitToMenu = quitToMenu;
  NP.loop = loop;

})();
