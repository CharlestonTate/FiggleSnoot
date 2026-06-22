// DOM Elements
const titleScreen = document.getElementById("title-screen");
const playButton = document.getElementById("play-button");
const gameScreen = document.getElementById("game-screen");
const gameOverScreen = document.getElementById("game-over-screen");
const restartButton = document.getElementById("restart-button");
const mazeContainer = document.getElementById("maze");
const timerElement = document.getElementById("timer-value");
const levelElement = document.getElementById("level-value");
const mobileControls = document.getElementById("mobile-controls");
const menuScreen = document.getElementById('menu-screen');
const gameModeScreen = document.getElementById('game-mode-screen');
const menuButtons = document.querySelectorAll('#menu-screen .menu-button');
const gameModeButtons = document.querySelectorAll('#game-mode-screen .menu-button');

// Global Hammer.js instance
let hammer = null;

// Key state tracking
window.pressedKeys = {};

// Add key state tracking event listeners
document.addEventListener('keydown', (event) => {
  window.pressedKeys[event.key] = true;
});

document.addEventListener('keyup', (event) => {
  window.pressedKeys[event.key] = false;
});

// Game Variables
let isGameOver = false;
let gridSize = 7;
let level = 1;
let startTime = null;
let elapsedTime = 0;
let timerRunning = false;
let playerPosition = { x: 0, y: 0 };
let goalPosition = {};
let obstacles = [];
let gameInterval;
let showMazeTimeout;
let isMazeVisible = true;
let currentGameMode = 'normal';
let remainingTime = 5; // Changed from 10 to 5 seconds
let isTimeAttackMode = false;

// Menu navigation
let currentMenuIndex = 0;
let currentGameModeIndex = 0;

// Add death screen navigation variables
let currentDeathButtonIndex = 0;
const deathButtons = [restartButton, document.getElementById('menu-button')];

// Add sound effects for menu navigation
const cycleUpSound = new Audio('sounds/CYCLE1.mp3');
const cycleDownSound = new Audio('sounds/CYCLE2.mp3');
const selectSound = new Audio('sounds/YES.mp3');
const deathSound = new Audio('sounds/CLAP1.mp3');
const levelCompleteSound = new Audio('sounds/CLICK1.mp3');
const warfSound = new Audio('sounds/WARF.mp3');
const patterSound = new Audio('sounds/PATTER.mp3');
const pitterSound = new Audio('sounds/PITTER.mp3');
const dungSound = new Audio('sounds/DUNG.mp3');
const warpSound = new Audio('sounds/WARPWARP.mp3');
const jazzSound = new Audio('sounds/JAZZSTUFF.mp3');
const birthdaySound = new Audio('sounds/BIRTHDAY.mp3');
const missionCompleteSound = new Audio('sounds/MISSIONCOMPREET.mp3');

// Online background music for global leaderboard
const onlineSound1 = new Audio('onlinesounds/january2016online3.mp3');
const onlineSound2 = new Audio('onlinesounds/july2014online2.mp3');
const onlineSound3 = new Audio('onlinesounds/sep2015online1.mp3');
const onlineSounds = [onlineSound1, onlineSound2, onlineSound3];

// Configure online sounds
onlineSounds.forEach(sound => {
  sound.loop = true;
  sound.volume = 0;
});
birthdaySound.loop = true; // Make birthday music loop continuously
jazzSound.loop = true; // Make jazz music loop continuously
let nextSound = cycleUpSound; // Track which sound to play next
let nextMovementSound = patterSound; // Track which movement sound to play next

// Add settings variables
let soundEnabled = true;
let walkingSoundEnabled = false;
let catModeEnabled = false;
let jazzEnabled = false; // Jazz is disabled by default
let swipeEnabled = false; // Swipe controls are disabled by default

// Add settings screen elements
const settingsScreen = document.getElementById('settings-screen');
const soundToggle = document.getElementById('sound-toggle');
const walkingSoundToggle = document.getElementById('walking-sound-toggle');
const catToggle = document.getElementById('cat-toggle');
const jazzToggle = document.getElementById('jazz-toggle');
const swipeToggle = document.getElementById('swipe-toggle');
const settingsBackButton = document.getElementById('settings-back-button');

// Set initial states of toggles
walkingSoundToggle.checked = walkingSoundEnabled;
jazzToggle.checked = jazzEnabled;
swipeToggle.checked = swipeEnabled;

// Add title interaction variables
let titleState = {
  figgle: 'FIGGLE',
  snoot: 'SNOOT'
};

// Add title screen click handlers
document.addEventListener('DOMContentLoaded', () => {
  // Load settings when the game starts
  loadSettings();
  
  const titleText = document.querySelector('#title-screen h1');
  
  // Split the title into FIGGLE and SNOOT
  titleText.innerHTML = '<span class="figgle">FIGGLE</span><span class="snoot">SNOOT</span>';
  
  // Add click handlers
  titleText.querySelector('.figgle').addEventListener('click', () => {
    playSound(warpSound);
    titleState.figgle = titleState.figgle === 'FIGGLE' ? 'FOGGLER' : 'FIGGLE';
    titleText.querySelector('.figgle').textContent = titleState.figgle;
  });
  
  titleText.querySelector('.snoot').addEventListener('click', () => {
    playSound(warpSound);
    titleState.snoot = titleState.snoot === 'SNOOT' ? 'SNITCH' : 'SNOOT';
    titleText.querySelector('.snoot').textContent = titleState.snoot;
  });
});

// Start Game
playButton.addEventListener("click", () => {
  playSound(selectSound);
  titleScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
  currentMenuIndex = 0;
  updateMenuSelection();
});
restartButton.addEventListener("click", () => {
  gameOverScreen.classList.add('hidden');
  startGame(); // This will restart the current game mode
});

timerElement.textContent = timer;
levelElement.textContent = level;

// Add at the top with other sound effects
const dyingSound = new Audio('sounds/BADWIGGLE.mp3');

// Add at the top with other game variables
let isDeathAnimationPlaying = false;

// Console state
let consoleVisible = false;
let gameConsole = null;

function toggleConsole() {
    const consoleContainer = document.getElementById('console-container');
    consoleContainer.style.display = consoleVisible ? 'none' : 'block';
    
    if (!consoleVisible && !gameConsole) {
        gameConsole = new GameConsole();
        gameConsole.init();
    }
    
    consoleVisible = !consoleVisible;
}

// Add event listener for console toggle
document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !consoleVisible) {
        event.preventDefault();
        toggleConsole();
    } else if (event.key === 'Escape' && consoleVisible) {
        event.preventDefault();
        toggleConsole();
    }
});

function startGame() {
  isGameOver = false;
  level = 1;
  elapsedTime = 0;
  timerRunning = false;
  remainingTime = 5;
  
  if (gameInterval) clearInterval(gameInterval);
  if (showMazeTimeout) clearTimeout(showMazeTimeout);

  titleScreen.classList.add("hidden");
  menuScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  // Ensure controls are properly set up
  updateControlsVisibility();

  const gameState = {
    level: 1, // Ensure level is 1 in gameState
    elapsedTime,
    timerRunning,
    isMazeVisible,
    showMazeTimeout,
    gridSize,
    playerPosition,
    goalPosition,
    obstacles
  };

  const initializedState = initializeGameMode(currentGameMode, gameState);
  
  level = initializedState.level || 1; // Ensure level is at least 1
  elapsedTime = initializedState.elapsedTime;
  timerRunning = initializedState.timerRunning;
  isMazeVisible = initializedState.isMazeVisible;
  showMazeTimeout = initializedState.showMazeTimeout;
  gridSize = initializedState.gridSize;
  playerPosition = initializedState.playerPosition;
  goalPosition = initializedState.goalPosition;
  obstacles = initializedState.obstacles;

  initializeLevel();
}

function initializeLevel() {
  if (currentGameMode === 'timeAttack') {
    timer = remainingTime; // Use remaining time for time attack mode
    isTimeAttackMode = true;
  } else {
    timer = 30;
    isTimeAttackMode = false;
  }

  // Grid increases every 5 levels and resets every 5-level cycle
  gridSize = 6 + (level % 5);

  playerPosition = { x: 0, y: 0 };

  const path = generatePath(gridSize);
  goalPosition = placeGoalNearPath(path);
  obstacles = generateMaze(gridSize, path, goalPosition);
  isMazeVisible = true;

  // Clear any held-down key states
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 's', 'S', 'a', 'A', 'd', 'D'];
  keys.forEach(key => {
    if (window.pressedKeys) {
      window.pressedKeys[key] = false;
    }
  });

  renderMaze();
  updateHUD();

  if (showMazeTimeout) clearTimeout(showMazeTimeout);

  showMazeTimeout = setTimeout(() => {
    isMazeVisible = false;
    renderMaze();
    startTimer();
  }, 3000);
}

function placeGoalNearPath(path) {
  const minDistance = Math.floor(gridSize / 2); // Ensure goal is at least halfway across the grid
  
  // Calculate distance from (0,0) and filter farthest options
  const farPathCells = path.filter(pos => Math.abs(pos.x) + Math.abs(pos.y) >= minDistance);

  // Pick a random far-away position if available, otherwise default to the last path cell
  return farPathCells.length > 0 ? farPathCells[Math.floor(Math.random() * farPathCells.length)] : path[path.length - 1];
}

function generateMaze(size, path, goal) {
  const obstacles = [];

  // Increase obstacle density every 5 levels (capped at 0.5)
  let obstacleChance = Math.min(0.2 + Math.floor(level / 5) * 0.15, 0.5);

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (!path.some((pos) => pos.x === x && pos.y === y) && !(x === goal.x && y === goal.y)) {
        if (Math.random() < obstacleChance) {
          obstacles.push({ x, y });
        }
      }
    }
  }
  return obstacles;
}

function generatePath(size) {
  const path = [{ x: 0, y: 0 }];
  let x = 0, y = 0;
  while (x < size - 1 || y < size - 1) {
    if (x < size - 1 && Math.random() > 0.5) x++;
    else if (y < size - 1) y++;
    path.push({ x, y });
  }
  return path;
}

function getRandomGoalPosition() {
  let valid = false;
  let pos;
  while (!valid) {
    pos = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
    if (!obstacles.some((o) => o.x === pos.x && o.y === pos.y) && !(pos.x === 0 && pos.y === 0)) {
      valid = true;
    }
  }
  return pos;
}

function renderMaze() {
  mazeContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  mazeContainer.innerHTML = "";
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");

      // In blackout mode, make only the player and goal blocks black
      if (currentGameMode === 'blackout') {
        if (x === playerPosition.x && y === playerPosition.y) {
          cell.classList.add("player");
          if (catModeEnabled) cell.classList.add("cat-mode");
          cell.style.backgroundColor = '#000';
        } else if (x === goalPosition.x && y === goalPosition.y) {
          cell.classList.add("goal");
          cell.style.backgroundColor = '#000';
        } else if (isMazeVisible && obstacles.some((o) => o.x === x && o.y === y)) {
          cell.classList.add("obstacle");
          cell.style.backgroundColor = '#000';
        }
      } else {
        if (isMazeVisible || (x === playerPosition.x && y === playerPosition.y) || (x === goalPosition.x && y === goalPosition.y)) {
          if (x === playerPosition.x && y === playerPosition.y) {
            cell.classList.add("player");
            if (catModeEnabled) cell.classList.add("cat-mode");
          } 
          if (x === goalPosition.x && y === goalPosition.y) {
            cell.classList.add("goal"); 
          } 
          if (isMazeVisible && obstacles.some((o) => o.x === x && o.y === y)) {
            cell.classList.add("obstacle");
          }
        }
      }
      mazeContainer.appendChild(cell);
    }
  }
}

function movePlayer(dx, dy) {
  if (isGameOver || isDeathAnimationPlaying) return;

  const newX = playerPosition.x + dx;
  const newY = playerPosition.y + dy;

  if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
    if (!obstacles.some((o) => o.x === newX && o.y === newY)) {
      playerPosition = { x: newX, y: newY };
      isMazeVisible = false;
      renderMaze();

      if (walkingSoundEnabled) {
        playWalkingSound(nextMovementSound);
        nextMovementSound = nextMovementSound === patterSound ? pitterSound : patterSound;
      }

      if (!timerRunning) {
        startTimer();
      }

      checkWin();
    } else {
      if (isTimeAttackMode) {
        // Apply time penalty for hitting obstacles in time attack mode
        remainingTime = Math.max(0, remainingTime - 2);
        timer = remainingTime;
        startTime = performance.now();
        showTimeChangePopup(2, false);
        if (remainingTime <= 0) {
          handleObstacleCollision(newX, newY);
          return;
        }
        // Find the specific obstacle that was hit
        const hitObstacle = obstacles.find(o => o.x === newX && o.y === newY);
        if (hitObstacle) {
          // Temporarily show only the hit obstacle
          const cell = mazeContainer.children[newY * gridSize + newX];
          if (cell) {
            cell.classList.add('obstacle');
            setTimeout(() => {
              cell.classList.remove('obstacle');
            }, 1000);
          }
        }
      } else {
        handleObstacleCollision(newX, newY);
      }
    }
  }
}

// Add new function for handling obstacle collision
function handleObstacleCollision(newX, newY) {
  // Play death sound
  playSound(dyingSound);

  // Show hit obstacle
  const cell = mazeContainer.children[newY * gridSize + newX];
  if (cell) {
    cell.classList.add('hit-obstacle');

    // Add screen shake effect
    gameScreen.classList.add('screen-shake');

    // Skip death animation in time attack mode
    if (currentGameMode !== 'timeAttack') {
      // Add death particles to player cell
      const playerCell = mazeContainer.children[playerPosition.y * gridSize + playerPosition.x];
      if (playerCell) {
        playerCell.classList.add('death-animation');

        // Create particles with physics-like movement
        const numParticles = 15;
        const baseRadius = 70;
        
        for (let i = 0; i < numParticles; i++) {
          const particle = document.createElement('div');
          particle.classList.add('death-particle');

          // Calculate base angle
          const baseAngle = (i / numParticles) * Math.PI * 2;
          
          // Add randomness to the angle for more natural spread
          const angleVariation = (Math.random() - 0.5) * 0.5;
          const finalAngle = baseAngle + angleVariation;
          
          // Calculate distance with randomness
          const distanceVariation = 0.7 + Math.random() * 0.6;
          const radius = baseRadius * distanceVariation;
          
          // Calculate trajectory with physics-like behavior
          const tx = Math.cos(finalAngle) * radius;
          const ty = Math.sin(finalAngle) * radius;
          
          // Add more dynamic rotation
          const rotation = (i / numParticles) * 360 + Math.random() * 180;

          // Set CSS variables
          particle.style.setProperty('--tx', `${tx}px`);
          particle.style.setProperty('--ty', `${ty}px`);
          particle.style.setProperty('--rotation', `${rotation}deg`);
          particle.style.animationDelay = `${(i / numParticles) * 0.1}s`;

          playerCell.appendChild(particle);
        }

        // Prevent movement during animation
        isDeathAnimationPlaying = true;

        // Clean up and end game after animation
        setTimeout(() => {
          // Remove particles
          const particles = playerCell.querySelectorAll('.death-particle');
          particles.forEach(p => p.remove());
          
          // Remove animation classes
          playerCell.classList.remove('death-animation');
          cell.classList.remove('hit-obstacle');
          gameScreen.classList.remove('screen-shake');
          
          isDeathAnimationPlaying = false;
          endGame();
        }, 900); // Match animation duration
      }
    } else {
      // In time attack mode, end game after shake
      setTimeout(() => {
        cell.classList.remove('hit-obstacle');
        gameScreen.classList.remove('screen-shake');
        endGame();
      }, 500); // Shorter duration for time attack mode
    }
  }
}

function checkWin() {
  if (playerPosition.x === goalPosition.x && playerPosition.y === goalPosition.y) {
    stopTimer();
    
    let seconds = Math.floor(elapsedTime / 1000);
    let milliseconds = Math.floor((elapsedTime % 1000) / 10);
    
    // Play the click sound
    playSound(levelCompleteSound);
    
    showTimePopup(`${seconds}.${milliseconds.toString().padStart(2, '0')}s`);

    if (isTimeAttackMode) {
      remainingTime = Math.min(20, remainingTime + 2);
      timer = remainingTime;
      showTimeChangePopup(2, true);
    }

    const gameState = {
      level,
      elapsedTime,
      timerRunning,
      isMazeVisible,
      showMazeTimeout,
      gridSize,
      playerPosition,
      goalPosition,
      obstacles
    };

    const updatedState = handleLevelComplete(currentGameMode, gameState);
    level = updatedState.level;
    elapsedTime = updatedState.elapsedTime;
    timerRunning = updatedState.timerRunning;
    isMazeVisible = updatedState.isMazeVisible;
    showMazeTimeout = updatedState.showMazeTimeout;
    gridSize = updatedState.gridSize;
    playerPosition = updatedState.playerPosition;
    goalPosition = updatedState.goalPosition;
    obstacles = updatedState.obstacles;

    initializeLevel();
  }
}

function stopTimer() {
  clearInterval(gameInterval);
  timerRunning = false;
}

function showTimePopup(time) {
  let popup = document.createElement("div");
  popup.classList.add("time-popup");
  popup.textContent = `Level Time: ${time}`;
  
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => popup.remove(), 500); // Remove after fade-out
  }, 2000);
}

function startTimer() {
  if (timerRunning) return;

  startTime = performance.now();
  timerRunning = true;

  gameInterval = setInterval(() => {
    if (isTimeAttackMode) {
      // Update remaining time for time attack mode
      const currentTime = performance.now();
      const timePassed = (currentTime - startTime) / 1000;
      remainingTime = Math.max(0, timer - timePassed);
      
      if (remainingTime <= 0) {
        endGame();
        return;
      }
      // Update the timer display immediately
      timerElement.textContent = remainingTime.toFixed(1);
    } else {
      elapsedTime = performance.now() - startTime;
      let seconds = Math.floor(elapsedTime / 1000);
      let milliseconds = Math.floor((elapsedTime % 1000) / 10);
      timerElement.textContent = `${seconds}.${milliseconds.toString().padStart(2, '0')}`;
    }
  }, 10);
}

function updateHUD() {
  if (isTimeAttackMode) {
    // Display remaining time for time attack mode with one decimal place
    timerElement.textContent = remainingTime.toFixed(1);
  } else {
    let seconds = Math.floor(elapsedTime / 1000);
    let milliseconds = Math.floor((elapsedTime % 1000) / 10);
    timerElement.textContent = `${seconds}.${milliseconds.toString().padStart(2, '0')}`;
  }
  levelElement.textContent = level;
}

function endGame() {
  if (isGameOver) return; // Prevent multiple calls to endGame()
  
  isGameOver = true;
  clearTimeout(showMazeTimeout);
  clearInterval(gameInterval);

  // Play death sound
  playSound(deathSound);

  // Save score to localStorage with level information
  const scores = JSON.parse(localStorage.getItem('figglesnoot_scores') || '[]');
  scores.push({
    mode: currentGameMode,
    level: level || 1, // Ensure level is at least 1
    time: isTimeAttackMode ? remainingTime : elapsedTime,
    date: new Date().toISOString()
  });
  localStorage.setItem('figglesnoot_scores', JSON.stringify(scores));

  // Handle death based on game mode
  const gameState = {
    level: level || 1, // Ensure level is at least 1
    elapsedTime,
    timerRunning,
    isMazeVisible,
    showMazeTimeout,
    gridSize,
    playerPosition,
    goalPosition,
    obstacles
  };

  handleDeath(currentGameMode, gameState);

  // Show game over screen
  gameScreen.classList.add("hidden");
  gameOverScreen.classList.remove("hidden");
}

function restartGame() {
  isGameOver = false; // Reset the game over flag
  level = 1; // Reset level when restarting
  startGame();
}

function isMobile() {
  return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
}

// Remove duplicate listeners and ensure only one handler is used
document.querySelectorAll("#mobile-controls button").forEach(button => {
  button.removeEventListener("pointerdown", handleMove); // Remove previous listener if exists
  button.addEventListener("pointerdown", handleMove);
});

function handleMove(e) {
  if (isGameOver) return; // Prevent movement if the game is over

  e.preventDefault(); // Prevent zooming & unintended behaviors

  const id = e.target.id;
  if (id === "up") movePlayer(0, -1);
  if (id === "down") movePlayer(0, 1);
  if (id === "left") movePlayer(-1, 0);
  if (id === "right") movePlayer(1, 0);
}

// Initialize Hammer.js
document.addEventListener('DOMContentLoaded', () => {
  const gameContainer = document.getElementById('game-screen');
  if (!gameContainer) return;

  // Initialize Hammer with all options
  hammer = new Hammer(gameContainer, {
    touchAction: 'none',
    cssProps: {
      userSelect: 'none',
    },
    recognizers: [[Hammer.Swipe, { direction: Hammer.DIRECTION_ALL }]]
  });

  // Configure Hammer
  const swipe = hammer.get('swipe');
  swipe.set({
    direction: Hammer.DIRECTION_ALL,
    enable: false, // Start disabled
    threshold: 5,
    velocity: 0.3
  });

  // Handle swipe events
  hammer.on('swipe', (event) => {
    if (isGameOver || gameScreen.classList.contains('hidden') || !swipeEnabled) return;

    const velocity = Math.abs(event.velocity);
    const angle = event.angle;

    if (velocity < 0.3) return;

    // Determine swipe direction based on angle
    if (angle >= -45 && angle < 45) {
      movePlayer(1, 0);
    } else if (angle >= 45 && angle < 135) {
      movePlayer(0, 1);
    } else if (angle >= 135 || angle < -135) {
      movePlayer(-1, 0);
    } else if (angle >= -135 && angle < -45) {
      movePlayer(0, -1);
    }
  });

  // Add touch event handler to prevent scrolling
  gameContainer.addEventListener('touchmove', (e) => {
    if (!gameScreen.classList.contains('hidden') && swipeEnabled) {
      e.preventDefault();
    }
  }, { passive: false });
});

function updateMenuSelection() {
  menuButtons.forEach((button, index) => {
    button.classList.toggle('selected', index === currentMenuIndex);
  });
}

function playNextSound() {
  playSound(nextSound);
  nextSound = nextSound === cycleUpSound ? cycleDownSound : cycleUpSound;
}

function handleMenuScreenNavigation(event) {
  switch(event.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      event.preventDefault();
      currentMenuIndex = (currentMenuIndex - 1 + menuButtons.length) % menuButtons.length;
      updateMenuSelection();
      playNextSound();
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      event.preventDefault();
      currentMenuIndex = (currentMenuIndex + 1) % menuButtons.length;
      updateMenuSelection();
      playNextSound();
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (currentMenuIndex === 0) {
        playSound(warfSound);
      } else if (currentMenuIndex === menuButtons.length - 1) {
        playSound(dungSound);
      } else {
        playSound(selectSound);
      }
      menuButtons[currentMenuIndex].click();
      break;
  }
}

function handleGameModeScreenNavigation(event) {
  switch(event.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      event.preventDefault();
      currentGameModeIndex = (currentGameModeIndex - 1 + gameModeButtons.length) % gameModeButtons.length;
      updateGameModeSelection();
      playNextSound();
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      event.preventDefault();
      currentGameModeIndex = (currentGameModeIndex + 1) % gameModeButtons.length;
      updateGameModeSelection();
      playNextSound();
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      playSound(selectSound);
      gameModeButtons[currentGameModeIndex].click();
      break;
  }
}

function updateGameModeSelection() {
  gameModeButtons.forEach((button, index) => {
    button.classList.toggle('selected', index === currentGameModeIndex);
  });
}

// Mouse hover handler for game mode buttons
gameModeButtons.forEach((button, index) => {
  button.addEventListener('mouseenter', () => {
    currentGameModeIndex = index;
    updateGameModeSelection();
  });
});

// Update the play game button to show game mode menu
document.getElementById('play-game-button').addEventListener('click', () => {
  menuScreen.classList.add('hidden');
  gameModeScreen.classList.remove('hidden');
  currentGameModeIndex = 0;
  updateGameModeSelection();
});

document.getElementById('normal-mode-button').addEventListener('click', () => {
  currentGameMode = 'base';
  playSound(selectSound);
  gameModeScreen.classList.add('hidden');
  startGame();
});

document.getElementById('time-attack-button').addEventListener('click', () => {
  currentGameMode = 'timeAttack';
  playSound(selectSound);
  gameModeScreen.classList.add('hidden');
  startGame();
});

document.getElementById('blackout-button').addEventListener('click', () => {
  currentGameMode = 'blackout';
  playSound(selectSound);
  gameModeScreen.classList.add('hidden');
  startGame();
});

document.getElementById('back-to-menu-button').addEventListener('click', () => {
  playSound(dungSound);
  gameModeScreen.classList.add('hidden');
  menuScreen.classList.remove('hidden');
  currentMenuIndex = 0;
  updateMenuSelection();
});

// Update death screen navigation to use DUNG sound for back button
function handleDeathScreenNavigation(event) {
  switch(event.key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      event.preventDefault();
      currentDeathButtonIndex = (currentDeathButtonIndex - 1 + deathButtons.length) % deathButtons.length;
      updateDeathScreenSelection();
      playNextSound();
      break;
    case 'arrowdown':
    case 's':
      event.preventDefault();
      currentDeathButtonIndex = (currentDeathButtonIndex + 1) % deathButtons.length;
      updateDeathScreenSelection();
      playNextSound();
      break;
    case 'enter':
    case ' ':
      event.preventDefault();
      if (deathButtons[currentDeathButtonIndex].id === 'menu-button') {
        playSound(dungSound);
      } else {
        playSound(selectSound);
      }
      deathButtons[currentDeathButtonIndex].click();
      break;
  }
}

// Update the keyboard navigation handler
function handleKeyboardNavigation(event) {
  // Check if console is open first
  const consoleContainer = document.getElementById('console-container');
  if (consoleContainer && consoleContainer.style.display !== 'none') {
    return;
  }

  // Handle navigation based on current screen
  if (!gameScreen.classList.contains('hidden')) {
    // Handle player movement in game
    // Prevent movement if the key is being held down
    if (event.repeat) {
      return;
    }
    
    const key = event.key.toLowerCase();
    switch (key) {
      case "arrowup":
      case "w":
        movePlayer(0, -1);
        break;
      case "arrowdown":
      case "s":
        movePlayer(0, 1);
        break;
      case "arrowleft":
      case "a":
        movePlayer(-1, 0);
        break;
      case "arrowright":
      case "d":
        movePlayer(1, 0);
        break;
    }
  } else if (!gameOverScreen.classList.contains('hidden')) {
    handleDeathScreenNavigation(event);
  } else if (!menuScreen.classList.contains('hidden')) {
    handleMenuScreenNavigation(event);
  } else if (!gameModeScreen.classList.contains('hidden')) {
    handleGameModeScreenNavigation(event);
  } else if (!settingsScreen.classList.contains('hidden')) {
    handleSettingsNavigation(event);
  } else if (!leaderboardMenuScreen.classList.contains('hidden')) {
    handleLeaderboardNavigation(event);
  } else if (!personalLeaderboardScreen.classList.contains('hidden')) {
    handlePersonalLeaderboardNavigation(event);
  } else if (!globalLeaderboardScreen.classList.contains('hidden')) {
    handleGlobalLeaderboardNavigation(event);
  } else if (!normalModeScoresScreen.classList.contains('hidden') ||
             !timeAttackScoresScreen.classList.contains('hidden') ||
             !blackoutScoresScreen.classList.contains('hidden')) {
    handleGameModeScoresNavigation(event);
  } else if (!bombConfirmationPopup.classList.contains('hidden')) {
    handleBombConfirmationNavigation(event);
  }
}

// Add a single keyboard event listener
document.addEventListener('keydown', handleKeyboardNavigation);

// Mouse hover handler for menu buttons
menuButtons.forEach((button, index) => {
  button.addEventListener('mouseenter', () => {
    currentMenuIndex = index;
    updateMenuSelection();
  });
});

// Add event listeners for menu buttons
document.getElementById('back-button').addEventListener('click', () => {
  playSound(dungSound);
  menuScreen.classList.add('hidden');
  titleScreen.classList.remove('hidden');
  // Reset menu selection for next time
  currentMenuIndex = 0;
});

// Add event listener for the menu button
document.getElementById('menu-button').addEventListener('click', () => {
  playSound(dungSound);
  gameOverScreen.classList.add('hidden');
  menuScreen.classList.remove('hidden');
  currentMenuIndex = 0;
  updateMenuSelection();
});

// Update death screen selection
function updateDeathScreenSelection() {
  deathButtons.forEach((button, index) => {
    button.classList.toggle('selected', index === currentDeathButtonIndex);
  });
}

// Initialize death screen selection
updateDeathScreenSelection();

// Update the death screen buttons to handle mouse hover
deathButtons.forEach((button, index) => {
  button.addEventListener('mouseenter', () => {
    currentDeathButtonIndex = index;
    updateDeathScreenSelection();
  });
});

document.getElementById('settings-button').addEventListener('click', () => {
  playSound(warfSound);
  menuScreen.classList.add('hidden');
  settingsScreen.classList.remove('hidden');
  currentSettingIndex = 0;
  updateSettingsSelection();
});

// Settings navigation
let currentSettingIndex = 0;
const settingsElements = [soundToggle, walkingSoundToggle, catToggle, jazzToggle, swipeToggle, settingsBackButton];
const settingItems = document.querySelectorAll('.setting-item');

function updateSettingsSelection() {
  settingItems.forEach((item, index) => {
    item.classList.toggle('selected', index === currentSettingIndex);
  });
  settingsElements.forEach((element, index) => {
    if (element.classList.contains('menu-button')) {
      element.classList.toggle('selected', index === currentSettingIndex);
    }
  });
}

function handleSettingsNavigation(event) {
  switch(event.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      event.preventDefault();
      currentSettingIndex = (currentSettingIndex - 1 + settingsElements.length) % settingsElements.length;
      updateSettingsSelection();
      playNextSound();
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      event.preventDefault();
      currentSettingIndex = (currentSettingIndex + 1) % settingsElements.length;
      updateSettingsSelection();
      playNextSound();
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (currentSettingIndex === settingsElements.length - 1) {
        // Back button
        playSound(dungSound);
        settingsBackButton.click();
      } else {
        // Toggle the current setting
        const setting = settingsElements[currentSettingIndex];
        if (setting.type === 'checkbox') {
          setting.checked = !setting.checked;
          handleSettingChange(setting);
          if (setting.id === 'jazz-toggle') {
            if (setting.checked) {
              playSound(jazzSound);
            }
          } else {
            playSound(selectSound);
          }
        }
      }
      break;
  }
}

function handleSettingChange(toggle) {
  if (toggle === soundToggle) {
    soundEnabled = toggle.checked;
    [cycleUpSound, cycleDownSound, selectSound, deathSound, levelCompleteSound, warfSound, patterSound, pitterSound, dungSound, warpSound, jazzSound].forEach(sound => {
      sound.muted = !soundEnabled;
    });
  } else if (toggle === walkingSoundToggle) {
    walkingSoundEnabled = toggle.checked;
  } else if (toggle === catToggle) {
    catModeEnabled = toggle.checked;
    const playerCell = document.querySelector('.cell.player');
    if (playerCell) {
      playerCell.classList.toggle('cat-mode', catModeEnabled);
    }
  } else if (toggle === jazzToggle) {
    jazzEnabled = toggle.checked;
    if (jazzEnabled) {
      playSound(jazzSound);
    } else {
      jazzSound.pause();
    }
  } else if (toggle === swipeToggle) {
    swipeEnabled = toggle.checked;
    updateControlsVisibility();
  }
  
  // Save settings after any change
  saveSettings();
}

// Add function to update controls visibility
function updateControlsVisibility() {
  const mobileControls = document.getElementById('mobile-controls');
  if (!mobileControls) return;
  
  if (swipeEnabled) {
    mobileControls.classList.add("hidden");
    mobileControls.style.display = 'none'; // Force hide
    if (hammer) {
      hammer.get('swipe').set({ enable: true });
    }
  } else {
    mobileControls.classList.remove("hidden");
    mobileControls.style.display = ''; // Reset display
    if (hammer) {
      hammer.get('swipe').set({ enable: false });
    }
  }
}

// Update settings back button
settingsBackButton.addEventListener('click', () => {
  playSound(dungSound);
  settingsScreen.classList.add('hidden');
  menuScreen.classList.remove('hidden');
  currentMenuIndex = 0;
  updateMenuSelection();
});

// Initialize settings
updateSettingsSelection();

// Add mouse hover handlers for settings items
settingItems.forEach((item, index) => {
  item.addEventListener('mouseenter', () => {
    currentSettingIndex = index;
    updateSettingsSelection();
  });
});

// Add title screen space bar functionality
document.addEventListener('keydown', (event) => {
  if (!titleScreen.classList.contains('hidden')) {
    if (event.key === 'Enter' && document.activeElement.tagName !== 'BUTTON') {
      event.preventDefault();
      playSound(selectSound);
      titleScreen.classList.add("hidden");
      menuScreen.classList.remove("hidden");
      currentMenuIndex = 0;
      updateMenuSelection();
    }
  }
});

// Add random message generator
function generateRandomMessage() {
  const randomNum = Math.floor(Math.random() * 6) + 1;
  if (randomNum === 6) {
    console.log("Katie smells really bad today she has armpit sweat stains - Natahan");
  }
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', generateRandomMessage);

// Add touch event handlers for settings toggles
settingItems.forEach((item, index) => {
  item.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent double-tap zoom
    const toggle = item.querySelector('input[type="checkbox"]');
    toggle.checked = !toggle.checked;
    handleSettingChange(toggle);
    playSound(selectSound);
  });
});

// Add new function for time change popup
function showTimeChangePopup(amount, isPositive) {
  let popup = document.createElement("div");
  popup.classList.add("time-change-popup");
  popup.textContent = `${isPositive ? '+' : ''}${amount}`;
  popup.style.color = isPositive ? '#00ff00' : '#ff0000';
  
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => popup.remove(), 500);
  }, 1000);
}

function handleDeath(mode, gameState) {
  // Get the death screen element
  const deathDisplay = document.getElementById('death-level-display');
  
  // Clear any existing content
  deathDisplay.innerHTML = '';
  
  // Get all scores from localStorage
  const scores = JSON.parse(localStorage.getItem('figglesnoot_scores') || '[]');
  
  // Find the highest level achieved in each mode
  const highestLevels = {
    base: Math.max(...scores.filter(score => score.mode === 'base').map(score => score.level || 1), 0),
    timeAttack: Math.max(...scores.filter(score => score.mode === 'timeAttack').map(score => score.level || 1), 0),
    blackout: Math.max(...scores.filter(score => score.mode === 'blackout').map(score => score.level || 1), 0)
  };
  
  // Check if this is a personal best in the current mode
  const isPersonalBest = gameState.level >= highestLevels[mode];
  
  // Add the level reached with animation class if it's a personal best
  if (isPersonalBest) {
    // Create the high score container but don't add it to the DOM yet
    const highScoreContainer = document.createElement('div');
    highScoreContainer.classList.add('highscore-container');
    
    // Get mode name for display
    const modeName = mode === 'base' ? 'Normal' : 
                    mode === 'timeAttack' ? 'Time Attack' : 
                    mode === 'blackout' ? 'Blackout' : 'Unknown';
    
    highScoreContainer.innerHTML = `
      <span class="trophy">🏆</span>
      <p class="highscore-text">New ${modeName} Mode Record: Level ${gameState.level}</p>
      <span class="trophy">🏆</span>
    `;
    
    // Add it to the DOM after a delay to match the animation
    setTimeout(() => {
      deathDisplay.appendChild(highScoreContainer);
      // Play mission complete sound when the high score appears
      playSound(missionCompleteSound);
    }, 900); // Match the delay from our CSS animation
  } else {
    deathDisplay.innerHTML = `<p>You reached Level ${gameState.level}</p>`;
  
    // Only show death message if it's not a high score
  const deathMessage = GameModes[mode].onDeath(gameState);
  
  // Add the death message
  if (deathMessage && deathMessage.deathMessage) {
    // Add the death message after a longer delay
    setTimeout(() => {
      const messageElement = document.createElement('p');
      messageElement.style.marginTop = '10px';
      messageElement.style.fontStyle = 'italic';
      messageElement.style.fontSize = '1.2rem';
      messageElement.textContent = deathMessage.deathMessage;
      deathDisplay.appendChild(messageElement);
      
      // Check if this is a rare message and play birthday song
      const rareMessages = [
        ".. .----. ...- . / .- .-.. .-- .- -.-- ... / .-. . .- .-.. .-.. -.-- / .-.. .. -.- . -.. / .... .- -. -. .- .... / -- .. -.-. ..- --..-- / -... ..- - / ... .... . .----. .-.. .-.. / -. . ...- . .-. / -.- -. --- .-- / - .... .- - .-.-.-",
        "Hey Goose!",
        "hey Possum!",
        "You're playing just like Grace VanHaaster."
      ];
      
      if (rareMessages.includes(deathMessage.deathMessage)) {
        playSound(birthdaySound);
        // Remove the message after 3 seconds
        setTimeout(() => {
          if (messageElement.parentNode === deathDisplay) {
            deathDisplay.removeChild(messageElement);
          }
        }, 3000);
      }
    }, 1300); // Match the delay for the death message
  }
  
  // Store the death message in the game state to prevent re-selection
  gameState.deathMessage = deathMessage.deathMessage;
  }
  
  return gameState;
}

// Add leaderboard variables and elements
const leaderboardMenuScreen = document.getElementById('leaderboard-menu-screen');
const personalLeaderboardScreen = document.getElementById('personal-leaderboard-screen');
const globalLeaderboardScreen = document.getElementById('global-leaderboard-screen');
const personalScoresContainer = document.getElementById('personal-scores-container');
const personalLeaderboardButton = document.getElementById('personal-leaderboard-button');
const globalLeaderboardButton = document.getElementById('global-leaderboard-button');
const backFromLeaderboardButton = document.getElementById('back-from-leaderboard-button');
const backFromPersonalButton = document.getElementById('back-from-personal-button');
const backFromGlobalButton = document.getElementById('back-from-global-button');

let currentLeaderboardIndex = 0;
const leaderboardButtons = [personalLeaderboardButton, globalLeaderboardButton, backFromLeaderboardButton];

// Update leaderboard button click handlers
document.getElementById('leaderboard-button').addEventListener('click', () => {
  playSound(selectSound);
  menuScreen.classList.add('hidden');
  leaderboardMenuScreen.classList.remove('hidden');
  currentLeaderboardIndex = 0;
  updateLeaderboardSelection();
});

personalLeaderboardButton.addEventListener('click', () => {
  playSound(selectSound);
  leaderboardMenuScreen.classList.add('hidden');
  personalLeaderboardScreen.classList.remove('hidden');
  displayPersonalScores();
});

globalLeaderboardButton.addEventListener('click', () => {
  playSound(selectSound);
  leaderboardMenuScreen.classList.add('hidden');
  globalLeaderboardScreen.classList.remove('hidden');
  startGlobalLeaderboardMusic();
});

backFromLeaderboardButton.addEventListener('click', () => {
  playSound(dungSound);
  leaderboardMenuScreen.classList.add('hidden');
  menuScreen.classList.remove('hidden');
  currentMenuIndex = 0;
  updateMenuSelection();
});

backFromPersonalButton.addEventListener('click', () => {
  playSound(dungSound);
  personalLeaderboardScreen.classList.add('hidden');
  menuScreen.classList.remove('hidden');
  currentMenuIndex = 0;
  updateMenuSelection();
});

backFromGlobalButton.addEventListener('click', () => {
  playSound(dungSound);
  stopGlobalLeaderboardMusic();
  globalLeaderboardScreen.classList.add('hidden');
  leaderboardMenuScreen.classList.remove('hidden');
  currentLeaderboardIndex = 0;
  updateLeaderboardSelection();
});

// Add leaderboard navigation
function handleLeaderboardNavigation(event) {
  if (!leaderboardMenuScreen.classList.contains('hidden')) {
    switch(event.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        event.preventDefault();
        if (currentLeaderboardIndex < 2) { // Only move left if not on back button
          currentLeaderboardIndex = (currentLeaderboardIndex - 1 + 2) % 2;
        updateLeaderboardSelection();
        playNextSound();
        }
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        event.preventDefault();
        if (currentLeaderboardIndex < 2) { // Only move right if not on back button
          currentLeaderboardIndex = (currentLeaderboardIndex + 1) % 2;
          updateLeaderboardSelection();
          playNextSound();
        }
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        event.preventDefault();
        currentLeaderboardIndex = 2; // Move to back button
        updateLeaderboardSelection();
        playNextSound();
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        event.preventDefault();
        if (currentLeaderboardIndex === 2) { // Only move up if on back button
          currentLeaderboardIndex = 0;
          updateLeaderboardSelection();
          playNextSound();
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (currentLeaderboardIndex === 2) {
          playSound(dungSound);
        } else {
          playSound(selectSound);
        }
        leaderboardButtons[currentLeaderboardIndex].click();
        break;
    }
  }
}

function updateLeaderboardSelection() {
  leaderboardButtons.forEach((button, index) => {
    if (index === currentLeaderboardIndex) {
      button.classList.add('selected');
    } else {
      button.classList.remove('selected');
    }
  });
}

// Add mouse hover handlers for leaderboard buttons
leaderboardButtons.forEach((button, index) => {
  button.addEventListener('mouseenter', () => {
    currentLeaderboardIndex = index;
    updateLeaderboardSelection();
  });
});

// Function to display personal scores
function displayPersonalScores() {
  const scores = JSON.parse(localStorage.getItem('figglesnoot_scores') || '[]');
  personalScoresContainer.innerHTML = '';
  
  if (scores.length === 0) {
    personalScoresContainer.innerHTML = '<div class="no-scores">No scores yet! Play some games to see your best levels here.</div>';
    return;
  }
  
  // Sort scores by level (descending) and take top 5
  const topScores = scores.sort((a, b) => b.level - a.level).slice(0, 5);
  
  topScores.forEach((score, index) => {
    const scoreEntry = document.createElement('div');
    scoreEntry.classList.add('score-entry');
    
    const mode = score.mode === 'base' ? 'Normal' : 
                 score.mode === 'timeAttack' ? 'Time Attack' : 
                 score.mode === 'blackout' ? 'Blackout' : 'Unknown';
    
    const date = new Date(score.date).toLocaleDateString('en-GB').replace(/\//g, ' / ');
    
    scoreEntry.innerHTML = `
      <div class="rank">${index + 1}.</div>
      <div class="mode">${mode}</div>
      <div class="score">Level ${score.level || 1}</div>
      <div class="date">${date}</div>
    `;
    
    personalScoresContainer.appendChild(scoreEntry);
  });
}

// Add new leaderboard screen elements
const normalModeScoresScreen = document.getElementById('normal-mode-scores-screen');
const timeAttackScoresScreen = document.getElementById('time-attack-scores-screen');
const blackoutScoresScreen = document.getElementById('blackout-scores-screen');
const normalScoresContainer = document.getElementById('normal-scores-container');
const timeAttackScoresContainer = document.getElementById('time-attack-scores-container');
const blackoutScoresContainer = document.getElementById('blackout-scores-container');

// Add game mode-specific score display functions
function displayNormalModeScores() {
  const scores = JSON.parse(localStorage.getItem('figglesnoot_scores') || '[]')
    .filter(score => score.mode === 'base')
    .sort((a, b) => b.level - a.level)
    .slice(0, 5);
  
  displayModeScores(normalScoresContainer, scores, 'Normal');
}

function displayTimeAttackScores() {
  const scores = JSON.parse(localStorage.getItem('figglesnoot_scores') || '[]')
    .filter(score => score.mode === 'timeAttack')
    .sort((a, b) => b.level - a.level)
    .slice(0, 5);
  
  displayModeScores(timeAttackScoresContainer, scores, 'Time Attack');
}

function displayBlackoutScores() {
  const scores = JSON.parse(localStorage.getItem('figglesnoot_scores') || '[]')
    .filter(score => score.mode === 'blackout')
    .sort((a, b) => b.level - a.level)
    .slice(0, 5);
  
  displayModeScores(blackoutScoresContainer, scores, 'Blackout');
}

function displayModeScores(container, scores, mode) {
  container.innerHTML = '';
  
  if (scores.length === 0) {
    container.innerHTML = '<div class="no-scores">No scores yet! Play some games to see your best levels here.</div>';
  } else {
    scores.forEach((score, index) => {
      const scoreEntry = document.createElement('div');
      scoreEntry.classList.add('score-entry');
      
      const date = new Date(score.date).toLocaleDateString('en-GB').replace(/\//g, ' / ');
      
      scoreEntry.innerHTML = `
        <div class="rank">${index + 1}.</div>
        <div class="mode">${mode}</div>
        <div class="score">Level ${score.level || 1}</div>
        <div class="date">${date}</div>
      `;
      
      container.appendChild(scoreEntry);
    });
  }
  
  addBombButton(container);
}

// Add bomb confirmation popup elements
const bombConfirmationPopup = document.getElementById('bomb-confirmation-popup');
const confirmBombButton = document.getElementById('confirm-bomb-button');
const cancelBombButton = document.getElementById('cancel-bomb-button');

let currentBombButtonIndex = 0;
const bombButtons = [confirmBombButton, cancelBombButton];

// Add new sound for bomb confirmation
const badWiggleSound = new Audio('sounds/BADWIGGLE.mp3');

// Store the current container being cleared
let currentClearingContainer = null;

// Update bomb button functionality
function addBombButton(container) {
  const bombButton = document.createElement('button');
  bombButton.innerHTML = '💣';
  bombButton.classList.add('bomb-button');
  bombButton.title = 'Clear all scores';
  bombButton.onclick = () => {
    playSound(selectSound);
    showBombConfirmation(container);
  };
  container.appendChild(bombButton);
}

function showBombConfirmation(container) {
  // Store the current container for later use
  currentClearingContainer = container;
  
  // Store the current screen before hiding it
  const currentScreen = container.closest('.screen');
  if (currentScreen) {
    currentScreen.dataset.previousScreen = currentScreen.id;
    currentScreen.classList.add('hidden');
  }
  
  bombConfirmationPopup.classList.remove('hidden');
  currentBombButtonIndex = 0;
  updateBombButtonSelection();
}

function hideBombConfirmation() {
  bombConfirmationPopup.classList.add('hidden');
  
  // Find the previous screen
  const previousScreen = document.querySelector('.screen[data-previous-screen]');
  if (previousScreen) {
    const screenId = previousScreen.dataset.previousScreen;
    previousScreen.classList.remove('hidden');
    delete previousScreen.dataset.previousScreen;
  } else {
    // If no previous screen is found, show the personal leaderboard screen
    personalLeaderboardScreen.classList.remove('hidden');
  }
}

function clearScores() {
  if (!currentClearingContainer) return;
  
  // Get all scores from localStorage
  const scores = JSON.parse(localStorage.getItem('figglesnoot_scores') || '[]');
  
  // Map container IDs to game modes
  const modeMap = {
    'normal-scores-container': 'base',
    'time-attack-scores-container': 'timeAttack',
    'blackout-scores-container': 'blackout'
  };
  
  // Get the mode to clear based on the container ID
  const modeToClear = modeMap[currentClearingContainer.id];
  
  if (modeToClear) {
    console.log(`Clearing scores for mode: ${modeToClear}`);
    
    // Filter out scores for the specified game mode
    const filteredScores = scores.filter(score => score.mode !== modeToClear);
    
    // Update localStorage with filtered scores
    localStorage.setItem('figglesnoot_scores', JSON.stringify(filteredScores));
    
    // Hide the confirmation popup
    hideBombConfirmation();
    
    // Refresh the scores display based on the current screen
    const currentScreen = currentClearingContainer.closest('.screen');
    if (currentScreen) {
      if (currentScreen.id === 'normal-mode-scores-screen') {
        displayNormalModeScores();
      } else if (currentScreen.id === 'time-attack-scores-screen') {
        displayTimeAttackScores();
      } else if (currentScreen.id === 'blackout-scores-screen') {
        displayBlackoutScores();
      }
    }
  } else {
    console.error(`Unknown container ID: ${currentClearingContainer.id}`);
  }
}

function updateBombButtonSelection() {
  const buttons = bombConfirmationPopup.querySelectorAll('.menu-button');
  buttons.forEach((button, index) => {
    button.classList.toggle('selected', index === currentBombButtonIndex);
  });
}

// Add bomb confirmation navigation
function handleBombConfirmationNavigation(event) {
  if (!bombConfirmationPopup.classList.contains('hidden')) {
    const buttons = bombConfirmationPopup.querySelectorAll('.menu-button');
    switch(event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        event.preventDefault();
        currentBombButtonIndex = (currentBombButtonIndex - 1 + buttons.length) % buttons.length;
        updateBombButtonSelection();
        playNextSound();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        event.preventDefault();
        currentBombButtonIndex = (currentBombButtonIndex + 1) % buttons.length;
        updateBombButtonSelection();
        playNextSound();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (currentBombButtonIndex === 0) {
          playSound(selectSound);
        } else {
          playSound(dungSound);
        }
        buttons[currentBombButtonIndex].click();
        break;
      case 'Escape':
        event.preventDefault();
        playSound(dungSound);
        hideBombConfirmation();
        break;
    }
  }
}

// Update event listeners for bomb confirmation buttons
confirmBombButton.addEventListener('click', () => {
  playSound(badWiggleSound);
  clearScores();
});

cancelBombButton.addEventListener('click', () => {
  playSound(dungSound);
  hideBombConfirmation();
});

// Add mouse hover handlers for bomb confirmation buttons
const bombConfirmationButtons = bombConfirmationPopup.querySelectorAll('.menu-button');
bombConfirmationButtons.forEach((button, index) => {
  button.addEventListener('mouseenter', () => {
    currentBombButtonIndex = index;
    updateBombButtonSelection();
  });
});

// Add event listeners for game mode-specific score buttons
document.getElementById('normal-mode-scores-button').addEventListener('click', () => {
  playSound(selectSound);
  personalLeaderboardScreen.classList.add('hidden');
  normalModeScoresScreen.classList.remove('hidden');
  displayNormalModeScores();
});

document.getElementById('time-attack-scores-button').addEventListener('click', () => {
  playSound(selectSound);
  personalLeaderboardScreen.classList.add('hidden');
  timeAttackScoresScreen.classList.remove('hidden');
  displayTimeAttackScores();
});

document.getElementById('blackout-scores-button').addEventListener('click', () => {
  playSound(selectSound);
  personalLeaderboardScreen.classList.add('hidden');
  blackoutScoresScreen.classList.remove('hidden');
  displayBlackoutScores();
});

// Leaderboard navigation system
const leaderboardScreens = {
  normal: {
    screen: normalModeScoresScreen,
    backButton: document.getElementById('back-from-normal-scores-button'),
    container: normalScoresContainer
  },
  timeAttack: {
    screen: timeAttackScoresScreen,
    backButton: document.getElementById('back-from-time-attack-scores-button'),
    container: timeAttackScoresContainer
  },
  blackout: {
    screen: blackoutScoresScreen,
    backButton: document.getElementById('back-from-blackout-scores-button'),
    container: blackoutScoresContainer
  }
};

// Function to get the currently visible leaderboard screen
function getCurrentLeaderboardScreen() {
  for (const [mode, data] of Object.entries(leaderboardScreens)) {
    if (!data.screen.classList.contains('hidden')) {
      return { mode, ...data };
    }
  }
  return null;
}

// Function to navigate back to the personal leaderboard
function navigateBackToPersonalLeaderboard() {
  // Hide all game mode score screens
  Object.values(leaderboardScreens).forEach(data => {
    data.screen.classList.add('hidden');
  });
  
  // Show the personal leaderboard screen
  personalLeaderboardScreen.classList.remove('hidden');
  
  // Play sound
  playSound(dungSound);
}

// Add back button event listeners for game mode score screens
Object.values(leaderboardScreens).forEach(data => {
  if (data.backButton) {
    data.backButton.addEventListener('click', navigateBackToPersonalLeaderboard);
  }
});

// Add game mode scores navigation
function handleGameModeScoresNavigation(event) {
  // Get the current leaderboard screen
  const currentScreen = getCurrentLeaderboardScreen();
  if (!currentScreen) return;
  
  // Get the back button
  const backButton = currentScreen.backButton;
  
  // If back button is missing, exit the function
  if (!backButton) return;
  
  // If no button is selected, default to the back button
  if (!backButton.classList.contains('selected')) {
    backButton.classList.add('selected');
    backButton.classList.add('hover');
  }
  
  switch(event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault();
      // Back button is selected
      navigateBackToPersonalLeaderboard();
      break;
  }
}

// Add mouse hover handlers for back buttons
Object.values(leaderboardScreens).forEach(data => {
  if (data.backButton) {
    data.backButton.addEventListener('mouseenter', () => {
      // Remove selection and hover from any other buttons
      document.querySelectorAll('.menu-button.selected, .bomb-button.selected, .menu-button.hover, .bomb-button.hover').forEach(btn => {
        btn.classList.remove('selected');
        btn.classList.remove('hover');
      });
      // Add selection and hover to this button
      data.backButton.classList.add('selected');
      data.backButton.classList.add('hover');
    });
  }
});

// Add personal leaderboard navigation variables
let currentPersonalIndex = 0;
const personalButtons = [
  document.getElementById('normal-mode-scores-button'),
  document.getElementById('time-attack-scores-button'),
  document.getElementById('blackout-scores-button'),
  document.getElementById('back-from-personal-button')
];

// this is a long @$$ function name but at this point I don't really care anymore.
// Update personal leaderboard navigation
function handlePersonalLeaderboardNavigation(event) {
  if (!personalLeaderboardScreen.classList.contains('hidden')) {
    switch(event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        event.preventDefault();
        currentPersonalIndex = (currentPersonalIndex - 1 + personalButtons.length) % personalButtons.length;
        updatePersonalSelection();
        playNextSound();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        event.preventDefault();
        currentPersonalIndex = (currentPersonalIndex + 1) % personalButtons.length;
        updatePersonalSelection();
        playNextSound();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (currentPersonalIndex === personalButtons.length - 1) {
          playSound(dungSound);
        } else {
          selectSound.currentTime = 0;
          selectSound.play();
        }
        personalButtons[currentPersonalIndex].click();
        break;
    }
  }
}

function updatePersonalSelection() {
  personalButtons.forEach((button, index) => {
    button.classList.toggle('selected', index === currentPersonalIndex);
  });
}

// Add mouse hover handlers for personal leaderboard buttons
personalButtons.forEach((button, index) => {
  button.addEventListener('mouseenter', () => {
    currentPersonalIndex = index;
    updatePersonalSelection();
  });
});

// Global leaderboard navigation
function handleGlobalLeaderboardNavigation(event) {
  switch(event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault();
      playSound(dungSound);
      backFromGlobalButton.click();
      break;
  }
}

// Add mouse hover handler for global leaderboard back button
backFromGlobalButton.addEventListener('mouseenter', () => {
  // The button already has "selected" class in HTML, so no need to change selection
});

// Global leaderboard header toggle functionality
const globalHeader = document.getElementById('global-header');
let isShowingComingSoon = true;

// Add WARPWARP sound for header toggle
const warpWarpSound = new Audio('sounds/WARPWARP.mp3');

globalHeader.addEventListener('click', () => {
  if (isShowingComingSoon) {
    globalHeader.textContent = '2026';
    isShowingComingSoon = false;
  } else {
    globalHeader.textContent = 'COMING SOON';
    isShowingComingSoon = true;
  }
  
  // Play WARPWARP sound when clicking the header
  playSound(warpWarpSound);
});

// Global leaderboard music functions
let currentGlobalMusic = null;

function startGlobalLeaderboardMusic() {
  // Stop any currently playing global music
  stopGlobalLeaderboardMusic();
  
  // Randomly select one of the online sounds
  const onlineSounds = [
    'onlinesounds/january2016online3.mp3',
    'onlinesounds/july2014online2.mp3',
    'onlinesounds/sep2015online1.mp3'
  ];
  
  const randomSound = onlineSounds[Math.floor(Math.random() * onlineSounds.length)];
  currentGlobalMusic = new Audio(randomSound);
  currentGlobalMusic.volume = 0;
  currentGlobalMusic.loop = true;
  
  // Check if sounds are enabled before playing
  if (soundToggle && soundToggle.checked) {
    currentGlobalMusic.play().then(() => {
      fadeInMusic(currentGlobalMusic, 0.3, 2000);
    }).catch(() => {
      // Handle play promise rejection
    });
  }
}

function stopGlobalLeaderboardMusic() {
  if (currentGlobalMusic) {
    // Fade out over 0.5 seconds
    fadeOutMusic(currentGlobalMusic, 500);
    currentGlobalMusic = null;
  }
}

function fadeInMusic(audio, targetVolume, duration) {
  const steps = 30;
  const stepDuration = duration / steps;
  const volumeStep = targetVolume / steps;
  let currentStep = 0;
  
  const fadeInterval = setInterval(() => {
    if (currentStep < steps) {
      audio.volume = volumeStep * currentStep;
      currentStep++;
    } else {
      audio.volume = targetVolume;
      clearInterval(fadeInterval);
    }
  }, stepDuration);
}

function fadeOutMusic(audio, duration) {
  const steps = 30;
  const stepDuration = duration / steps;
  const startVolume = audio.volume;
  const volumeStep = startVolume / steps;
  let currentStep = 0;
  
  const fadeInterval = setInterval(() => {
    if (currentStep < steps) {
      audio.volume = startVolume - (volumeStep * currentStep);
      currentStep++;
    } else {
      audio.volume = 0;
      audio.pause();
      clearInterval(fadeInterval);
    }
  }, stepDuration);
}

// settings storage functions
function saveSettings() {
  const settings = {
    soundEnabled,
    walkingSoundEnabled,
    catModeEnabled,
    jazzEnabled,
    swipeEnabled
  };
  localStorage.setItem('figglesnootSettings', JSON.stringify(settings));
}

// Load the settings from local storage
function loadSettings() {
  const savedSettings = localStorage.getItem('figglesnootSettings');
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    soundEnabled = settings.soundEnabled;
    walkingSoundEnabled = settings.walkingSoundEnabled;
    catModeEnabled = settings.catModeEnabled;
    jazzEnabled = settings.jazzEnabled;
    swipeEnabled = settings.swipeEnabled;

    // Update UI to reflect loaded settings
    soundToggle.checked = soundEnabled;
    walkingSoundToggle.checked = walkingSoundEnabled;
    catToggle.checked = catModeEnabled;
    jazzToggle.checked = jazzEnabled;
    swipeToggle.checked = swipeEnabled;

    // Apply loaded settings
    [cycleUpSound, cycleDownSound, selectSound, deathSound, levelCompleteSound, warfSound, patterSound, pitterSound, dungSound, warpSound, jazzSound].forEach(sound => {
      sound.muted = !soundEnabled;
    });
    
    if (jazzEnabled) {
      jazzSound.play();
    }
    
    updateControlsVisibility();
    
    const playerCell = document.querySelector('.cell.player');
    if (playerCell) {
      playerCell.classList.toggle('cat-mode', catModeEnabled);
    }
  }
}

// Add event listeners for the death screen buttons to stop the birthday song
document.getElementById('restart-button').addEventListener('click', () => {
  birthdaySound.pause();
  birthdaySound.currentTime = 0;
  gameOverScreen.classList.add('hidden');
  startGame();
});

document.getElementById('menu-button').addEventListener('click', () => {
  birthdaySound.pause();
  birthdaySound.currentTime = 0;
  gameOverScreen.classList.add('hidden');
  menuScreen.classList.remove('hidden');
  currentMenuIndex = 0;
  updateMenuSelection();
});

// Universal sound playing function that respects the sound toggle
function playSound(audio) {
  if (soundToggle && soundToggle.checked) {
    audio.currentTime = 0;
    audio.play();
  }
}

// Universal walking sound function that respects both toggles
function playWalkingSound(audio) {
  if (soundToggle && soundToggle.checked && walkingSoundToggle && walkingSoundToggle.checked) {
    audio.currentTime = 0;
    audio.play();
  }
}

function testMode() {
  playSound(birthdaySound);
  
  // Test function for various features
  showFeaturePopup();
}

function testFunctionTwo() {
  playSound(birthdaySound);
}
