/**
 * Neon Pong — Procedural Audio
 * Synthwave bassline + arpeggio, SFX via Web Audio API.
 */
(function () {
  'use strict';

  var NP = window.NP;
  if (!NP) return;

  var ctx = null;
  var masterGain = null;
  var musicInterval = null;
  var step = 0;
  var isPlaying = false;

  function init() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = NP.state.muted ? 0 : 0.35;
    masterGain.connect(ctx.destination);
  }

  function setMute(muted) {
    NP.state.muted = muted;
    if (masterGain) masterGain.gain.setTargetAtTime(muted ? 0 : 0.35, ctx.currentTime, 0.05);
    var icon = muted ? String.fromCharCode(0x1F507) : String.fromCharCode(0x1F50A);
    if (NP.ui && NP.ui.muteBtn) NP.ui.muteBtn.textContent = icon;
    if (NP.ui && NP.ui.hudMuteBtn) NP.ui.hudMuteBtn.textContent = icon;
  }

  function toggleMute() { setMute(!NP.state.muted); }

  function playTone(cfg) {
    if (!ctx || NP.state.muted) return;
    try {
      var t = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = cfg.type || 'sine';
      osc.frequency.setValueAtTime(cfg.freq || 440, t);
      if (cfg.slideTo != null && isFinite(cfg.slideTo)) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, cfg.slideTo), t + cfg.duration);
      }
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(cfg.volume || 0.3, t + (cfg.attack || 0.01));
      gain.gain.exponentialRampToValueAtTime(0.001, t + (cfg.attack || 0.01) + (cfg.decay || 0.12));
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + cfg.duration + 0.05);
    } catch(e) {
      // Audio failures must never break gameplay
    }
  }

  function sfxPaddleHit() {
    playTone({ type: 'square', freq: 520, duration: 0.12, volume: 0.25, attack: 0.005, decay: 0.08, slideTo: 320 });
    playTone({ type: 'sine', freq: 260, duration: 0.1, volume: 0.15, attack: 0.005, decay: 0.08 });
  }

  function sfxWallHit() {
    playTone({ type: 'sine', freq: 180, duration: 0.14, volume: 0.2, attack: 0.01, decay: 0.1, slideTo: 140 });
  }

  function sfxScore() {
    playTone({ type: 'sawtooth', freq: 640, duration: 0.35, volume: 0.2, attack: 0.01, decay: 0.28, slideTo: 120 });
    playTone({ type: 'square', freq: 320, duration: 0.3, volume: 0.12, attack: 0.01, decay: 0.25, slideTo: 80 });
  }

  function sfxWin() {
    [440, 554, 659, 880].forEach(function (f) {
      playTone({ type: 'square', freq: f, duration: 0.5, volume: 0.18, attack: 0.01, decay: 0.4, slideTo: f * 0.5 });
    });
  }

  function sfxSonicPulse() {
    playTone({ type: 'sawtooth', freq: 80, duration: 0.5, volume: 0.35, attack: 0.02, decay: 0.42, slideTo: 30 });
    playTone({ type: 'sine', freq: 60, duration: 0.6, volume: 0.2, attack: 0.01, decay: 0.5, slideTo: 20 });
  }

  function startMusic() {
    if (!ctx || isPlaying) return;
    isPlaying = true;
    step = 0;
    musicInterval = setInterval(function () {
      if (NP.state.muted || !isPlaying) return;
      var t = ctx.currentTime;
      var beat = 60 / 110;
      var noteIdx = step % 8;
      var bassNotes = [55, 55, 65.41, 73.42, 55, 55, 49, 49];
      var arpNotes = [220, 261.63, 329.63, 392, 440, 392, 329.63, 261.63];
      var bassFreq = bassNotes[noteIdx];
      var arpFreq = arpNotes[noteIdx];

      var bassOsc = ctx.createOscillator();
      var bassGain = ctx.createGain();
      var bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.value = 280;
      bassFilter.Q.value = 1;
      bassOsc.type = 'triangle';
      bassOsc.frequency.value = bassFreq;
      bassGain.gain.setValueAtTime(0, t);
      bassGain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.9);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(masterGain);
      bassOsc.start(t);
      bassOsc.stop(t + beat);

      var arpOsc = ctx.createOscillator();
      var arpGain = ctx.createGain();
      var arpFilter = ctx.createBiquadFilter();
      arpFilter.type = 'lowpass';
      arpFilter.frequency.value = 900;
      arpFilter.Q.value = 2;
      arpOsc.type = 'sawtooth';
      arpOsc.frequency.value = arpFreq;
      arpGain.gain.setValueAtTime(0, t);
      arpGain.gain.linearRampToValueAtTime(0.06, t + 0.01);
      arpGain.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.5);
      arpOsc.connect(arpFilter);
      arpFilter.connect(arpGain);
      arpGain.connect(masterGain);
      arpOsc.start(t);
      arpOsc.stop(t + beat * 0.5);

      step++;
    }, (60 / 110) * 1000 / 2);
  }

  function stopMusic() {
    isPlaying = false;
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  }

  NP.AudioEngine = { 
    init: init, 
    setMute: setMute, 
    toggleMute: toggleMute,
    sfxPaddleHit: sfxPaddleHit, 
    sfxWallHit: sfxWallHit, 
    sfxScore: sfxScore,
    sfxWin: sfxWin, 
    sfxSonicPulse: sfxSonicPulse,
    startMusic: startMusic, 
    stopMusic: stopMusic 
  };

})();