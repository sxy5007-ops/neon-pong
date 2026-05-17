/**
 * Neon Pong — Configuration Constants
 * All tunable game constants extracted from engine.js.
 */
(function () {
  'use strict';

  var NP = window.NP || (window.NP = {});

  NP.config = {
    /* == Core Gameplay == */
    WIN_SCORE: 10,
    BALL_RADIUS: 8,
    INITIAL_SPEED: 480,
    SPEED_INCREMENT: 24,
    MAX_SPEED: 1000,

    /* == Paddle == */
    PADDLE_WIDTH: 14,
    PADDLE_HEIGHT_RATIO: 0.18,

    /* == Power-ups == */
    POWER_UP_SIZE: 62,
    POWER_UP_LIFE: 18,
    POWER_UP_SPAWN_MIN: 6,
    POWER_UP_SPAWN_MAX: 11,
    POWER_UP_WARNING_LIFE: 1.4,

    /* == Bumpers == */
    BUMPER_RADIUS: 20,
    BUMPER_COUNT: 2,

    /* == Tornado Hazard == */
    TORNADO_LIFETIME: 60,
    TORNADO_COOLDOWN_MIN: 20,
    TORNADO_COOLDOWN_MAX: 40,
    TORNADO_RADIUS: 36,
    TORNADO_KNOCK_SPEED: 350,

    /* == Kaiju Event == */
    KAIJU_DURATION: 8,
    KAIJU_COOLDOWN_MIN: 40,
    KAIJU_COOLDOWN_MAX: 65,
    KAIJU_ARM_WIDTH: 80,
    KAIJU_ARM_HEIGHT: 200,
    KAIJU_SHOCKWAVE_RADIUS: 300,
    KAIJU_STUN_DURATION: 0.8,
    KAIJU_PATTERNS: ['slam', 'sweep', 'rumble', 'roar'],

    /* == Neon Storm Event == */
    STORM_DURATION: 10,
    STORM_COOLDOWN_MIN: 50,
    STORM_COOLDOWN_MAX: 80,
    STORM_STRIKE_INTERVAL: 1.5,
    STORM_BOLT_WIDTH: 12,
    STORM_REVERSE_DURATION: 1.0,
    STORM_STUN_RADIUS: 80,

    /* == Time Pocket Event == */
    POCKET_DURATION: 10,
    POCKET_COOLDOWN_MIN: 40,
    POCKET_COOLDOWN_MAX: 60,
    POCKET_SLOW_FACTOR: 0.6,
    POCKET_RADIUS: 120,
    POCKET_SPEED: 60,

    /* == Disco Mode == */
    DISCO_DURATION: 12,
    DISCO_COOLDOWN_MIN: 45,
    DISCO_COOLDOWN_MAX: 70,
    DISCO_SPEED_OSCILLATION: 0.4,
    DISCO_BPM: 135,

    /* == UI == */
    CALLOUT_LIFE: 1.8,

    /* == Settings defaults == */
    DEFAULT_SETTINGS: {
      musicVolume: 0.7,
      sfxVolume: 0.7,
      crtEnabled: true,
      particlesEnabled: true,
    },

    /* == Colors == */
    COLORS: {
      bg: '#0a0a0f',
      grid: 'rgba(0, 255, 255, 0.06)',
      paddleP1: '#00ffff',
      paddleP2: '#ff00ff',
      ball: '#f0e100',
      ballTrail: 'rgba(240, 225, 0, 0.35)',
      particle: ['#00ffff', '#ff00ff', '#f0e100', '#b026ff'],
    },

    /* == Power-up Types == */
    POWER_UP_TYPES: [
      { id: 'mega', label: 'MEGA', color: '#00ffff' },
      { id: 'tiny', label: 'TINY', color: '#ff00ff' },
      { id: 'turbo', label: 'TURBO', color: '#f0e100' },
      { id: 'glitch', label: 'GLITCH', color: '#b026ff' },
      { id: 'reverse', label: 'REVERSE', color: '#ff5c8a' },
      { id: 'freeze', label: 'FREEZE', color: '#4fc3f7' },
      { id: 'multiball', label: 'MULTI', color: '#ffffff' },
      { id: 'sound', label: 'SONIC', color: '#ff6b35' },
      { id: 'phase', label: 'PHASE', color: '#39ff14' },
      { id: 'decoy', label: 'DECOY', color: '#ff00aa' },
      { id: 'ricochet', label: 'RICO', color: '#00ffcc' },
      { id: 'gravity', label: 'GRAVITY', color: '#8b5cf6' },
      { id: 'magnet', label: 'MAGNET', color: '#06b6d4' },
      { id: 'blink', label: 'BLINK', color: '#eab308' },
      { id: 'void', label: 'VOID', color: '#6b21a8' },
    ],

    /* == Effect Labels == */
    EFFECT_LABELS: {
      mega: 'Mega Paddle',
      tiny: 'Tiny Trouble',
      turbo: 'Turbo Ball',
      glitch: 'Glitch Bounce',
      reverse: 'Reverse',
      freeze: 'Freeze',
      slow: 'Slow Field',
      multiball: 'Multiball',
      sound: 'Sonic Pulse',
      phase: 'Phase Shift',
      decoy: 'Ghost Ball',
      ricochet: 'Ricochet',
      gravity: 'Gravity Well',
      magnet: 'Magnet Attract',
      blink: 'Blink',
      void: 'Void Black Hole',
    },

    /* == AI Difficulty == */
    DIFFICULTY: {
      easy:   { reaction: 0.46, maxSpeedPct: 0.42, error: 0.34, awareness: 0.42 },
      normal: { reaction: 0.22, maxSpeedPct: 0.76, error: 0.14, awareness: 0.68 },
      hard:   { reaction: 0.08, maxSpeedPct: 1.06, error: 0.035, awareness: 0.9 },
    },

    /* == Animated Neon Signs == */
    NEON_SIGNS: [
      { text: 'NEON', x: 0.5, y: 0.5, color: '#ff00ff', anim: 'pulse', size: 3 },
      { text: 'PONG', x: 0.5, y: 0.42, color: '#00ffff', anim: 'breathe', size: 2.5 },
      { text: '2087', x: 0.15, y: 0.12, color: '#39ff14', anim: 'cycle', size: 1.2 },
      { text: 'GLITCH', x: 0.85, y: 0.85, color: '#b026ff', anim: 'flash', size: 1 },
      { text: 'CYBER', x: 0.85, y: 0.12, color: '#ff6b35', anim: 'pulse', size: 1 },
      { text: '//', x: 0.15, y: 0.85, color: '#4fc3f7', anim: 'breathe', size: 1.2 },
    ],
  };

  /* == Expose individual constants as NP.* for backwards compatibility == */
  NP.WIN_SCORE = NP.config.WIN_SCORE;
  NP.PADDLE_WIDTH = NP.config.PADDLE_WIDTH;
  NP.PADDLE_HEIGHT_RATIO = NP.config.PADDLE_HEIGHT_RATIO;
  NP.BALL_RADIUS = NP.config.BALL_RADIUS;
  NP.INITIAL_SPEED = NP.config.INITIAL_SPEED;
  NP.SPEED_INCREMENT = NP.config.SPEED_INCREMENT;
  NP.MAX_SPEED = NP.config.MAX_SPEED;
  NP.POWER_UP_SIZE = NP.config.POWER_UP_SIZE;
  NP.POWER_UP_LIFE = NP.config.POWER_UP_LIFE;
  NP.POWER_UP_SPAWN_MIN = NP.config.POWER_UP_SPAWN_MIN;
  NP.POWER_UP_SPAWN_MAX = NP.config.POWER_UP_SPAWN_MAX;
  NP.POWER_UP_WARNING_LIFE = NP.config.POWER_UP_WARNING_LIFE;
  NP.CALLOUT_LIFE = NP.config.CALLOUT_LIFE;
  NP.BUMPER_RADIUS = NP.config.BUMPER_RADIUS;
  NP.BUMPER_COUNT = NP.config.BUMPER_COUNT;
  NP.TORNADO_LIFETIME = NP.config.TORNADO_LIFETIME;
  NP.TORNADO_COOLDOWN_MIN = NP.config.TORNADO_COOLDOWN_MIN;
  NP.TORNADO_COOLDOWN_MAX = NP.config.TORNADO_COOLDOWN_MAX;
  NP.TORNADO_RADIUS = NP.config.TORNADO_RADIUS;
  NP.TORNADO_KNOCK_SPEED = NP.config.TORNADO_KNOCK_SPEED;
  NP.DISCO_DURATION = NP.config.DISCO_DURATION;
  NP.DISCO_COOLDOWN_MIN = NP.config.DISCO_COOLDOWN_MIN;
  NP.DISCO_COOLDOWN_MAX = NP.config.DISCO_COOLDOWN_MAX;
  NP.DISCO_SPEED_OSCILLATION = NP.config.DISCO_SPEED_OSCILLATION;
  NP.DISCO_BPM = NP.config.DISCO_BPM;
  NP.COLORS = NP.config.COLORS;
  NP.POWER_UP_TYPES = NP.config.POWER_UP_TYPES;
  NP.EFFECT_LABELS = NP.config.EFFECT_LABELS;
  NP.DIFFICULTY = NP.config.DIFFICULTY;

})();
