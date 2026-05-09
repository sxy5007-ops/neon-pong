# Phase 5: Moving Audio/SFX Functions to audio.js

## Objective
Move the AudioEngine implementation from game.js to lib/audio.js to complete the audio module and further decouple game logic from implementation details.

## Background
- lib/audio.js already contains a basic AudioEngine implementation
- game.js contains a duplicate, more complete AudioEngine implementation
- The goal is to consolidate audio functionality in lib/audio.js and remove the duplicate from game.js
- Both files use the NP namespace pattern

## Current State Comparison

### lib/audio.js (existing):
- Has basic structure with NP.AudioEngine export
- Missing some functionality compared to game.js version
- Uses older variable declaration style (var)

### game.js (to be moved):
- Contains complete AudioEngine IIFE
- Has all the synthwave procedural audio and SFX functions
- Uses modern const/let declarations
- Returns the AudioEngine object directly

## Plan

### 1. Analyze Differences
Compare what's in lib/audio.js vs the AudioEngine in game.js to understand what needs to be merged.

### 2. Update lib/audio.js
Replace the content of lib/audio.js with the complete AudioEngine implementation from game.js, adapting it to:
- Use the existing NP namespace pattern in lib/audio.js
- Maintain compatibility with main.js which expects NP.AudioEngine
- Keep the JSDoc header and structure

### 3. Remove AudioEngine from game.js
Delete the entire AudioEngine IIFE from game.js (approximately lines 236-377).

### 4. Update References
Ensure all references to AudioEngine functions in game.js use the NP namespace:
- AudioEngine.init() → NP.AudioEngine.init()
- AudioEngine.setMute() → NP.AudioEngine.setMute()
- etc.

### 5. Verify Dependencies
Check that the audio.js implementation properly references:
- NP.state for muted state
- NP.ui for mute button references
- Other NP properties as needed

## Expected Files After Phase 5

### lib/audio.js:
- Complete AudioEngine implementation
- All synthwave procedural audio and SFX functions
- Properly exported as NP.AudioEngine

### game.js:
- AudioEngine section removed
- All audio function calls updated to use NP.AudioEngine.*
- Significant reduction in file size
- Focused on game state, saving, and coordination

## Verification Steps
1. Check that lib/audio.js contains complete audio implementation
2. Verify game.js no longer contains AudioEngine IIFE
3. Confirm all audio calls use NP.AudioEngine namespace
4. Run JavaScript syntax check on both files
5. Validate that the NP namespace is properly populated

## Estimated Effort
- 1-2 hours for implementation and testing