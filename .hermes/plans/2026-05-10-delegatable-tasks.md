# Delegatable Tasks for Cyberpunk-Pong Enhancement
Date: 2026-05-10

This plan contains bite-sized, delegatable tasks for enhancing the cyberpunk-pong project. Each task is designed to be completed in 2-5 minutes of focused work and includes exact file paths, code examples, and clear completion criteria.

## Task 1: Extract Ball Physics to Logic Module
**Goal**: Move ball physics calculations from main.js to logic.js

**Context**: main.js currently contains ball update logic that should reside in logic.js for better separation of concerns.

**Steps**:
1. Read main.js to identify ball-related logic
2. Identify appropriate functions in logic.js to extend
3. Move ball physics calculations to logic.js
4. Update main.js to delegate to logic.js

**Files to modify**: 
- `/Users/syau/Documents/Warp/cyberpunk-pong/main.js`
- `/Users/syau/Documents/Warp/cyberpunk-pong/lib/logic.js`

**Code Examples**:
In main.js, replace ball update logic (approximately lines 45-65):
```javascript
// BEFORE (in main.js)
function updateBall() {
  // Ball movement and collision logic
  ball.x += ball.vx;
  ball.y += ball.vy;
  // ... collision detection with walls/paddles
}

// AFTER (in main.js)
function updateBall() {
  if (typeof NP.logic.updateBall === 'function') {
    NP.logic.updateBall();
  }
}
```

In logic.js, add/update function:
```javascript
// In lib/logic.js
NP.logic = {
  // ... existing code
  
  updateBall: function() {
    // Ball movement and collision logic moved here
    ball.x += ball.vx;
    ball.y += ball.vy;
    // ... collision detection with walls/paddles
  }
};
```

**Completion Criteria**:
- [ ] Ball physics logic moved from main.js to logic.js
- [ ] main.js delegates ball updates to logic.js
- [ ] Game functionality remains unchanged
- [ ] No console errors related to ball physics

## Task 2: Create Configuration Module
**Goal**: Create lib/config.js to centralize game constants

**Context**: Game constants (speeds, sizes, colors) are currently hardcoded throughout lib files.

**Steps**:
1. Create lib/config.js with game constants
2. Identify hardcoded values in existing lib files
3. Replace hardcoded values with config references
4. Update modules to import/use config

**Files to create**:
- `/Users/syau/Documents/Warp/cyberpunk-pong/lib/config.js`

**Files to modify** (examples):
- `/Users/syau/Documents/Warp/cyberpunk-pong/lib/engine.js`
- `/Users/syau/Documents/Warp/cyberpunk-pong/lib/render.js`
- `/Users/syau/Documents/Warp/cyberpunk-pong/lib/logic.js`

**Code Examples**:
Create lib/config.js:
```javascript
// lib/config.js
NP.config = {
  // Game dimensions
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  
  // Paddle specs
  PADDLE_WIDTH: 10,
  PADDLE_HEIGHT: 80,
  PADDLE_SPEED: 5,
  
  // Ball specs
  BALL_SIZE: 10,
  BALL_SPEED_X: 4,
  BALL_SPEED_Y: 4,
  
  // Colors
  BACKGROUND_COLOR: '#000',
  PADDLE_COLOR: '#0ff',
  BALL_COLOR: '#ff0',
  
  // Gameplay
  WINNING_SCORE: 5,
  BALL_SPEED_INCREASE: 1.1
};
```

Replace hardcoded values in engine.js:
```javascript
// BEFORE
const paddleSpeed = 5;

// AFTER
const paddleSpeed = NP.config.PADDLE_SPEED;
```

**Completion Criteria**:
- [ ] lib/config.js created with game constants
- [ ] At least 5 hardcoded values replaced with config references
- [ ] All modules accessing config via NP.config
- [ ] Game functionality unchanged

## Task 3: Implement Basic State Management
**Goal**: Create lib/state.js to manage game state

**Context**: Game state (scores, player positions, ball state) is scattered across modules.

**Steps**:
1. Create lib/state.js with state management functions
2. Define initial state structure
3. Create getter/setter functions
4. Update one module to use state management (e.g., logic.js for scores)

**Files to create**:
- `/Users/syau/Documents/Warp/cyberpunk-pong/lib/state.js`

**Files to modify** (example):
- `/Users/syau/Documents/Warp/cyberpunk-pong/lib/logic.js`

**Code Examples**:
Create lib/state.js:
```javascript
// lib/state.js
NP.state = {
  // Initial state
  _state: {
    playerScore: 0,
    cpuScore: 0,
    ball: { x: 400, y: 300, vx: 4, vy: 4 },
    playerPaddle: { y: 260 },
    cpuPaddle: { y: 260 },
    gameState: 'menu' // menu, playing, paused, game over
  },
  
  // Getters
  get: function(key) {
    return this._state[key];
  },
  
  // Setters
  set: function(key, value) {
    this._state[key] = value;
    return this; // Allow chaining
  },
  
  // Reset to initial state
  reset: function() {
    this._state = {
      playerScore: 0,
      cpuScore: 0,
      ball: { x: 400, y: 300, vx: 4, vy: 4 },
      playerPaddle: { y: 260 },
      cpuPaddle: { y: 260 },
      gameState: 'menu'
    };
  }
};
```

Use in logic.js for scoring:
```javascript
// BEFORE
playerScore++;

// AFTER
NP.state.set('playerScore', NP.state.get('playerScore') + 1);
```

**Completion Criteria**:
- [ ] lib/state.js created with state management
- [ ] State includes score, ball position, paddle positions, game state
- [ ] At least one module uses state management
- [ ] Direct state variable access reduced

## Task 4: Add Power-up Spawning Logic
**Goal**: Implement basic power-up spawning in powerups.js

**Context**: powerups.js exists but needs spawning logic and integration.

**Steps**:
1. Add power-up spawning probability and timer to powerups.js
2. Implement power-up activation when ball collides with power-up
3. Create one simple power-up effect (e.g., temporary paddle enlargement)
4. Hook into game loop from logic.js or engine.js

**Files to modify**:
- `/Users/syau/Documents/Warp/cyberpunk-pong/lib/powerups.js`
- `/Users/syau/Documents/Warp/cyberpunk-pong/lib/logic.js` (for collision detection)

**Code Examples**:
Add to powerups.js:
```javascript
// In lib/powerups.js
NP.powerups = {
  // ... existing code
  
  activePowerups: [],
  spawnTimer: 0,
  spawnInterval: 300, // Frames between spawn attempts
  
  update: function() {
    // Update existing powerups
    this.activePowerups.forEach((p, index) => {
      p.timer--;
      if (p.timer <= 0) {
        this.removePowerup(p.type);
        this.activePowerups.splice(index, 1);
      }
    });
    
    // Spawn new powerups
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnInterval) {
      if (Math.random() < 0.1) { // 10% chance when timer hits
        this.spawnPowerup();
      }
      this.spawnTimer = 0;
    }
  },
  
  spawnPowerup: function() {
    const types = ['enlarge', 'speed', 'multi'];
    const type = types[Math.floor(Math.random() * types.length)];
    const powerup = {
      type: type,
      x: Math.random() * 600 + 100,
      y: Math.random() * 400 + 100,
      timer: 300 // 5 seconds at 60fps
    };
    this.activePowerups.push(powerup);
  },
  
  // ... existing methods
};
```

Add collision detection in logic.js:
```javascript
// In update function or collision