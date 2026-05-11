/**
 * Neon Pong — Rendering
 * Canvas drawing: grid, paddles, balls, trails, power-ups, particles, callouts, CRT effects.
 */
(function () {
  'use strict';

  var NP = window.NP;
  if (!NP) return;

  var canvas = document.getElementById('game-canvas');
  var ctx = canvas.getContext('2d');

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    NP.state.width = w;
    NP.state.height = h;
    NP.scale = Math.min(w, h) / 800;
  }

  function drawGrid() {
    var s = NP.scale;
    var spacing = Math.round(60 * s);
    NP.state.gridOffset = (NP.state.gridOffset + Math.round(12 * s)) % spacing;
    ctx.strokeStyle = NP.config.COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = NP.state.gridOffset - spacing; x < NP.state.width; x += spacing) {
      ctx.moveTo(x, 0); ctx.lineTo(x, NP.state.height);
    }
    for (var y = NP.state.gridOffset - spacing; y < NP.state.height; y += spacing) {
      ctx.moveTo(0, y); ctx.lineTo(NP.state.width, y);
    }
    ctx.stroke();
  }

  function drawCenterLine() {
    var s = NP.scale;
    var dash = Math.round(16 * s), gap = Math.round(12 * s);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (var y = 0; y < NP.state.height; y += dash + gap) {
      ctx.moveTo(NP.state.width / 2, y);
      ctx.lineTo(NP.state.width / 2, y + dash);
    }
    ctx.stroke();
  }

  function drawWindZones() {
    NP.config.WIND_ZONES.forEach(function (zone) {
      var zoneY = NP.state.height * zone.yRatio;
      var zoneH = NP.state.height * zone.hRatio;
      var s = NP.scale;

      // Draw zone background
      ctx.fillStyle = zone.color;
      ctx.fillRect(0, zoneY, NP.state.width, zoneH);

      // Draw directional arrows
      var arrowY = zoneY + zoneH / 2;
      ctx.fillStyle = zone.force > 0 ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 0, 255, 0.15)';
      ctx.font = '800 ' + Math.round(16 * s) + 'px Courier New, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var arrow = zone.force > 0 ? '>>>' : '<<<';
      for (var x = 60 * s; x < NP.state.width; x += 120 * s) {
        ctx.fillText(arrow, x, arrowY);
      }
    });
  }

  function drawPaddle(p) {
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = p.glow;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 4);
    ctx.fill();
    if (p.frozen) {
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#4fc3f7';
      ctx.shadowBlur = 16;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawOneBall(b) {
    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = NP.config.COLORS.ball;
    ctx.fillStyle = NP.config.COLORS.ball;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPowerUp(pu) {
    ctx.save();
    ctx.translate(pu.x, pu.y);
    ctx.rotate(pu.spin);
    ctx.shadowBlur = 20;
    ctx.shadowColor = pu.color;
    ctx.strokeStyle = pu.color;
    ctx.fillStyle = 'rgba(10, 10, 20, 0.72)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-pu.size / 2, -pu.size / 2, pu.size, pu.size, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pu.color;
    ctx.font = '700 10px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pu.label, 0, 1);
    ctx.restore();
  }

  function drawPowerUpWarning(warning) {
    var s = NP.scale;
    var pulse = 0.65 + Math.sin(warning.life * 14) * 0.25;
    ctx.save();
    ctx.globalAlpha = NP.clamp(pulse, 0.25, 0.9);
    ctx.shadowBlur = 18;
    ctx.shadowColor = warning.color;
    ctx.strokeStyle = warning.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(warning.x, warning.y, NP.config.POWER_UP_SIZE * 0.56 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(warning.x - 12 * s, warning.y);
    ctx.lineTo(warning.x + 12 * s, warning.y);
    ctx.moveTo(warning.x, warning.y - 12 * s);
    ctx.lineTo(warning.x, warning.y + 12 * s);
    ctx.stroke();
    ctx.restore();
  }

  function drawCallout(callout) {
    var s = NP.scale;
    var alpha = NP.clamp(callout.life / NP.config.CALLOUT_LIFE, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 16;
    ctx.shadowColor = callout.color;
    ctx.fillStyle = callout.color;
    ctx.font = '800 ' + Math.round(18 * s) + 'px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(callout.text, callout.x, callout.y);
    ctx.restore();
  }

  function applyShake() {
    if (NP.state.shake > 0) {
      var dx = (Math.random() - 0.5) * NP.state.shake * 2;
      var dy = (Math.random() - 0.5) * NP.state.shake * 2;
      ctx.translate(dx, dy);
      NP.state.shake *= NP.state.shakeDecay;
      if (NP.state.shake < 0.5) NP.state.shake = 0;
    }
  }

  function spawnParticles(x, y, count, colors) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 240;
      const life = 0.4 + Math.random() * 0.5;
      NP.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: life,
        maxLife: life,
        size: 1.5 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = NP.particles.length - 1; i >= 0; i--) {
      const p = NP.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      if (p.life <= 0) NP.particles.splice(i, 1);
    }
  }

  function drawParticles() {
    NP.particles.forEach(function (p) {
      var alpha = NP.clamp(p.life / p.maxLife, 0, 1);
      var sparkle = 0.85 + Math.sin(p.pulsePhase + p.life * 18) * 0.15;
      ctx.globalAlpha = alpha * sparkle;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  /* == Bumpers == */
  function drawBumpers() {
    NP.bumpers.forEach(function (bu) {
      var pulse = 0.8 + Math.sin(bu.glowPhase + Date.now() * 0.003) * 0.2;
      ctx.save();
      ctx.shadowBlur = 20 * pulse;
      ctx.shadowColor = bu.color;
      ctx.strokeStyle = bu.color;
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(10, 10, 20, 0.5)';
      ctx.beginPath();
      ctx.arc(bu.x, bu.y, bu.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Inner glow ring
      ctx.shadowBlur = 8;
      ctx.strokeStyle = bu.color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bu.x, bu.y, bu.r * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    });
  }

  /* == Trails == */
  function updateTrails() {
    NP.trails.push({ x: NP.ball.x, y: NP.ball.y, life: 0.35 });
    for (let i = NP.trails.length - 1; i >= 0; i--) {
      NP.trails[i].life -= 0.016;
      if (NP.trails[i].life <= 0) NP.trails.splice(i, 1);
    }
    if (NP.trails.length > 40) NP.trails.splice(0, NP.trails.length - 40);
  }

  function drawTrails() {
    NP.trails.forEach(function (t) {
      var alpha = NP.clamp(t.life / 0.35, 0, 1) * 0.5;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = NP.config.COLORS.ballTrail;
      ctx.beginPath();
      ctx.arc(t.x, t.y, NP.config.BALL_RADIUS * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  NP.updateTrails = updateTrails;
  NP.updateParticles = updateParticles;
  NP.spawnParticles = spawnParticles;

  function render() {
    ctx.clearRect(0, 0, NP.state.width, NP.state.height);
    ctx.save();
    applyShake();
    drawGrid();
    drawCenterLine();
    drawWindZones();
    if (NP.paddles.p1 && NP.paddles.p2 && NP.ball) {
      drawTrails();
      drawPaddle(NP.paddles.p1);
      drawPaddle(NP.paddles.p2);
      NP.balls.forEach(drawOneBall);
      NP.powerUpWarnings.forEach(drawPowerUpWarning);
      Object.keys(NP.activeEffects).forEach(function (ownerKey) {
        var effects = NP.activeEffects[ownerKey];
        Object.keys(effects).forEach(function (effect) {
          // Draw a persistent indicator for major modifiers (e.g., speed boost icon, color overlay)
          ctx.save();
          ctx.globalAlpha = 0.2; // Subtle background glow
          ctx.fillStyle = effects[effect].color || '#ffffff'; // Default to white if no color
          ctx.shadowBlur = 30;
          ctx.shadowColor = effects[effect].color || '#ffffff';
          // Draw a large, semi-transparent circle indicating the presence of an active field modifier
          ctx.beginPath();
          ctx.arc(NP.state.width * 0.5, NP.state.height * 0.5, 150, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      });
    }
    drawParticles();
    drawBumpers();
    // Score flash overlay
    if (NP.state.flash > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = NP.state.flash * 0.35;
      ctx.fillRect(0, 0, NP.state.width, NP.state.height);
      NP.state.flash -= 0.016;
      if (NP.state.flash < 0) NP.state.flash = 0;
    }
    ctx.restore();
  }

  NP.resize = resize;
  NP.render = render;
  NP.drawGrid = drawGrid;
  NP.drawCenterLine = drawCenterLine;
  NP.drawWindZones = drawWindZones;
  NP.drawPaddle = drawPaddle;
  NP.drawOneBall = drawOneBall;
  NP.drawPowerUp = drawPowerUp;
  NP.drawPowerUpWarning = drawPowerUpWarning;
  NP.drawCallout = drawCallout;
  NP.applyShake = applyShake;
  NP.drawTrails = drawTrails;
  NP.drawParticles = drawParticles;
  NP.drawBumpers = drawBumpers;

})();