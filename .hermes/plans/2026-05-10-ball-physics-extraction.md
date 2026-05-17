# Ball Physics Extraction Plan
Date: 2026-05-10

## Goal
Extract ball physics calculations from main.js into logic.js to improve separation of concerns. main.js should remain as a pure orchestrator/entry point, while logic.js handles all game logic.

## Context
- main.js currently contains game loop with direct ball physics calculations
- logic.js is the appropriate home for game physics and collision detection
- This extraction continues the modularization effort started with other lib/ files
- Smoke tests verify logic.js functionality, so this change should maintain test compatibility

## Files to Modify
1. `/Users/syau/Documents/Warp/cyberpunk-pong/main.js` - Remove ball physics, delegate to logic.js
2. `/Users/syau/Documents/Warp/cyberpunk-pong/lib/logic.js` - Add ball physics functions

## Detailed Steps

### Step 1: Analyze main.js for ball physics
**Location**: main.js, approximately lines 45-80 (in game loop)
**Current code to identify**:
```javascript
// Example of what to look for in main.js game loop:
function update() {
  // Ball movement
  ball.x += ball.vx;
  ball.y += ball.vy;
  
  // Wall collision
  if (ball.y - ball.radius < 0 || ball.y + ball.radius > NP.config.CANVAS_HEIGHT) {
    ball.vy = -ball.vy;
    // play sound, etc.
  }
  
  // Paddle collision
  // ... paddle collision logic
  
  // Scoring
  // ... scoring logic
}
```

### Step 2: Create ball physics functions in logic.js
**Location**: lib/logic.js, inside the NP.logic object
**Code to add**:
```javascript
// In lib/logic.js, within the NP.logic = { ... } object:
updateBall: function() {
  // Move ball
  ball.x += ball.vx;
  ball.y += ball.vy;
  
  // Top/bottom wall collision
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy = -ball.vy;
    NP.AudioEngine.playSound('wallHit');
  } else if (ball.y + ball.radius > NP.config.CANVAS_HEIGHT) {
    ball.y = NP.config.CANVAS_HEIGHT - ball.radius;
    ball.vy = -ball.vy;
    NP.AudioEngine.playSound('wallHit');
  }
  
  // Paddle collisions
  // Player paddle (left)
  if (ball.x - ball.radius < NP.config.PADDLE_WIDTH && 
      ball.y > paddles.player.y && 
      ball.y < paddles.player.y + NP.config.PADDLE_HEIGHT) {
    if (ball.x - ball.radius < NP.config.PADDLE_WIDTH) {
      ball.x = NP.config.PADDLE_WIDTH + ball.radius;
      ball.vx = -ball.vx;
      
      // Add spin based on where hit paddle
      const hitPos = (ball.y - (paddles.player.y + NP.config.PADDLE_HEIGHT/2)) / (NP.config.PADDLE_HEIGHT/2);
      ball.vy += hitPos * 2; // Adjust vertical velocity based on hit position
      
      // Increase speed slightly
      ball.vx *= NP.config.BALL_SPEED_INCREASE;
      ball.vy *= NP.config.BALL_SPEED_INCREASE;
      
      NP.AudioEngine.playSound('paddleHit');
    }
  }
  
  // CPU paddle (right)
  if (ball.x + ball.radius > NP.config.CANVAS_WIDTH - NP.config.PADDLE_WIDTH && 
      ball.y > paddles.cpu.y && 
      ball.y < paddles.cpu.y + NP.config.PADDLE_HEIGHT) {
    if (ball.x + ball.radius > NP.config.CANVAS_WIDTH - NP.config.PADDLE_WIDTH) {
      ball.x = NP.config.CANVAS_WIDTH - NP.config.PADDLE_WIDTH - ball.radius;
      ball.vx = -ball.vx;
      
      // Add spin based on where hit paddle
      const hitPos = (ball.y - (paddles.cpu.y + NP.config.PADDLE_HEIGHT/2)) / (NP.config.PADDLE_HEIGHT/2);
      ball.vy += hitPos * 2;
      
      // Increase speed slightly
      ball.vx *= NP.config.BALL_SPEED_INCREASE;
      ball.vy *= NP.config.BALL_SPEED_INCREASE;
      
      NP.AudioEngine.playSound('paddleHit');
    }
  }
  
  // Scoring
  if (ball.x < 0) {
    // CPU scores
    scores.cpu++;
    NP.AudioEngine.playSound('score');
    resetBall();
    return 'cpuScore';
  } else if (ball.x > NP.config.CANVAS_WIDTH) {
    // Player scores
    scores.player++;
    NP.AudioEngine.playSound('score');
    resetBall();
    return 'playerScore';
  }
  
  return null; // No score
},

resetBall: function() {
  ball.x = NP.config.CANVAS_WIDTH / 2;
  ball.y = NP.config.CANVAS_HEIGHT / 2;
  ball.vx = (Math.random() < 0.5 ? -1 : 1) * NP.config.BALL_SPEED_INITIAL;
  ball.vy = (Math.random() < 0.5 ? -1 : 1) * NP.config.BALL_SPEED_INITIAL;
}
```

### Step 3: Update main.js to delegate ball physics
**Location**: main.js, in the game loop
**Replace** direct ball physics code with:
```javascript
// In main.js game loop (around line 60-70, replace the physics section)
// BEFORE (example - remove this section):
// Ball movement and collision logic here

// AFTER:
let scoreResult = null;
if (NP.logic && typeof NP.logic.updateBall === 'function') {
  scoreResult = NP.logic.updateBall();
}

// Handle scoring if needed
if (scoreResult === 'playerScore') {
  // Update player score display
  const scoreP1El = document.getElementById('score-p1');
  if (scoreP1El) scoreP1El.textContent = scores.player;
} else if (scoreResult === 'cpuScore') {
  // Update CPU score display  
  const scoreP2El = document.getElementById('score-p2');
  if (scoreP2El) scoreP2El.textContent = scores.cpu;
}
```

### Step 4: Ensure proper variable access
Verify that logic.js can access the necessary variables:
- ball, paddles, scores objects should be accessible in logic.js scope
- These are likely already in the NP namespace from engine.js
- If not, they may need to be passed as parameters or accessed via NP.state

## Completion Criteria
✅ Ball physics (movement, wall collision, paddle collision, scoring) moved from main.js to logic.js
✅ main.js delegates ball updates to logic.js via NP.logic.updateBall()
✅ main.js remains focused on DOM event handling and orchestration
✅ Game functionality unchanged - ball behaves exactly as before
✅ No console errors related to missing functions or variables
✅ All existing smoke tests still pass

## Verification Steps
1. Open index.html in browser - game should start and play normally
2. Test ball movement, wall bounces, paddle collisions, scoring
3. Check browser console for any errors
4. Run smoke tests: `node