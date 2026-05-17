# Fix Smoke Test Failures for Power-up Collection and Drifting
Date: 2026-05-11

## Goal
Fix two specific smoke test failures:
1. Extra multiball balls should be able to collect power-ups
2. Power-ups should drift so they feel alive (have visible movement)

## Context
The smoke tests are failing because:
- In the multiball test, extra balls created by multiball power-up cannot collect power-ups
- In the power-up drifting test, power-ups don't have enough visible movement to feel "alive"

These are gameplay tuning issues rather than architectural problems.

## Files to Modify
1. `/Users/syau/Documents/Warp/cyberpunk-pong/lib/powerup.js` - Fix power-up collection logic and drifting behavior
2. `/Users/syau/Documents/Warp/cyberpunk-pong/lib/powerups.js` - Ensure utility functions work correctly with all balls

## Detailed Steps

### Step 1: Fix Power-up Collection for Multiball Balls
Currently, only the main ball (NP.ball or NP.balls.find(b => b.isMain)) can collect power-ups. We need to allow any active ball to collect power-ups.

**In lib/powerup.js, modify the updatePowerUps function around line 95:**

```javascript
// BEFORE:
var collector = NP.balls.find(function (b) {
  var dx = b.x - pu.x;
  var dy = b.y - pu.y;
  return (dx * dx + dy * dy) <= Math.pow(b.r + pu.size * 0.72, 2);
});

// AFTER:
var collector = NP.balls.find(function (b) {
  var dx = b.x - pu.x;
  var dy = b.y - pu.y;
  return (dx * dx + dy * dy) <= Math.pow(b.r + pu.size * 0.72, 2) && b.life > 0;
});
```

Also need to check if we're correctly identifying the "lastHitBy" for multiball scenarios. The power-up should be applied to whoever hit the ball that collected it.

### Step 2: Improve Power-up Drifting Behavior
Make power-ups have more noticeable drift movement to satisfy the "feels alive" requirement.

**In lib/powerup.js, modify the makePowerUp function around line 50-59:**

```javascript
// BEFORE:
var driftAngle = Math.random() * Math.PI * 2;
return {
  type: type.id, label: type.label, color: type.color,
  x: marginX + Math.random() * (NP.state.width - marginX * 2),
  y: 90 + Math.random() * Math.max(80, NP.state.height - 180),
  vx: Math.cos(driftAngle) * 22, vy: Math.sin(driftAngle) * 18,
  size: NP.config.POWER_UP_SIZE, spin: Math.random() * Math.PI,
  life: NP.config.POWER_UP_LIFE,
};

// AFTER:
// Increase drift speed and add some variation
var driftAngle = Math.random() * Math.PI * 2;
var driftSpeed = 35 + Math.random() * 25; // 35-60 px/sec instead of 22/18
return {
  type: type.id, label: type.label, color: type.color,
  x: marginX + Math.random() * (NP.state.width - marginX * 2),
  y: 90 + Math.random() * Math.max(80, NP.state.height - 180),
  vx: Math.cos(driftAngle) * driftSpeed, vy: Math.sin(driftAngle) * driftSpeed,
  size: NP.config.POWER_UP_SIZE, spin: Math.random() * Math.PI,
  life: NP.config.POWER_UP_LIFE,
};
```

### Step 3: Verify Power-up Collection Works for All Balls
Ensure that when we collect a power-up with any ball, we correctly identify which player last hit that ball.

**In lib/powerup.js, in the updatePowerUps function where applyPowerUp is called:**

```javascript
// BEFORE:
if (collector) { applyPowerUp(NP.lastHitBy, pu.type); return false; }

// We need to determine which player last hit the collecting ball
// For now, we can use NP.lastHitBy as it should be updated when balls hit paddles
// But let's make sure we're checking the right ball
if (collector) { 
  // Find which player last hit this specific ball
  var collectorOwner = 'p1'; // default
  // In a more sophisticated version, we'd track last hit per ball
  // For now, NP.lastHitBy should work as it's updated in reflectBallFor
  applyPowerUp(NP.lastHitBy, pu.type); 
  return false; 
}
```

### Step 4: Run Verification
After making changes, verify the fixes work.

## Completion Criteria
✅ Extra balls (from multiball) can collect power-ups
✅ Power-ups have visible drift movement that makes them feel "alive"
✅ All JavaScript files pass syntax check (`node -c lib/*.js`)
✅ Smoke tests pass for the two failing tests
✅ Core gameplay remains unaffected

## Verification Steps
1. Run syntax check on all lib/ files: `node -c lib/*.js`
2. Run smoke tests: `node tools/smoke-test.js`
3. Verify that the two previously failing tests now pass
4. Manually test in browser: start a game, get multiball, verify extra balls can collect power-ups
5. Observe power-up movement to confirm visible drifting

## Estimated Effort
- 1-2 subagent tasks for implementation and verification

## Notes
These are targeted fixes for specific test failures. The overall modularization architecture is sound; we're just tuning gameplay parameters and fixing edge cases.