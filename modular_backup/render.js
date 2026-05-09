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
  }

  function drawGrid() {
    var spacing = 60;
    NP.state.gridOffset = (NP.state.gridOffset + 12) % spacing;
    ctx.strokeStyle = NP.COLORS.grid;
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
    var dash = 16, gap = 12;
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
    ctx.shadowBlur = p.displayShield ? 34 : 20;
    ctx.shadowColor = p.glow;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 4);
    ctx.fill();
    if (p.displayShield) {
      ctx.strokeStyle = '#5cff8d'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
  }

  function drawOneBall(b) {
    ctx.save();
    ctx.shadowBlur = b.isMain ? 24 : 14;
    ctx.shadowColor = b.isMain ? NP.COLORS.ball : '#ffffff';
    ctx.fillStyle = b.isMain ? NP.COLORS.ball : 'rgba(255, 255, 255, 0.82)';
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
    var pulse = 0.65 + Math.sin(warning.life * 14) * 0.25;
    ctx.save();
    ctx.globalAlpha = NP.clamp(pulse, 0.25, 0.9);
    ctx.shadowBlur = 18;
    ctx.shadowColor = warning.color;
    ctx.strokeStyle = warning.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(warning.x, warning.y, NP.POWER_UP_SIZE * 0.56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(warning.x - 12, warning.y);
    ctx.lineTo(warning.x + 12, warning.y);
    ctx.moveTo(warning.x, warning.y - 12);
    ctx.lineTo(warning.x, warning.y + 12);
    ctx.stroke();
    ctx.restore();
  }

  function drawCallout(callout) {
    var alpha = NP.clamp(callout.life / NP.CALLOUT_LIFE, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 16;
    ctx.shadowColor = callout.color;
    ctx.fillStyle = callout.color;
    ctx.font = '800 18px Courier New, monospace';
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

  function drawTrails() {
    NP.trails.forEach(function (t) {
      var alpha = NP.clamp(t.life / 0.35, 0, 1) * 0.5;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = NP.COLORS.ballTrail;
      ctx.beginPath();
      ctx.arc(t.x, t.y, NP.BALL_RADIUS * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    NP.particles.forEach(function (p) {
      var alpha = NP.clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.clearRect(0, 0, NP.state.width, NP.state.height);
    ctx.save();
    applyShake();
    drawGrid();
    drawCenterLine();
    if (NP.paddles.p1 && NP.paddles.p2 && NP.ball) {
      drawTrails();
      drawPaddle(NP.paddles.p1);
      drawPaddle(NP.paddles.p2);
      NP.balls.forEach(drawOneBall);
      NP.powerUpWarnings.forEach(drawPowerUpWarning);
      NP.powerUps.forEach(drawPowerUp);
      NP.callouts.forEach(drawCallout);
    }
    drawParticles();
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

})();
