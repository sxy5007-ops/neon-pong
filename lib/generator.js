/**
 * @module generator
 * @description Handles procedural generation of encounter parameters (Waves/Sectors).
 * This is the core brain for adding roguelike unpredictability to the arena.
 */

// --- Configuration Constants ---
const BASE_DIFFICULTY = 1.0;
const WAVE_SCORE_BONUS = 5; // Base score awarded per wave completion


/**
 * Generates a complete, structured configuration object for the next game wave.
 * @param {number} currentWave - The number of the wave being generated (e.g., 1, 2, 3...).
 * @returns {{waveId: number, difficultyMultiplier: number, hazards: Array<{type: string, magnitude: number}>, spawnPoints: Array<string>, powerupChance: number}}
 */
function generateNextWave(currentWave) {
    // 1. Calculate Difficulty Multiplier (Simple scaling for now)
    const difficultyMultiplier = Math.pow(1.1, currentWave - 1);

    // 2. Determine Hazards (Chaos element)
    let hazards = [];
    // Increase chance of hazard as the game progresses
    if (Math.random() < Math.min(0.4 + (currentWave * 0.03), 0.9)) {
        const availableHazards = [
            { type: "GravityShift", magnitude: -1, description: "Horizontal gravity shift applied.", chance: 0.3 }, // Negative sign implies inversion or change
            { type: "StickyZone", magnitude: 50, description: "Temporary sticky zones on the paddle side.", chance: 0.4 },
            { type: "SpeedBoost", magnitude: 1.2, description: "Ball speed increased by 20%.", chance: 0.3 }
        ];

        // Select a hazard based on weighted probability or simply pick one for V1
        const chosenHazard = availableHazards[Math.floor(Math.random() * availableHazards.length)];
        hazards.push({ type: chosenHazard.type, magnitude: chosenHazard.magnitude });
    }

    // 3. Determine Spawn Points (Randomization)
    let spawnPoints = [];
    const numSpawnPoints = Math.min(4, 2 + Math.floor(currentWave / 3)); // Max of 4 points, increasing slowly
    for (let i = 0; i < numSpawnPoints; i++) {
        // Simple random corner/side placement for now
        spawnPoints.push(`Corner_${Math.random().toString(36).substring(2, 5)}`);
    }

    // 4. Determine Powerup Chance (Replayability hook)
    let powerupChance = Math.min(0.6 + (currentWave * 0.02), 1.0); // Max 100% chance later
    
    return {
        waveId: currentWave,
        difficultyMultiplier: difficultyMultiplier,
        hazards: hazards,
        spawnPoints: spawnPoints,
        powerupChance: powerupChance,
        scoreBonus: WAVE_SCORE_BONUS + Math.floor(Math.random() * 5) // Slight score variation
    };
}

/**
 * Selects and returns a random powerup object based on the current difficulty.
 * @param {number} difficulty - The current difficulty multiplier (e.g., 1.2).
 * @returns {{id: string, effectFunction: Function, description: string}} A structured powerup definition.
 */
function generateRandomPowerup(difficulty) {
    // Weighted selection logic based on difficulty to increase risk/reward potential
    const available = [
        { id: "speed_boost", name: "Overcharge Core", baseEffect: (state) => ({ type: 'SpeedBoost', magnitude: 1.5, duration: 10 }), chanceMin: 0.3, riskFactor: 0.2 },
        { id: "energy_regen", name: "Bio-Circuit Repair", baseEffect: (state) => ({ type: 'EnergyRegen', magnitude: 0.1, duration: 15 }), chanceMin: 0.4, riskFactor: 0.0 }
    ];

    // Select based on difficulty weight
    let selectedPowerup;
    if (difficulty < 1.5) {
        selectedPowerup = available[Math.floor(Math.random() * 2)]; // Only reliable boosts early game
    } else {
        selectedPowerup = available[Math.floor(Math.random() * available.length)];
    }

    return {
        id: selectedPowerup.id,
        name: selectedPowerup.name,
        description: `Grants a powerful ${selectedPowerup.name} boost for 10 seconds.`,
        // We return the actual application function so the game loop can call it directly
        effectFunction: selectedPowerup.baseEffect // Pass the effect function itself
    };
}

/**
 * Utility to get a random float between min and max (exclusive of max).
 */
function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

export { generateNextWave, generateRandomPowerup };