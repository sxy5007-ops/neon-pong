# Random Power-up + Campaign Mode

## Phase 1: Random Power-up

Add a `random` power-up type that picks a random effect when collected.

### Files to change
- `lib/config.js` — add `random` to `POWER_UP_TYPES` and `EFFECT_LABELS`
- `lib/powerup.js` — add `if (type === 'random')` handler in `applyPowerUp`

### Implementation
```js
// In POWER_UP_TYPES, add:
{ id: 'random', label: '??', color: '#ffffff' }

// In EFFECT_LABELS, add:
random: 'Random Power'

// In applyPowerUp, add block:
if (type === 'random') {
  var allTypes = NP.config.POWER_UP_TYPES.filter(function (t) { return t.id !== 'random'; });
  var pick = allTypes[Math.floor(Math.random() * allTypes.length)];
  applyPowerUp(owner, pick.id);
  return; // already handled callout via recursive call
}
```

The recursive call to `applyPowerUp` handles all the normal effects, particles, callouts, etc.

---

## Phase 2: Campaign Mode

### 2a. Campaign Level Definitions (config.js)

Add a `CAMPAIGN_LEVELS` array. Each level specifies:
- `id`, `title`, `subtitle` — display
- `winScore` — points needed to win
- `difficulty` — AI difficulty
- `aiSpeedPct` — optional AI max speed multiplier
- `modifiers` — list of feature toggles:
  - `powerUps: boolean / ['specific', 'types']` — which power-ups appear (true = all, false = none, array = subset)
  - `bumpers: boolean / count`
  - `tornado: boolean`
  - `kaiju: boolean`
  - `disco: boolean`
  - `worm: boolean`
  - `wormCooldown: [min, max]`
  - `initialSpeed: number`
  - `maxSpeed: number`
  - `powerUpSpawnMin/Max: numbers`
  - `description: string`

8 levels, escalating complexity.

### 2b. Campaign Screen HTML (index.html)

Add a campaign screen between menu and HUD:
- Back button → main menu
- Grid of level buttons (locked/unlocked)
- Shows level title, description, stars/completion status
- "START CAMPAIGN" when selecting a level

### 2c. Campaign CSS (style.css)

- `.campaign-grid` grid layout for level buttons
- `.campaign-level` card with locked/unlocked/complete states
- `.campaign-info` panel with level description

### 2d. Campaign Logic (logic.js / new campaign.js)

Add to `NP`:
- `NP.campaign = { levels: [], currentLevel: 0, progress: {}, completed: false }`
- `startCampaign()` — loads first level
- `startCampaignLevel(levelIndex)` — applies level mods, starts game
- `checkCampaignWin()` — called after each score, transitions to next level
- `endCampaign()` — shows victory screen, saves progress

Modify:
- `startGame` — optional `levelConfig` param to override defaults
- Score check in game loop — if campaign, call `checkCampaignWin`
- `quitToMenu` — reset campaign state

### 2e. Save Progress (engine.js / state.js)

- `saveCampaignProgress(progress)` / `loadCampaignProgress()`
- Key: `'neonpong_campaign_' + profileName`

### 2f. Menu Wiring (main.js)

- Add "CAMPAIGN" button to menu, above 1P buttons
- On click → show campaign screen
- Wire level select → start campaign level
- Wire "back to menu" from campaign screen

### Content: 8 Campaign Levels

| # | Title | Win | AI | Features | Description |
|---|-------|-----|----|----------|-------------|
| 1 | TUTORIAL | 3 | easy | power-ups only (mega, tiny, turbo) | Learn the basics of Neon Pong |
| 2 | POWER PLAY | 5 | easy | all power-ups, no hazards | Master the power-ups |
| 3 | BOUNCE HOUSE | 7 | normal | all power-ups + bumpers | Watch your angles |
| 4 | STORM FRONT | 7 | normal | all power-ups + bumpers + storm | Weather the neon storm |
| 5 | WORM BREACH | 7 | normal | all + bumpers + worm | The data worm hunts |
| 6 | CHAOS THEORY | 10 | hard | everything enabled | Full chaos unleashed |
| 7 | KAIJU KING | 10 | hard | all + kaiju + worm | Two hazards at once |
| 8 | FINAL FRONTIER | 15 | hard | all hazards, fast initial speed | Survive the gauntlet |

---

## Risk Assessment

- Random power-up: very low risk. Small additive change.
- Campaign mode: medium risk. New UI screen, save system, level-specific game overrides. Must be careful not to break existing game modes.
- All changes are additive — existing modes unchanged.