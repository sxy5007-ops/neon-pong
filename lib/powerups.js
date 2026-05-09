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
    var target = NP.opponentOf(owner);
    var power = NP.POWER_UP_TYPES.find(function (item) { return item.id === type; }) || NP.POWER_UP_TYPES[0];
    if (type === 'mega') applyTimedEffect(owner, 'mega', 8);
    if (type === 'tiny') applyTimedEffect(target, 'tiny', 6);
    if (type === 'turbo') NP.activeEffects.global.turbo = Math.max(NP.activeEffects.global.turbo || 0, 7);
    if (type === 'glitch') applyTimedEffect(owner, 'glitch', 10);
    if (type === 'reverse') applyTimedEffect(target, 'reverse', 4);
    if (type === 'shield') applyTimedEffect(owner, 'shield', 30);
    if (type === 'multiball') {
      NP.balls.push(NP.makeExtraBall(NP.ball, -0.55), NP.makeExtraBall(NP.ball, 0.55));
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
    NP.spawnParticles(NP.ball.x, NP.ball.y, 26, NP.COLORS.particle);
    NP.state.shake = 8;
    NP.state.shakeDecay = 0.82;
    NP.updateEffectUI();
  }

  function makePowerUp() {
    var s = NP.scale;
    var type = NP.POWER_UP_TYPES[Math.floor(Math.random() * NP.POWER_UP_TYPES.length)];
    var marginX = NP.state.width * 0.28;
    var driftAngle = Math.random() * Math.PI * 2;
    return {
      type: type.id, label: type.label, color: type.color,
      x: marginX + Math.random() * (NP.state.width - marginX * 2),
      y: 90 * s + Math.random() * Math.max(80 * s, NP.state.height - 180 * s),
      vx: Math.cos(driftAngle) * 22 * s, vy: Math.sin(driftAngle) * 18 * s,
      size: Math.round(NP.POWER_UP_SIZE * s), spin: Math.random() * Math.PI,
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
      if (collector) { NP.applyPowerUp(NP.lastHitBy, pu.type); return false; }
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
      bucket[key] -= dt;
      if (bucket[key] <= 0) delete bucket[key];
    });
  }

  function updateEffects(dt) {
    tickEffectBucket(NP.activeEffects.p1, dt);
    tickEffectBucket(NP.activeEffects.p2, dt);
    tickEffectBucket(NP.activeEffects.global, dt);
    NP.updateEffectUI();
  }

  NP.applyTimedEffect = applyTimedEffect;
  NP.applyPowerUp = applyPowerUp;
  NP.makePowerUp = makePowerUp;
  NP.updatePowerUps = updatePowerUps;
  NP.updateCallouts = updateCallouts;
  NP.updateEffects = updateEffects;

})();
