# Settings Screen

Add a settings screen to cyberpunk-pong with volume controls, CRT toggle, and particles toggle, persisted to localStorage.

## Files to change

### `lib/config.js`
- Add `DEFAULT_SETTINGS` object to `NP.config`

### `lib/state.js`
- Initialize `NP.settings` with merged saved state

### `lib/engine.js`
- Extend `NP.saveGame()` / `NP.loadGame()` to include settings
- Add `NP.applySettings()` to sync settings to runtime
- Add `NP.toggleCRT()` / `NP.toggleParticles()` helpers

### `lib/audio.js`
- Split `masterGain` into `musicGain` + `sfxGain` both fed into `masterGain`
- `setMusicVolume(v)` / `setSfxVolume(v)` update respective gain nodes
- Expose via `NP.AudioEngine`

### `index.html`
- Add `<div id="settings-screen" class="screen">` with:
  - Music volume slider (`<input type="range">`)
  - SFX volume slider
  - CRT toggle button (on/off state)
  - Particles toggle button
  - Back button

### `style.css`
- Range slider styling (cyan/magenta neon track + thumb)
- Toggle switch / toggle button styling
- Settings layout rows

### `lib/render.js`
- `NP.spawnParticles` checks `NP.settings.particlesEnabled`
- CRT overlay visibility tied to `NP.settings.crtEnabled`

### `main.js`
- Add `NP.screens.settings` reference
- Wire settings button on menu screen
- Wire back button on settings screen
- Wire sliders (input event → volume update)
- Wire toggle buttons (click → toggle setting → update UI)
- Call `NP.applySettings()` on load

## Implementation order
1. config.js + state.js + engine.js (data layer)
2. audio.js (audio refactor)
3. render.js (toggle logic)
4. index.html + style.css (UI)
5. main.js (wiring)
6. smoke-test.js
