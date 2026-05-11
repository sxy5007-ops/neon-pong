/**
 * Neon Pong — Entity Factories
 * Paddle, ball, and extra-ball creation functions.
 */
(function () {
  'use strict';

  var NP = window.NP;
  if (!NP) return;

  function makePaddle(side) {
    var h = Math.max(60, NP.state.height * NP.config.PADDLE_HEIGHT_RATIO);
    return {
      side: side, x: side === 'left' ? NP.config.PADDLE_WIDTH * 2 : NP.state.width - NP.config.PADDLE_WIDTH * 3,
      y: NP.state.height / 2 - h / 2, w: NP.config.PADDLE_WIDTH, h: h, vy: 0,
      speed: 720, color: side === 'left' ? NP.config.COLORS.paddleP1 : NP.config.COLORS.paddleP2,
      glow: side === 'left' ? '#00ffff' : '#ff00ff',
    };
  }

  function makeBall() {
    var dir = Math.random() > 0.5 ? 1 : -1;
    var angle = (Math.random() - 0.5) * (Math.PI / 3);
    return {
      x: NP.state.width / 2, y: NP.state.height / 2, r: NP.config.BALL_RADIUS,
      vx: Math.cos(angle) * NP.config.INITIAL_SPEED * dir, vy: Math.sin(angle) * NP.config.INITIAL_SPEED,
      speed: NP.config.INITIAL_SPEED, baseSpeed: NP.config.INITIAL_SPEED, hits: 0, isMain: true, life: Infinity,
    };
  }

  function makeExtraBall(source, angleOffset) {
    var speed = Math.max(NP.config.INITIAL_SPEED * 0.82, source.speed * 0.78);
    var angle = Math.atan2(source.vy, source.vx) + angleOffset;
    return {
      x: source.x, y: source.y, r: Math.max(4, source.r * 0.62),
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      speed: speed, baseSpeed: speed, hits: 0, isMain: false, life: 6,
    };
  }

  NP.makePaddle = makePaddle;
  NP.makeBall = makeBall;
  NP.makeExtraBall = makeExtraBall;

})();
