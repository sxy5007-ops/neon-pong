/**
 * Neon Pong — Power-up Management
 * Spawning, updating, effects, and callouts for power-ups.
 */
(function () {
  'use strict';

  var NP = window.NP;
  if (!NP) return;


  /* == Private helpers == */

  function applyTimedEffect(owner, effect, duration) {
    NP.activeEffects[owner][effect] = Math.max(NP.activeEffects[owner][effect] || 0, duration);
  }

  /* == Power-up management == */

  function applyPowerUp(owner, type) {
    var target = NP.opponentOf(owner);
    var power = NP.config.POWER_UP_TYPES.find(function (item) { return item.id === type; }) || NP.config.POWER_UP_TYPES[0];
    NP.stats.powerupsCollected++;
    if (type === 'mega') applyTimedEffect(owner, 'mega', 8);
    if (type === 'tiny') applyTimedEffect(target, 'tiny', 6);
    if (type === 'turbo') NP.activeEffects.global.turbo = Math.max(NP.activeEffects.global.turbo || 0, 7);
    if (type === 'glitch') applyTimedEffect(owner, 'glitch', 10);
    if (type === 'reverse') applyTimedEffect(target, 'reverse', 4);
    if (type === "freeze") applyTimedEffect(target, "freeze", 4);
    if (type === 'sound') {
      // Sonic pulse: push all balls toward opponent's side with shake + particles
      var pushForce = 400;
      NP.balls.forEach(function (b) {
        b.vx += pushForce;
        b.vy += (Math.random() - 0.5) * 200;
      });
      NP.activeEffects.global.sound = 1.5;
      NP.state.shake = 18;
      NP.state.shakeDecay = 0.78;
      NP.spawnParticles(NP.ball.x, NP.ball.y, 40, ['#ff6b35', '#ffaa00', '#ff4400', '#ffffff']);
    }
    if (type === 'multiball') {
      NP.balls.push(NP.makeExtraBall(NP.ball, -0.55), NP.makeExtraBall(NP.ball, 0.55));
      NP.activeEffects.global.multiball = Math.max(NP.activeEffects.global.multiball || 0, 7);
    }
    if (type === 'phase') applyTimedEffect(owner, 'phase', 4);
    if (type === 'decoy') applyTimedEffect(owner, 'decoy', 5);
    if (type === 'ricochet') applyTimedEffect(owner, 'ricochet', 8);
    if (type === 'gravity') {
      // Pull ball toward opponent's side — gravity acceleration in updateEffects
      applyTimedEffect(owner, 'gravity', 5);
    }
    if (type === 'magnet') {
      // Paddle attracts the ball within range
      applyTimedEffect(owner, 'magnet', 6);
    }
    if (type === 'blink') {
      // Instant teleport: paddle jumps to ball's Y position
      var blinkPaddle = owner === 'p1' ? NP.paddles.p1 : NP.paddles.p2;
      if (blinkPaddle) {
        blinkPaddle.y = NP.ball.y - blinkPaddle.h / 2;
        blinkPaddle.y = NP.clamp(blinkPaddle.y, 0, NP.state.height - blinkPaddle.h);
        NP.spawnParticles(blinkPaddle.x + blinkPaddle.w / 2, blinkPaddle.y + blinkPaddle.h / 2, 20, ['#eab308', '#ffffff', '#fef08a']);
        NP.state.shake = 4;
        NP.state.shakeDecay = 0.8;
      }
      applyTimedEffect(owner, 'blink', 0.3); // brief visual pulse
    }
    if (type === 'void') {
      // Black hole on opponent's side that pulls balls toward it
      var vx = target === 'p1' ? NP.state.width * 0.25 : NP.state.width * 0.75;
      var vy = NP.state.height * 0.2 + Math.random() * NP.state.height * 0.6;
      NP.voidHole = { x: vx, y: vy, timer: 4, radius: 80, pullStrength: 180 };
      applyTimedEffect(owner, 'void', 4);
    }
    if (type === 'tiny' || type === 'reverse') {
      applyTimedEffect(target, 'slow', type === 'tiny' ? 3 : 2);
    }
    NP.callouts.push({
      text: owner.toUpperCase() + ' ' + power.label,
      x: owner === 'p1' ? NP.state.width * 0.32 : NP.state.width * 0.68,
      y: NP.state.height * 0.22,
      color: power.color, life: NP.config.CALLOUT_LIFE,
    });
    NP.spawnParticles(NP.ball.x, NP.ball.y, 26, NP.config.COLORS.particle);
    NP.state.shake = 8;
    NP.state.shakeDecay = 0.82;
    updateEffectUI();
  }

  function makePowerUp() {
    var type = NP.config.POWER_UP_TYPES[Math.floor(Math.random() * NP.config.POWER_UP_TYPES.length)];
    var marginX = NP.state.width * 0.28;
    var driftAngle = Math.random() * Math.PI * 2;
    return {
      type: type.id, label: type.label, color: type.color,
      x: marginX + Math.random() * (NP.state.width - marginX * 2),
      y: 90 + Math.random() * Math.max(80, NP.state.height - 180),
      vx: Math.cos(driftAngle) * 22, vy: Math.sin(driftAngle) * 18,
      size: NP.config.POWER_UP_SIZE, spin: Math.random() * Math.PI,
      life: NP.config.POWER_UP_LIFE,
    };
  }

  function updatePowerUps(dt) {
    NP.powerUpTimer -= dt;
    var spawnedWarning = false;
    if (NP.powerUpTimer <= 0 && NP.powerUps.length < 1 && NP.powerUpWarnings.length < 1) {
      NP.powerUpWarnings.push({
        ...makePowerUp(), life: NP.config.POWER_UP_WARNING_LIFE,
      });
      NP.powerUpTimer = NP.config.POWER_UP_SPAWN_MIN + Math.random() * (NP.config.POWER_UP_SPAWN_MAX - NP.config.POWER_UP_SPAWN_MIN);
      spawnedWarning = true;
    }
    if (!spawnedWarning) {
      NP.powerUpWarnings.forEach(function (warning) {
        warning.life -= dt;
        warning.spin += dt * 2.5;
      });
      NP.powerUpWarnings = NP.powerUpWarnings.filter(function (warning) {
        if (warning.life > 0) return true;
        NP.powerUps.push({ ...warning, life: NP.config.POWER_UP_LIFE, spin: Math.random() * Math.PI });
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
        return (dx * dx + dy * dy) <= Math.pow(b.r + pu.size * 0.72, 2) && b.life > 0;
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
    tickEffectBucket(NP.activeEffects.p1, dt);
    tickEffectBucket(NP.activeEffects.p2, dt);
    tickEffectBucket(NP.activeEffects.global, dt);

    // Gravity: accelerate all balls toward opponent's side when gravity effect active
    if (NP.activeEffects.p1.gravity > 0 || NP.activeEffects.p2.gravity > 0) {
      var gravDir = NP.activeEffects.p1.gravity > 0 ? 1 : -1;
      NP.balls.forEach(function (b) {
        b.vx += gravDir * NP.config.INITIAL_SPEED * 0.35 * dt;
      });
    }

    // Magnet: attract ball toward paddle within range
    ['p1', 'p2'].forEach(function (owner) {
      if (NP.activeEffects[owner].magnet > 0) {
        var p = NP.paddles[owner];
        if (!p) return;
        NP.balls.forEach(function (b) {
          if (b.life <= 0 && b.life !== Infinity) return;
          var dx = (p.x + p.w / 2) - b.x;
          var dy = (p.y + p.h / 2) - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var attractRange = 200;
          if (dist < attractRange && dist > 0) {
            var pull = (1 - dist / attractRange) * 120 * dt;
            b.vx += (dx / dist) * pull;
            b.vy += (dy / dist) * pull;
          }
        });
      }
    });

    // Void hole update
    if (NP.voidHole) {
      NP.voidHole.timer -= dt;
      NP.balls.forEach(function (b) {
        if (b.life <= 0 && b.life !== Infinity) return;
        var dx = NP.voidHole.x - b.x;
        var dy = NP.voidHole.y - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < NP.voidHole.radius && dist > 0) {
          var pull = NP.voidHole.pullStrength * dt / (dist * 0.1 + 1);
          b.vx += (dx / dist) * pull;
          b.vy += (dy / dist) * pull;
        }
      });
      if (NP.voidHole.timer <= 0) {
        NP.voidHole = null;
      }
    }

    updateEffectUI();
  }

  function addEffectPill(items, owner, effect, time) {
    var li = document.createElement('span');
    li.className = 'effect-pill';
    li.textContent = owner + ' ' + NP.config.EFFECT_LABELS[effect] + ' ' + Math.ceil(time) + 's';
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

  /* == Expose via NP.Powerup == */

  NP.Powerup = {
    applyPowerUp: applyPowerUp,
    makePowerUp: makePowerUp,
    updatePowerUps: updatePowerUps,
    updateCallouts: updateCallouts,
    updateEffects: updateEffects,
    updateEffectUI: updateEffectUI,
  };

  /* == Backward compat: also attach to NP directly == */

  NP.applyPowerUp = applyPowerUp;
  NP.updatePowerUps = updatePowerUps;
  NP.updateCallouts = updateCallouts;
  NP.updateEffects = updateEffects;
  NP.updateEffectUI = updateEffectUI;

})();
