# 🌃 Neon Pong (Cyberpunk Edition)

A browser-based Pong game with a heavy cyberpunk aesthetic, featuring procedural elements like dynamic music, powerup systems, and adaptive AI opponent logic. The current engine is highly modularized into dedicated modules for maximum scalability and testability.

## ✨ Key Features Implemented
*   **Modular Architecture:** Core concerns are separated into distinct IIFE modules (`lib/game_state`, `lib/engine`, etc.).
*   **Procedural Audio:** The audio system dynamically adjusts music tempo and sound effects based on the active game state (e.g., 'Turbo' increases BPM, 'Slow Field' darkens tones).
*   **State-Driven Powerups:** Powerup collection applies structured modifiers (`ModifierInstruction[]`) to a global `NP.activeEffects` map in `lib/engine.js`.
*   **Decay System:** All active effects (e.g., speed boosts, slow fields) now have a visible duration and decay naturally via `Engine.decayEffects(dt)` every frame.
*   **Advanced AI Logic:** The opponent (`p2`) utilizes predictive movement based on the ball's projected path, factoring in difficulty levels ('easy', 'normal', 'hard').
*   **Game Flow Management:** A dedicated state manager handles screen transitions (Menu $\rightarrow$ Playing $\rightarrow$ Paused $\rightarrow$ Game Over) and score persistence.

## ⚙️ Architecture Overview (The 5 Pillars)

| Module | File | Responsibility | Key API/Function |
| :--- | :--- | :--- | :--- |
| **State Manager** | `lib/game_state.js` | Single source of truth for score, match state, and active effects map (`NP.activeEffects`). | `initializeGame()`, `getScores()` |
| **Engine Core** | `lib/engine.js` | Physics simulation, collision resolution (paddle/wall), powerup detection, global state decay. | `gameLoopUpdate(dt)`, `decayEffects(dt)` |
| **Content Generator** | `lib/generator.js` | Procedural content generation: determining wave difficulty and spawning random powerups based on progress. | `generateNextWave()` |
| **Game Logic** | `lib/logic.js` | Input handling (keyboard, touch), AI opponent movement calculations, physics utility wrappers (`getPaddleSpeed`, etc.). | `updateAI(dt)`, `updateInput(dt)` |
| **Audio/Visuals** | `lib/audio.js` & `lib/render.js` | Responsible for all user feedback. Audio reacts to state changes; Render draws active effects (glow circles, callouts). | `startMusic()`, `drawActiveEffects()` |

## 🕹️ Gameplay Loop (How It Runs)

The game flow is dictated by the `main.js` orchestrator running the main loop:

1.  **Initialization:** Game loads and initializes modules.
2.  **Content Check:** `Generator` determines if a new wave/powerup should be spawned based on wins.
3.  **State Setup (Pre-Match):** If a powerup is found, its effect function runs to populate the initial state in `NP.activeEffects`.
4.  **Game Loop Cycle (Every Frame):**
    a. **Decay:** `Engine.decayEffects(dt)` runs first, reducing all modifier durations and triggering cleanup/audio cues for expired effects.
    b. **Input & AI:** `logic.js` updates paddle positions based on input and calculated opponent behavior, respecting current state modifiers.
    c. **Physics:** `engine.js` calculates ball movement, checks collisions, applies physics boosts (Turbo, Mega), and calls audio/particle events upon impact.
    d. **Render:** `render.js` draws the scene, visualizing all active states (glows, particles).

## 🛠️ Development & Testing Notes
*   **Development Best Practice:** Always treat the modules as black boxes connected only by their standardized APIs (`NP.activeEffects`, `NP.gameStateManager`).
*   **Testing:** The smoke test suite is functional and validates the critical API contracts between the core physics, state decay, and collision detection systems.

---