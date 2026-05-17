/**
 * Neon Pong — Power-up System
 * Types, spawning, effects, and collection callouts.
 */
(function () {
  'use strict';

  var NP = window.NP;
  if (!NP) return;

  function applyTimedEffect(owner, effect, duration) {
    NP.activeEffects[owner][effect] = Math.max(NP.activeEffects[owner][effect] || 0, duration);
  }

  function applyPowerUp(owner, type) {
    var target = opponentOf(owner);
    var power = NP.POWER_UP_TYPES.find(function (item) { return item.id === type; }) || NP.POWER_UP_TYPES[0];
    if (type === 'mega') applyTimedEffect(owner, 'mega', 8);
    if (type === 'tiny') applyTimedEffect(target, 'tiny', 6);
    if (type === 'turbo') NP.activeEffects.global.turbo = Math.max(NP.activeEffects.global.turbo || 0, 7);
    if (type === 'glitch') applyTimedEffect(owner, 'glitch', 10);
    if (type === 'reverse') applyTimedEffect(target, 'reverse', 4);
    if (type === 'shield') applyTimedEffect(owner, 'shield', 30);
    if (type === 'multiball') {
      NP.balls.push(makeExtraBall(NP.ball, -0.55), makeExtraBall(NP.ball, 0.55));
      NP.activeEffects.global.multiball = Math.max(NP.activeEffects.global.multiball || 0, 7);
    }
    if (type === 'tiny' || type === 'reverse') {
      applyTimedEffect(target, 'slow', type === 'tiny' ? 3 : 2);
    }
    NP.callouts.push({
      text: owner.toUpperCase() + ' ' + power.label,
      x: owner === 'p1' ? NP.state.width * 0.32 : NP.state.width * 0.68,
      y: NP.state.height * 0.22,
      color: power.color, life: NP.CALLOUT_LIFE,
    });
    spawnParticles(NP.ball.x, NP.ball.y, 26, NP.COLORS.particle);
    NP.state.shake = 8;
    NP.state.shakeDecay = 0.82;
    updateEffectUI();
  }

  function makePowerUp() {
    var type = NP.POWER_UP_TYPES[Math.floor(Math.random() * NP.POWER_UP_TYPES.length)];
    var marginX = NP.state.width * 0.28;
    var driftAngle = Math.random() * Math.PI * 2;
    return {
      type: type.id, label: type.label, color: type.color,
      x: marginX + Math.random() * (NP.state.width - marginX * 2),
      y: 90 + Math.random() * Math.max(80, NP.state.height - 180),
      vx: Math.cos(driftAngle) * 22, vy: Math.sin(driftAngle) * 18,
      size: NP.POWER_UP_SIZE, spin: Math.random() * Math.PI,
      life: NP.POWER_UP_LIFE,
    };
  }

  function updatePowerUps(dt) {
    NP.powerUpTimer -= dt;
    var spawnedWarning = false;
    if (NP.powerUpTimer <= 0 && NP.powerUps.length < 1 && NP.powerUpWarnings.length < 1) {
      NP.powerUpWarnings.push({
        ...makePowerUp(), life: NP.POWER_UP_WARNING_LIFE,
      });
      NP.powerUpTimer = NP.POWER_UP_SPAWN_MIN + Math.random() * (NP.POWER_UP_SPAWN_MAX - NP.POWER_UP_SPAWN_MIN);
      spawnedWarning = true;
    }
    if (!spawnedWarning) {
      NP.powerUpWarnings.forEach(function (warning) {
        warning.life -= dt;
        warning.spin += dt * 2.5;
      });
      NP.powerUpWarnings = NP.powerUpWarnings.filter(function (warning) {
        if (warning.life > 0) return true;
        NP.powerUps.push({ ...warning, life: NP.POWER_UP_LIFE, spin: Math.random() * Math.PI });
        return false;
      });
    }
    NP.powerUps.forEach(function (pu) {
      pu.life -= dt;
      pu.spin += dt * 1.8;
      pu.x += (pu.vx || 0) * dt;
      pu.y += (pu.vy || 0) * dt;
      if (pu.x < NP.state.width * 0.2 || pu.x > NP.state.width * 0.8) pu.vx *= -1;
      if (pu.y < 78 || pu.y > NP.state.height - 78) pu.vy *= -1;
      pu.x = NP.clamp(pu.x, NP.state.width * 0.18, NP.state.width * 0.82);
      pu.y = NP.clamp(pu.y, 72, NP.state.height - 72);
    });
    NP.powerUps = NP.powerUps.filter(function (pu) {
      if (pu.life <= 0) return false;
      var collector = NP.balls.find(function (b) {
        var dx = b.x - pu.x;
        var dy = b.y - pu.y;
        return (dx * dx + dy * dy) <= Math.pow(b.r + pu.size * 0.72, 2);
      });
      if (collector) { applyPowerUp(NP.lastHitBy, pu.type); return false; }
      return true;
    });
  }

  function updateCallouts(dt) {
    NP.callouts.forEach(function (callout) {
      callout.life -= dt;
      callout.y -= 18 * dt;
    });
    NP.callouts = NP.callouts.filter(function (callout) { return callout.life > 0; });
  }

  function tickEffectBucket(bucket, dt) {
    Object.keys(bucket).forEach(function (key) {
      bucket[key] -= dt || 0;
      if (bucket[key] <= 0) delete bucket[key];
    });
  }

  function updateEffects(dt) {
    tickEffectBucket(NP.activeEffects.p1);
    tickEffectBucket(NP.activeEffects.p2);
    tickEffectBucket(NP.activeEffects.global);
    updateEffectUI();
  }

  function addEffectPill(items, owner, effect, time) {
    var li = document.createElement('span');
    li.className = 'effect-pill';
    li.textContent = owner + ' ' + NP.EFFECT_LABELS[effect] + ' ' + Math.ceil(time) + 's';
    items.appendChild(li);
  }

  function updateEffectUI() {
    if (!NP.ui.effectStrip) return;
    NP.ui.effectStrip.innerHTML = '';
    [['P1', NP.activeEffects.p1], ['P2', NP.activeEffects.p2], ['ALL', NP.activeEffects.global]].forEach(function (pair) {
      var owner = pair[0];
      var bucket = pair[1];
      Object.keys(bucket).forEach(function (effect) { addEffectPill(NP.ui.effectStrip, owner, effect, bucket[effect]); });
    });
  }

  function opponentOf(owner) { return owner === 'p1' ? 'p2' : 'p1'; }
  function makePaddle(side) {
    var h = Math.max(60, NP.state.height * NP.PADDLE_HEIGHT_RATIO);
    return {
      side: side, x: side === 'left' ? NP.PADDLE_WIDTH * 2 : NP.state.width - NP.PADDLE_WIDTH * 3,
      y: NP.state.height / 2 - h / 2, w: NP.PADDLE_WIDTH, h: h, vy: 0,
      speed: 720, color: side === 'left' ? NP.COLORS.paddleP1 : NP.COLORS.paddleP2,
      glow: side === 'left' ? '#00ffff' : '#ff00ff',
    };
  }

  function makeBall() {
    var dir = Math.random() > 0.5 ? 1 : -1;
    var angle = (Math.random() - 0.5) * (Math.PI / 3);
    return {
      x: NP.state.width / 2, y: NP.state.height / 2, r: NP.BALL_RADIUS,
      vx: Math.cos(angle) * NP.INITIAL_SPEED * dir, vy: Math.sin(angle) * NP.INITIAL_SPEED,
      speed: NP.INITIAL_SPEED, baseSpeed: NP.INITIAL_SPEED, hits: 0, isMain: true, life: Infinity,
    };
  }

  function makeExtraBall(source, angleOffset) {
    var speed = Math.max(NP.INITIAL_SPEED * 0.82, source.speed * 0.78);
    var angle = Math.atan2(source.vy, source.vx) + angleOffset;
    return {
      x: source.x, y: source.y, r: Math.max(4, source.r * 0.62),
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      speed: speed, baseSpeed: speed, hits: 0, isMain: false, life: 6,
    };
  }

  function spawnParticles(x, y, count, colors) {
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var spd = 80 + Math.random() * 240;
      NP.particles.push({
        x: x, y: y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 0.4 + Math.random() * 0.5, maxLife: 0.4 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function updateParticles(dt) {
    for (var i = NP.particles.length - 1; i >= 0; i--) {
      var p = NP.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) NP.particles.splice(i, 1);
    }
  }

  function updateTrails() {
    NP.trails.push({ x: NP.ball.x, y: NP.ball.y, life: 0.35 });
    for (var i = NP.trails.length - 1; i >= 0; i--) {
      NP.trails[i].life -= 0.016;
      if (NP.trails[i].life <= 0) NP.trails.splice(i, 1);
    }
    if (NP.trails.length > 40) NP.trails.splice(0, NP.trails.length - 40);
  }

  NP.applyPowerUp = applyPowerUp;
  NP.updatePowerUps = updatePowerUps;
  NP.updateCallouts = updateCallouts;
  NP.updateEffects = updateEffects;
  NP.opponentOf = opponentOf;
  NP.makePaddle = makePaddle;
  NP.makeBall = makeBall;
  NP.makeExtraBall = makeExtraBall;
  NP.spawnParticles = spawnParticles;
  NP.updateParticles = updateParticles;
  NP.updateTrails = updateTrails;

})();
