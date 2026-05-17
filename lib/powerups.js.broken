/**
 * @module powerups
 * @description Defines and manages all temporary, chaotic powerup effects. 
 * These powers modify the game state constants (speed, score rules) for a limited time.
 */

// =============================================
// 1. CORE POWERUP DEFINITIONS
// Each effect object defines how it alters physics/scoring when active.
// =============================================

/** @typedef {{id: string, name: string, description: string, duration: number}} PowerupMetadata */


export const Powerups = {
    // --- Boosts (Good) ---
    SPEED_OVERCHARGE: {
        metadata: { id: "speed_boost", name: "Overcharge Core", description: "Temporarily boosts all speeds and scores. HIGH RISK.", duration: 10 },
        // Effect function: Takes the current state and returns a modifier object/function to apply.
        applyEffect: (gameState) => ({ 
            type: 'SpeedBoost', 
            magnitude: 1.5, // Multiplier for speed
            duration: 10, 
            riskFactor: 0.2 // High risk = high potential reward
        }),
    },
    ENERGY_REGEN: {
        metadata: { id: "energy_regen", name: "Bio-Circuit Repair", description: "Restores energy/resources slowly over time.", duration: 15 },
        applyEffect: (gameState) => ({ 
            type: 'EnergyRegen', 
            magnitude: 0.1, // Small constant regen rate
            duration: 15,
            riskFactor: 0.0
        }),
    },
     // --- Chaos/Risks (Bad) ---
    SLOW_ADHERENCE: {
        metadata: { id: "slow_adherence", name: "Adhesion Field", description: "Paddle control is sticky and slow for a short time.", duration: 8 },
        applyEffect: (gameState) => ({ 
            type: 'ControlSlowdown', 
            magnitude: 0.5, // Speed multiplier applied to input handling
            duration: 8, 
            riskFactor: 0.1
        }),
    },
    VISUAL_DISRUPTION: {
        metadata: { id: "visual_disruption", name: "Blind Spot", description: "Temporarily obscures a portion of the arena for all participants.", duration: 5 },
        applyEffect: (gameState) => ({ 
            type: 'VisualObscure', 
            magnitude: 1, // Placeholder magnitude
            duration: 5, 
            riskFactor: 0.3
        }),
    }
};

/**
 * Selects and returns a random powerup object based on the current difficulty.
 * @param {number} difficulty - The current multiplier of the game (e.g., 1.2).
 * @returns {{id: string, effect: Function, description: string}} A structured powerup definition.
 */
export function generateRandomPowerup(difficulty) {
    // Weighted selection logic based on difficulty to increase risk/reward potential
    const allKeys = Object.keys(Powerups);
    let keysToConsider;

    if (difficulty < 1.5) {
        // Early game: More reliable, less chaotic boosts
        keysToConsider = ['ENERGY_REGEN', 'SPEED_OVERCHARGE'];
    } else if (difficulty > 3.0) {
         // Late game: Higher chance of risky/chaotic powerups
        keysToConsider = allKeys; // Consider all
    } else {
        keysToConsider = allKeys;
    }

    const key = keysToConsider[Math.floor(Math.random() * len(keysToConsider))];
    const selectedPowerup = Powerups[key];

    return {
        id: selectedPowerup.metadata.id,
        name: selectedPowerup.metadata.name,
        description: selectedPowerup.metadata.description,
        // We return the actual application function so the game loop can call it directly
        effectFunction: selectedPowerup.applyEffect 
    };
}

/**
 * Utility to get a random float between min and max (exclusive of max).
 */
function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}