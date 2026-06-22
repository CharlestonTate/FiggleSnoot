// Common game mode configurations
const COMMON_DEATH_MESSAGES = [
                "Your journey ends here... for now.",
                "The stars did not align in your favor.",
                "You suddenly had the overwhelming urge to take a nap.",
                "Everything went dark. Probably not a good sign.",
                "Somewhere, a dog barked. It wasn't impressed.",
                "You felt a strange chill. Or maybe that was just failure.",
                "You have been... gently removed from existence.",
                "A mysterious force whispered, 'Maybe next time.'",
                "You blinked. The world did not blink back.",
                "A crow stole your last shred of dignity and flew off.",
                "You saw the game over screen approaching. It waved.",
                "You tripped, metaphorically and literally.",
                "Your luck stat finally caught up with you.",
                "A small child pointed and laughed. Somewhere.",
                "You became a cautionary tale for future players.",
                "A distant narrator shook their head in disappointment.",
                "You heard a faint voice say, 'Oof, that looked painful.'",
                "A frog nearby croaked. It sounded judgmental.",
                "Wait... you're Olivia?",
                "My Grandfather can do better than this.",
                "You were supposed to do gooder.",
                "You got cooked",
                "Wait... you're Olivia?",
                "Wait... you're Olivia?",
                "Wait... you're Olivia?"
            ];
            
const SUPER_RARE_MESSAGES = [
    { message: ".. .----. ...- . / .- .-.. .-- .- -.-- ... / .-. . .- .-.. .-.. -.-- / .-.. .. -.- . -.. / .... .- -. -. .- .... / -- .. -.-. ..- --..-- / -... ..- - / ... .... . .----. .-.. .-.. / -. . ...- . .-. / -.- -. --- .-- / - .... .- - .-.-.-", chance: 0.01 },
    { message: "Hey Goose!", chance: 0.02 },
    { message: "hey Possum!", chance: 0.02 },
    { message: "You're playing just like Grace VanHaaster.", chance: 0.02 }
];

// Base game mode class
class BaseGameMode {
    constructor(config) {
        this.name = config.name;
        this.description = config.description;
        this.initialTimer = config.initialTimer;
        this.mazeTimeout = config.mazeTimeout;
    }

    initialize(gameState) {
        gameState.timer = this.initialTimer;
        gameState.gridSize = 6 + (gameState.level % 5);
        gameState.isMazeVisible = true;
        gameState.showMazeTimeout = this.mazeTimeout;
        return gameState;
    }

    onLevelComplete(gameState) {
        gameState.level++;
        return gameState;
    }

    onDeath(gameState) {
        const random = Math.random();
        let deathMessage = null;

        // Check for super rare messages first
        for (const rareMessage of SUPER_RARE_MESSAGES) {
            if (random < rareMessage.chance) {
                deathMessage = rareMessage.message;
                break;
            }
        }

        // If no super rare message, pick a regular one
        if (!deathMessage) {
            deathMessage = COMMON_DEATH_MESSAGES[Math.floor(Math.random() * COMMON_DEATH_MESSAGES.length)];
        }

        return { deathMessage };
    }

    render(gameState) {
        return gameState;
    }   
}

// Time Attack Mode class
class TimeAttackMode extends BaseGameMode {
    constructor() {
        super({
            name: 'Time Attack!',
            description: 'Complete levels as fast as possible!',
            initialTimer: 20,
            mazeTimeout: 2000
        });
    }

    initialize(gameState) {
        const baseState = super.initialize(gameState);
        baseState.totalTime = 0; // Track total time across levels
        return baseState;
    }

    onLevelComplete(gameState) {
        gameState.totalTime += gameState.elapsedTime;
        return super.onLevelComplete(gameState);
    }
}

// Game Mode Manager
const GameModes = {
    // Base game mode configuration
    base: new BaseGameMode({
        name: 'Normal',
        description: 'Classic FiggleSnoot gameplay',
        initialTimer: 30,
        mazeTimeout: 3000
    }),

    // Time Attack Mode
    timeAttack: new TimeAttackMode(),

    // Blackout Mode
    blackout: new BaseGameMode({
        name: 'Blackout',
        description: 'Navigate in complete darkness!',
        initialTimer: 40,
        mazeTimeout: 3000
    })
};

// Game Mode Manager Functions
function initializeGameMode(mode, gameState) {
    return GameModes[mode].initialize(gameState);
}

function handleLevelComplete(mode, gameState) {
    return GameModes[mode].onLevelComplete(gameState);
}

function renderGameMode(mode, gameState) {
    return GameModes[mode].render(gameState);
}

export { GameModes, initializeGameMode, handleLevelComplete, renderGameMode }; 