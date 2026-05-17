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

  function drawPaddle(p) {
    ctx.save();
    var col = p._discoColor || p.color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = p._discoColor || p.glow;
    ctx.fillStyle = col;
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
    // Phase shift visual: neon green ring around ball
    if (NP.activeEffects[NP.lastHitBy] && NP.activeEffects[NP.lastHitBy].phase > 0) {
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 6, 0, Math.PI * 2);
      ctx.stroke();
      // Inner glow
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.3)';
      ctx.lineWidth = 6;
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Ricochet visual: teal energy trail
    if (NP.activeEffects[NP.lastHitBy] && NP.activeEffects[NP.lastHitBy].ricochet > 0) {
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#00ffcc';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
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

    // Icon rendering for specific power-up types
    var size = pu.size;
    var gameTime = NP.state.time || 0;
    if (pu.id === 'gravity') {
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      // Downward arrow
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(-8, 4);
      ctx.lineTo(8, 4);
      ctx.closePath();
      ctx.fill();
    } else if (pu.id === 'magnet') {
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.6);
      ctx.fillRect(-size * 0.35, -size * 0.25, size * 0.7, size * 0.1);
      ctx.fillRect(-size * 0.35, size * 0.15, size * 0.7, size * 0.1);
      // N/S text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('N', 0, -size * 0.12);
    } else if (pu.id === 'blink') {
      ctx.fillStyle = '#eab308';
      // Star-like spark shape
      for (var s = 0; s < 4; s++) {
        var sa = s * Math.PI / 2 + gameTime * 3;
        var sx = Math.cos(sa) * size * 0.4;
        var sy = Math.sin(sa) * size * 0.4;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (pu.id === 'void') {
      var vGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.4);
      vGrad.addColorStop(0, '#6b21a8');
      vGrad.addColorStop(0.5, '#4c1d95');
      vGrad.addColorStop(1, '#3b0764');
      ctx.fillStyle = vGrad;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.4, gameTime * 2, gameTime * 2 + Math.PI);
      ctx.stroke();
    }

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
    if (!NP.settings.particlesEnabled) return;
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

  /* == Tornado Hazard == */
  function drawTornado() {
    if (!NP.tornado.active) return;
    var s = NP.scale;
    var r = NP.config.TORNADO_RADIUS * s;
    var x = NP.tornado.x;
    var y = NP.tornado.y;
    ctx.save();
    
    // Multiple spinning rings for tornado visual
    for (var i = 0; i < 5; i++) {
      var ringR = r * (0.3 + i * 0.18);
      var alpha = 1 - i * 0.15;
      var phase = NP.tornado.spin + i * 1.2;
      ctx.strokeStyle = 'rgba(0, 255, 255, ' + (alpha * 0.6) + ')';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 25 - i * 3;
      ctx.shadowColor = '#00ffff';
      ctx.beginPath();
      ctx.arc(x + Math.sin(phase) * 8, y + Math.cos(phase * 0.7) * 6, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Inner glow
    ctx.fillStyle = 'rgba(0, 255, 255, 0.08)';
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Outer warning ring pulse
    var pulse = 0.6 + Math.sin(Date.now() * 0.005) * 0.4;
    ctx.strokeStyle = 'rgba(0, 255, 255, ' + (pulse * 0.3) + ')';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    ctx.arc(x, y, r * 1.3, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }

  /* == Disco Visuals == */
  function drawDisco() {
    if (!NP.disco.active) return;
    var disco = NP.disco;
    var hue = disco.hue;

    // Color-cycling grid overlay
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
    ctx.fillRect(0, 0, NP.state.width, NP.state.height);
    ctx.restore();

    // Pulsing border glow (strobes every beat)
    var beatPulse = Math.abs(Math.sin(disco.beatPhase * Math.PI));
    ctx.save();
    ctx.shadowBlur = 30 + beatPulse * 30;
    ctx.shadowColor = 'hsl(' + hue + ', 100%, 60%)';
    ctx.strokeStyle = 'hsl(' + hue + ', 100%, 50%)';
    ctx.lineWidth = 3 + beatPulse * 4;
    ctx.strokeRect(4, 4, NP.state.width - 8, NP.state.height - 8);
    ctx.restore();

    // Color-cycle paddle glow colors
    if (NP.paddles.p1) {
      NP.paddles.p1._discoColor = 'hsl(' + ((hue + 60) % 360) + ', 100%, 60%)';
    }
    if (NP.paddles.p2) {
      NP.paddles.p2._discoColor = 'hsl(' + ((hue + 240) % 360) + ', 100%, 60%)';
    }
  }

  /* == Kaiju Arm & Shockwave == */
  function drawKaiju(ctx) {
    var k = NP.kaiju;
    if (!k.active && k.warningTimer <= 0) return;

    // Warning indicator (flashing red crosshair)
    if (k.warningTimer > 0) {
      var warnAlpha = 0.3 + Math.sin(k.warningTimer * 12) * 0.3;
      ctx.save();
      ctx.globalAlpha = warnAlpha;
      // Crosshair at target
      if (k.armTargetX && k.armTargetY) {
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(k.armTargetX, k.armTargetY, 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(k.armTargetX - 80, k.armTargetY);
        ctx.lineTo(k.armTargetX + 80, k.armTargetY);
        ctx.moveTo(k.armTargetX, k.armTargetY - 80);
        ctx.lineTo(k.armTargetX, k.armTargetY + 80);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
      return;
    }

    // Kaiju arm
    ctx.save();
    var aw = NP.config.KAIJU_ARM_WIDTH;
    var ah = NP.config.KAIJU_ARM_HEIGHT;

    // Arm glow
    var grad = ctx.createRadialGradient(k.armX, k.armY, 0, k.armX, k.armY, aw * 0.8);
    grad.addColorStop(0, 'rgba(255, 68, 0, 0.4)');
    grad.addColorStop(1, 'rgba(255, 68, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(k.armX, k.armY, aw * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Arm body (organic sine wave shape)
    ctx.fillStyle = '#8b2500';
    ctx.strokeStyle = '#ff4400';
    ctx.lineWidth = 3;

    var armTop = k.armY;
    var armBottom = k.armY + ah;
    ctx.beginPath();
    ctx.moveTo(k.armX - aw * 0.4, armBottom);
    // Left side with sine bumps
    for (var ly = armBottom; ly > armTop; ly -= 20) {
      var lx = k.armX - aw * 0.4 + Math.sin((armBottom - ly) * 0.08 + k.timer * 3) * 10;
      ctx.lineTo(lx, ly);
    }
    ctx.lineTo(k.armX - aw * 0.3, armTop);
    // Top curve
    ctx.lineTo(k.armX + aw * 0.3, armTop);
    // Right side
    for (var ry = armTop; ry < armBottom; ry += 20) {
      var rx = k.armX + aw * 0.4 + Math.sin((ry - armTop) * 0.08 + k.timer * 3 + Math.PI) * 10;
      ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Arm texture lines
    ctx.strokeStyle = 'rgba(255, 68, 0, 0.3)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 5; i++) {
      var iy = armTop + (ah * 0.15) + i * (ah * 0.15);
      ctx.beginPath();
      ctx.moveTo(k.armX - aw * 0.3 + Math.sin(i * 2 + k.timer * 2) * 8, iy);
      ctx.quadraticCurveTo(k.armX, iy + 10, k.armX + aw * 0.3 + Math.sin(i * 3 + k.timer * 2.5) * 8, iy);
      ctx.stroke();
    }

    // Finger claws at bottom
    ctx.fillStyle = '#cc3300';
    ctx.strokeStyle = '#ff4400';
    ctx.lineWidth = 2;
    for (var c = 0; c < 4; c++) {
      var clawX = k.armX - aw * 0.3 + c * (aw * 0.2);
      var clawY = armBottom + 10;
      ctx.beginPath();
      ctx.arc(clawX, clawY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Shockwave
    if (k.shockwaveActive && k.shockwaveRadius > 0) {
      var swAlpha = Math.max(0, 0.5 - k.shockwaveTimer * 0.5);
      for (var ring = 0; ring < 3; ring++) {
        var radius = k.shockwaveRadius - ring * 20;
        if (radius <= 0) break;
        ctx.strokeStyle = 'rgba(255, 68, 0, ' + swAlpha * (1 - ring * 0.2) + ')';
        ctx.lineWidth = 4 - ring;
        ctx.beginPath();
        ctx.arc(k.armX, k.armY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Ground crack lines
      if (k.armY < 20) {
        ctx.strokeStyle = 'rgba(255, 68, 0, ' + swAlpha * 0.5 + ')';
        ctx.lineWidth = 2;
        for (var crack = 0; crack < 8; crack++) {
          var angle = crack * Math.PI / 4 + Math.random() * 0.3;
          var len = k.shockwaveRadius * (0.3 + Math.random() * 0.7);
          ctx.beginPath();
          ctx.moveTo(k.armX, k.armY + 20);
          var cx = k.armX + Math.cos(angle) * len;
          var cy = k.armY + 20 + Math.sin(angle) * len;
          ctx.lineTo(cx + (Math.random() - 0.5) * 20, cy + (Math.random() - 0.5) * 20);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  /* == Neon Storm Bolts == */
  function drawStorm(ctx) {
    var s = NP.storm;
    if (!s.active && s.warningTimer <= 0) return;

    ctx.save();

    // Warning bolts (flickering cyan circles)
    s.warningBolts.forEach(function (wb) {
      var alpha = 0.3 + Math.sin(wb.life * 20) * 0.3;
      ctx.fillStyle = 'rgba(0, 191, 255, ' + alpha + ')';
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + alpha * 0.5 + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wb.x, wb.y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Active bolts (jagged lightning)
    s.bolts.forEach(function (bolt) {
      var alpha = Math.min(1, bolt.life * 4);
      var boltHeight = 80 + Math.random() * 60;
      var boltWidth = 20 + Math.random() * 30;

      // Inner glow
      var grad = ctx.createRadialGradient(bolt.x, bolt.y, 0, bolt.x, bolt.y, boltWidth);
      grad.addColorStop(0, 'rgba(255, 255, 255, ' + alpha * 0.8 + ')');
      grad.addColorStop(0.3, 'rgba(0, 191, 255, ' + alpha * 0.4 + ')');
      grad.addColorStop(1, 'rgba(0, 191, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, boltWidth, 0, Math.PI * 2);
      ctx.fill();

      // Jagged bolt lines
      ctx.strokeStyle = 'rgba(0, 191, 255, ' + alpha + ')';
      ctx.lineWidth = 3;
      var bx = bolt.x;
      var by = bolt.y - boltHeight / 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      for (var i = 0; i < 6; i++) {
        by += boltHeight / 6;
        bx += (Math.random() - 0.5) * boltWidth * 0.5;
        ctx.lineTo(bx, by);
      }
      ctx.stroke();

      // Branches
      ctx.strokeStyle = 'rgba(0, 191, 255, ' + alpha * 0.5 + ')';
      ctx.lineWidth = 1.5;
      var brx = bolt.x + (Math.random() - 0.5) * 20;
      var bry = bolt.y - boltHeight * 0.3 + Math.random() * boltHeight * 0.2;
      ctx.beginPath();
      ctx.moveTo(brx, bry);
      ctx.lineTo(brx + (Math.random() - 0.5) * 40, bry + 20 + Math.random() * 20);
      ctx.stroke();

      // Bolt sprite effect
      ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha * 0.6 + ')';
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  /* == Time Pocket Vortex == */
  function drawTimePocket(ctx) {
    var tp = NP.timePocket;
    if (!tp.active) return;

    ctx.save();

    var r = NP.config.POCKET_RADIUS;
    var pulse = 1 + Math.sin(tp.timer * 2) * 0.05;

    // Outer ring
    ctx.strokeStyle = 'rgba(255, 140, 0, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, r * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Middle ring (rotating)
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.3)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, r * pulse * 0.7, tp.timer * 0.5, tp.timer * 0.5 + Math.PI * 1.5);
    ctx.stroke();

    // Inner gradient glow
    var grad = ctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, r * pulse);
    grad.addColorStop(0, 'rgba(255, 200, 100, 0.15)');
    grad.addColorStop(0.5, 'rgba(255, 140, 0, 0.08)');
    grad.addColorStop(1, 'rgba(255, 140, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, r * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Clock marks
    ctx.strokeStyle = 'rgba(255, 140, 0, 0.2)';
    ctx.lineWidth = 2;
    for (var i = 0; i < 12; i++) {
      var angle = (i / 12) * Math.PI * 2;
      var innerR = r * pulse * 0.75;
      var outerR = r * pulse * 0.85;
      ctx.beginPath();
      ctx.moveTo(tp.x + Math.cos(angle) * innerR, tp.y + Math.sin(angle) * innerR);
      ctx.lineTo(tp.x + Math.cos(angle) * outerR, tp.y + Math.sin(angle) * outerR);
      ctx.stroke();
    }

    // Spinning hand
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
    ctx.lineWidth = 3;
    var handAngle = tp.timer * 1.5;
    ctx.beginPath();
    ctx.moveTo(tp.x, tp.y);
    ctx.lineTo(
      tp.x + Math.cos(handAngle) * r * pulse * 0.6,
      tp.y + Math.sin(handAngle) * r * pulse * 0.6
    );
    ctx.stroke();

    ctx.restore();
  }

  /* == Void Hole == */
  function drawVoidHole(ctx) {
    if (!NP.voidHole) return;
    ctx.save();

    var v = NP.voidHole;
    var r = v.radius;
    var pulse = 1 + Math.sin(v.timer * 4) * 0.03;

    // Outer dark halo
    var grad = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, r * pulse);
    grad.addColorStop(0, 'rgba(107, 33, 168, 0.6)');
    grad.addColorStop(0.3, 'rgba(88, 28, 135, 0.4)');
    grad.addColorStop(0.6, 'rgba(76, 29, 149, 0.2)');
    grad.addColorStop(1, 'rgba(107, 33, 168, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(v.x, v.y, r * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Swirl ring
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(v.x, v.y, r * pulse * 0.5, v.timer * 2, v.timer * 2 + Math.PI * 1.5);
    ctx.stroke();

    // Inner swirl (counter-rotating)
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(v.x, v.y, r * pulse * 0.35, -v.timer * 3, -v.timer * 3 + Math.PI);
    ctx.stroke();

    // Center bright core
    ctx.fillStyle = 'rgba(216, 180, 254, 0.6)';
    ctx.beginPath();
    ctx.arc(v.x, v.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* == Trails == */
  function updateTrails() {
    // Decay all existing trails (frame-based as before)
    for (var i = NP.trails.length - 1; i >= 0; i--) {
      NP.trails[i].life -= 0.016;
      if (NP.trails[i].life <= 0) NP.trails.splice(i, 1);
    }
    // Add new trail point for every active ball
    NP.balls.forEach(function (b) {
      if (b.life > 0 || b.life === Infinity) {
        NP.trails.push({
          x: b.x, y: b.y, life: 0.35,
          ballId: b.isMain ? 'main' : 'extra:' + b.hits + '_' + (b.x|0) + '_' + (b.y|0),
        });
      }
    });
    if (NP.trails.length > 80) NP.trails.splice(0, NP.trails.length - 80);
  }

  function drawTrails() {
    // Heat-map ball trails
    NP.balls.forEach(function (b) {
      if (!b.trail) return;
      b.trail.forEach(function (t, i) {
        var alpha = (1 - t.life / 1.5) * 0.4;
        var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        var heatFactor = Math.min(1, speed / NP.config.MAX_SPEED);
        var r = Math.round(240 * heatFactor + 100 * (1 - heatFactor));
        var g = Math.round(200 * heatFactor + 50 * (1 - heatFactor));
        var bl = Math.round(50 * (1 - heatFactor));
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + bl + ',' + alpha + ')';
        var tr = (b.r || NP.config.BALL_RADIUS) * (0.3 + 0.7 * (1 - t.life / 1.5));
        ctx.beginPath();
        ctx.arc(t.x, t.y, tr, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }
  NP.updateTrails = updateTrails;
  NP.updateParticles = updateParticles;
  NP.spawnParticles = spawnParticles;

  /* == Paddle Hit Bursts == */
  function drawPaddleHitBursts(ctx) {
    NP.paddleHitBursts = NP.paddleHitBursts.filter(function (b) {
      b.life -= (1/60);
      if (b.life <= 0) return false;
      var alpha = b.life / b.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = b.color;
      for (var i = 0; i < b.count; i++) {
        var angle = (i / b.count) * Math.PI * 2 + b.phase;
        var dist = (1 - alpha) * 30 + 5;
        var px = b.x + Math.cos(angle) * dist;
        var py = b.y + Math.sin(angle) * dist;
        ctx.beginPath();
        ctx.arc(px, py, 2 + alpha * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return true;
    });
  }

  /* == Near-Miss Indicators == */
  function drawNearMisses(ctx) {
    NP.nearMisses = NP.nearMisses.filter(function (nm) {
      nm.life -= (1/60);
      if (nm.life <= 0) return false;
      var alpha = nm.life / nm.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = nm.color;
      ctx.lineWidth = 2;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = nm.color;
      ctx.fillText('MISS', nm.x, nm.y - 10 - (1 - alpha) * 20);
      // Wing indicators
      ctx.beginPath();
      ctx.moveTo(nm.x - 25, nm.y);
      ctx.lineTo(nm.x - 10, nm.y);
      ctx.moveTo(nm.x + 25, nm.y);
      ctx.lineTo(nm.x + 10, nm.y);
      ctx.stroke();
      ctx.restore();
      return true;
    });
  }

  /* == Score Flash == */
  function drawScoreFlash(ctx) {
    ['p1', 'p2'].forEach(function (owner) {
      var timerKey = 'scoreFlash' + (owner === 'p1' ? '1' : '2');
      if (NP.state[timerKey] > 0) {
        var sx = owner === 'p1' ? NP.state.width * 0.25 : NP.state.width * 0.75;
        var sy = 65;
        var alpha = NP.state[timerKey] / 0.8;
        ctx.save();
        ctx.globalAlpha = alpha * 0.5;
        var grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 40 + (1 - alpha) * 60);
        grad.addColorStop(0, owner === 'p1' ? 'rgba(0,255,255,0.6)' : 'rgba(255,0,255,0.6)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, 40 + (1 - alpha) * 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }
  NP.drawScoreFlash = drawScoreFlash;

  function drawNeonSigns() {
    var signs = NP.config.NEON_SIGNS;
    var t = Date.now() * 0.001;
    var w = NP.state.width;
    var h = NP.state.height;
    signs.forEach(function (s) {
      var alpha = 1;
      var color = s.color;
      var scaleOffset = 0;
      switch (s.anim) {
        case 'pulse':
          alpha = 0.35 + Math.sin(t * 2.5 + s.text.length) * 0.4;
          break;
        case 'breathe':
          alpha = 0.3 + Math.sin(t * 1.2 + s.text.charCodeAt(0)) * 0.25;
          scaleOffset = Math.sin(t * 1.2) * 0.05;
          break;
        case 'cycle': {
          var hue = (t * 60 + s.text.charCodeAt(0) * 40) % 360;
          color = 'hsl(' + hue + ', 100%, 60%)';
          alpha = 0.5 + Math.sin(t * 3) * 0.3;
          break;
        }
        case 'flash':
          alpha = (Math.floor(t * 3 + s.text.charCodeAt(0)) % 2 === 0) ? 0.9 : 0.15;
          break;
      }
      var sx = s.size || 1;
      var fontSize = Math.round((28 * sx + scaleOffset * 28) * NP.scale);
      ctx.save();
      ctx.globalAlpha = Math.max(0.05, alpha);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + fontSize + 'px "Courier New", monospace';
      ctx.shadowBlur = 25 * sx;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillText(s.text, w * s.x, h * s.y);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(s.text, w * s.x, h * s.y);
      ctx.restore();
    });
  }

  function drawCombo() {
    var combo = NP.state.combo;
    if (combo < 2) return;
    var s = NP.scale;
    var pulse = 1 + Math.sin(Date.now() * 0.008) * 0.04;
    var size = Math.round((22 + Math.min(combo, 20) * 2.5) * s * pulse);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + size + 'px "Courier New", monospace';
    var glowColors = ['#ff00ff', '#00ffff', '#39ff14'];
    var colorIndex = Math.min(Math.floor(combo / 5), glowColors.length - 1);
    var col = glowColors[colorIndex];
    ctx.shadowBlur = 40;
    ctx.shadowColor = col;
    ctx.fillStyle = col;
    ctx.fillText('x' + combo, NP.state.width / 2, NP.state.height * 0.1);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('x' + combo, NP.state.width / 2, NP.state.height * 0.1);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, NP.state.width, NP.state.height);
    ctx.save();
    applyShake();
    drawGrid();
    drawCenterLine();
    drawNeonSigns();
    if (NP.paddles.p1 && NP.paddles.p2 && NP.ball) {
      drawTrails();
      drawPaddle(NP.paddles.p1);
      drawPaddle(NP.paddles.p2);
      NP.balls.forEach(drawOneBall);
      NP.drawDecoys();
      NP.powerUpWarnings.forEach(drawPowerUpWarning);
      NP.powerUps.forEach(drawPowerUp);
      Object.keys(NP.activeEffects).forEach(function (ownerKey) {
        var effects = NP.activeEffects[ownerKey];
        Object.keys(effects).forEach(function (effect) {
          ctx.save();
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = effects[effect].color || '#ffffff';
          ctx.shadowBlur = 30;
          ctx.shadowColor = effects[effect].color || '#ffffff';
          ctx.beginPath();
          ctx.arc(NP.state.width * 0.5, NP.state.height * 0.5, 150, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      });
    }
    drawParticles();
    drawBumpers();
    drawTornado();
    drawDisco();
    drawKaiju(ctx);
    drawStorm(ctx);
    drawTimePocket(ctx);
    drawVoidHole(ctx);
    drawPaddleHitBursts(ctx);
    drawNearMisses(ctx);
    drawScoreFlash(ctx);
    drawCombo();
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
  NP.drawPaddle = drawPaddle;
  NP.drawOneBall = drawOneBall;
  NP.drawPowerUp = drawPowerUp;
  NP.drawPowerUpWarning = drawPowerUpWarning;
  NP.drawCallout = drawCallout;
  NP.applyShake = applyShake;
  NP.drawTrails = drawTrails;
  NP.drawParticles = drawParticles;
  NP.drawBumpers = drawBumpers;
  NP.drawTornado = drawTornado;
  NP.drawDisco = drawDisco;
  NP.drawKaiju = drawKaiju;
  NP.drawStorm = drawStorm;
  NP.drawTimePocket = drawTimePocket;
  NP.drawVoidHole = drawVoidHole;
  NP.drawPaddleHitBursts = drawPaddleHitBursts;
  NP.drawNearMisses = drawNearMisses;
  NP.drawScoreFlash = drawScoreFlash;
  NP.drawNeonSigns = drawNeonSigns;
  NP.drawCombo = drawCombo;

  /* == Decoys == */
  function drawDecoys() {
    [['p1', NP.activeEffects.p1], ['p2', NP.activeEffects.p2]].forEach(function (pair) {
      if (pair[1].decoy > 0) {
        var offsetX = 30 + Math.sin(Date.now() * 0.004) * 20;
        var offsetY = 20 + Math.cos(Date.now() * 0.005) * 25;
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff00aa';
        ctx.fillStyle = '#ff00aa';
        ctx.beginPath();
        ctx.arc(NP.ball.x + offsetX, NP.ball.y + offsetY, NP.ball.r * 0.92, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }
  NP.drawDecoys = drawDecoys;

})();