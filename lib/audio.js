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
  var musicGain = null;
  var sfxGain = null;
  var musicInterval = null;
  var step = 0;
  var isPlaying = false;
  var discoInterval = null;
  var discoStep = 0;
  var isDiscoPlaying = false;

  function init() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = NP.state.muted ? 0 : 1.0;
    masterGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.35 * NP.settings.musicVolume;
    musicGain.connect(masterGain);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.35 * NP.settings.sfxVolume;
    sfxGain.connect(masterGain);
  }

  function setMute(muted) {
    NP.state.muted = muted;
    if (masterGain) masterGain.gain.setTargetAtTime(muted ? 0 : 1.0, ctx.currentTime, 0.05);
    var icon = muted ? String.fromCharCode(0x1F507) : String.fromCharCode(0x1F50A);
    if (NP.ui && NP.ui.muteBtn) NP.ui.muteBtn.textContent = icon;
    if (NP.ui && NP.ui.hudMuteBtn) NP.ui.hudMuteBtn.textContent = icon;
  }

  function setMusicVolume(v) {
    if (musicGain) musicGain.gain.setTargetAtTime(0.35 * v, ctx.currentTime, 0.05);
  }

  function setSfxVolume(v) {
    if (sfxGain) sfxGain.gain.setTargetAtTime(0.35 * v, ctx.currentTime, 0.05);
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
      gain.connect(sfxGain);
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

  function sfxKaijuRoar() {
    playTone({ type: 'sawtooth', freq: 40, duration: 1.2, volume: 0.45, attack: 0.1, decay: 1.0, slideTo: 20 });
    playTone({ type: 'square', freq: 30, duration: 1.0, volume: 0.3, attack: 0.05, decay: 0.9, slideTo: 15 });
    playTone({ type: 'sine', freq: 55, duration: 0.8, volume: 0.2, attack: 0.2, decay: 0.6, slideTo: 25 });
    playTone({ type: 'sawtooth', freq: 20, duration: 0.6, volume: 0.25, attack: 0.3, decay: 0.3, slideTo: 10 });
  }

  function sfxKaijuSlam() {
    playTone({ type: 'sawtooth', freq: 100, duration: 0.5, volume: 0.45, attack: 0.01, decay: 0.42, slideTo: 25 });
    playTone({ type: 'square', freq: 60, duration: 0.4, volume: 0.3, attack: 0.005, decay: 0.35, slideTo: 20 });
    playTone({ type: 'sine', freq: 200, duration: 0.15, volume: 0.15, attack: 0.005, decay: 0.12, slideTo: 40 });
  }

  function sfxStormStrike() {
    playTone({ type: 'sawtooth', freq: 800, duration: 0.2, volume: 0.35, attack: 0.002, decay: 0.18, slideTo: 1200 });
    playTone({ type: 'square', freq: 400, duration: 0.15, volume: 0.2, attack: 0.002, decay: 0.12, slideTo: 600 });
    playTone({ type: 'sine', freq: 2000, duration: 0.08, volume: 0.1, attack: 0.001, decay: 0.06, slideTo: 3000 });
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
      bassGain.connect(musicGain);
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
      arpGain.connect(musicGain);
      arpOsc.start(t);
      arpOsc.stop(t + beat * 0.5);

      step++;
    }, (60 / 110) * 1000 / 2);
  }

  function stopMusic() {
    isPlaying = false;
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  }

  /*** 8-BIT DISCO MUSIC ***/
  function startDiscoMusic() {
    if (!ctx || isDiscoPlaying) return;
    isDiscoPlaying = true;
    discoStep = 0;
    var discoBPM = NP.config.DISCO_BPM || 135;
    var beatMs = (60 / discoBPM) * 1000;
    var halfBeatMs = beatMs / 2;

    discoInterval = setInterval(function () {
      if (NP.state.muted || !isDiscoPlaying) return;
      var t = ctx.currentTime;
      var noteIdx = discoStep % 16;

      // Disco bass: four-on-the-floor (G2-G2-C3-C3-E3-E3-G3-G3)
      var discoBassNotes = [98.00, 98.00, 130.81, 130.81, 164.81, 164.81, 196.00, 196.00,
                             98.00, 98.00, 130.81, 130.81, 164.81, 164.81, 196.00, 196.00];

      // Lead arpeggio: square wave arp
      var arpNotes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 196.00,
                      293.66, 369.99, 440.00, 587.33, 440.00, 369.99, 293.66, 220.00];
      
      // Melody hook (pentatonic, 16 notes)
      var melodyNotes = [523.25, 587.33, 659.25, 523.25, 659.25, 783.99, 659.25, 587.33,
                         523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440.00];

      var bassFreq = discoBassNotes[noteIdx];
      var arpFreq = arpNotes[noteIdx];
      var melodyFreq = melodyNotes[noteIdx];
      var halfBeat = halfBeatMs / 1000;

      // -- Bass (triangle wave, four-on-the-floor) --
      var bassOsc = ctx.createOscillator();
      var bassGain = ctx.createGain();
      var bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.value = 400;
      bassFilter.Q.value = 1;
      bassOsc.type = 'triangle';
      bassOsc.frequency.value = bassFreq;
      bassGain.gain.setValueAtTime(0, t);
      bassGain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + halfBeat * 0.85);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(musicGain);
      bassOsc.start(t);
      bassOsc.stop(t + halfBeat);

      // -- Lead arpeggio (square wave, 8-bit chiptune) --
      var arpOsc = ctx.createOscillator();
      var arpGain = ctx.createGain();
      var arpFilter = ctx.createBiquadFilter();
      arpFilter.type = 'lowpass';
      arpFilter.frequency.value = 2000;
      arpFilter.Q.value = 1;
      arpOsc.type = 'square';
      arpOsc.frequency.value = arpFreq;
      arpGain.gain.setValueAtTime(0, t);
      arpGain.gain.linearRampToValueAtTime(0.08, t + 0.01);
      arpGain.gain.exponentialRampToValueAtTime(0.001, t + halfBeat * 0.4);
      arpOsc.connect(arpFilter);
      arpFilter.connect(arpGain);
      arpGain.connect(musicGain);
      arpOsc.start(t);
      arpOsc.stop(t + halfBeat * 0.5);

      // -- Melody hook (square wave, pitched brighter) --
      var melodyOsc = ctx.createOscillator();
      var melodyGain = ctx.createGain();
      melodyOsc.type = 'square';
      melodyOsc.frequency.value = melodyFreq;
      melodyGain.gain.setValueAtTime(0, t);
      melodyGain.gain.linearRampToValueAtTime(0.04, t + 0.01);
      melodyGain.gain.exponentialRampToValueAtTime(0.001, t + halfBeat * 0.7);
      melodyOsc.connect(melodyGain);
      melodyGain.connect(musicGain);
      melodyOsc.start(t);
      melodyOsc.stop(t + halfBeat * 0.7);

      // -- Hi-hat (noise burst on off-beats) --
      if (discoStep % 2 === 1) {
        var hatGain = ctx.createGain();
        var bufferSize = ctx.sampleRate * 0.04;
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        var hat = ctx.createBufferSource();
        hat.buffer = buffer;
        hatGain.gain.setValueAtTime(0.06, t);
        hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        hat.connect(hatGain);
        hatGain.connect(musicGain);
        hat.start(t);
      }

      discoStep++;
    }, halfBeatMs);
  }

  function stopDiscoMusic() {
    isDiscoPlaying = false;
    if (discoInterval) { clearInterval(discoInterval); discoInterval = null; }
  }

  /* == Synth Voice Callout == */
  function sfxCallout(text) {
    if (!ctx || NP.state.muted) return;
    try {
      var parts = text.replace(/-/g, ' ').split(/\s+/).filter(function (p) { return p.length > 0; });
      if (parts.length === 0) parts = [text];
      var t = ctx.currentTime;
      var gap = 0.08;
      parts.forEach(function (syllable, i) {
        var start = t + i * gap;
        var baseFreq = 180 + (i * 60) % 240;
        // Carrier — sawtooth with filter sweep
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        var filter = ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq, start);
        osc.frequency.linearRampToValueAtTime(baseFreq * 0.7, start + 0.12);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, start);
        filter.frequency.exponentialRampToValueAtTime(150, start + 0.12);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        osc.start(start);
        osc.stop(start + 0.16);
        // Glitch sub — square wave at 1.5x pitch for texture
        var osc2 = ctx.createOscillator();
        var gain2 = ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(baseFreq * 1.5, start);
        gain2.gain.setValueAtTime(0, start);
        gain2.gain.linearRampToValueAtTime(0.035, start + 0.005);
        gain2.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
        osc2.connect(gain2);
        gain2.connect(sfxGain);
        osc2.start(start);
        osc2.stop(start + 0.1);
      });
    } catch (e) { /* Audio failures must not break gameplay */ }
  }

  NP.AudioEngine = { 
    init: init, 
    setMute: setMute, 
    toggleMute: toggleMute,
    setMusicVolume: setMusicVolume,
    setSfxVolume: setSfxVolume,
    sfxPaddleHit: sfxPaddleHit, 
    sfxWallHit: sfxWallHit, 
    sfxScore: sfxScore,
    sfxWin: sfxWin, 
    sfxSonicPulse: sfxSonicPulse,
    sfxKaijuRoar: sfxKaijuRoar,
    sfxKaijuSlam: sfxKaijuSlam,
    sfxStormStrike: sfxStormStrike,
    sfxCallout: sfxCallout,
    startMusic: startMusic, 
    stopMusic: stopMusic,
    startDiscoMusic: startDiscoMusic,
    stopDiscoMusic: stopDiscoMusic,
    isDiscoPlaying: function () { return isDiscoPlaying; }
  };

})();