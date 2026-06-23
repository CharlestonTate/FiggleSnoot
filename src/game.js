import {
  gameScreen, gameOverScreen, mazeContainer, timerElement, levelElement,
} from './dom-elements.js';
import { hideScreen, showScreen, switchScreens } from './screens.js';
import {
  playSound, playWalkingSound, deathSound, levelCompleteSound, coinCollectSound,
  dyingSound, missionCompleteSound, birthdaySound, patterSound, pitterSound,
  advanceMovementSound, getMovementSound,
} from './audio.js';
import { walkingSoundEnabled, catModeEnabled } from './settings.js';
import { updateControlsVisibility, initHammer, isSwipeEnabled, initMobileControls, stopMobileHold } from './controls.js';
import { GameModes, initializeGameMode, handleLevelComplete } from './gamemodes.js';
import { withTrustedStorageWrite, registerProtectedFunction, registerRunIntegrity, verifyRuntimeIntegrity, isIntegrityTriggered } from './integrity.js';

let isGameOver = false;
let gridSize = 7;
let level = 1;
let startTime = null;
let elapsedTime = 0;
let timerRunning = false;
let playerPosition = { x: 0, y: 0 };
let goalPosition = {};
let obstacles = [];
let coinPosition = null;
const COIN_SPAWN_CHANCE = 0.15;
let gameInterval;
let showMazeTimeout;
let isMazeVisible = true;
let currentGameMode = 'normal';
let remainingTime = 5;
let isTimeAttackMode = false;
let timer;
let isDeathAnimationPlaying = false;
let hasMovedThisLevel = false;

const runSession = {
  levelsCleared: 0,
  peakLevel: 1,
  startedAt: 0,
};

function resetRunSession() {
  runSession.levelsCleared = 0;
  runSession.peakLevel = 1;
  runSession.startedAt = performance.now();
}

function recordLevelComplete(newLevel) {
  runSession.levelsCleared += 1;
  runSession.peakLevel = Math.max(runSession.peakLevel, newLevel);
}

function usesCountdownTimer() {
  return currentGameMode === 'timeAttack' || currentGameMode === 'base';
}

function getModeInitialTimer() {
  const modeConfig = GameModes[currentGameMode];
  return modeConfig?.initialTimer ?? 20;
}

export function setCurrentGameMode(mode) {
  currentGameMode = mode;
}

export function getCurrentGameMode() {
  return currentGameMode;
}

export function updateCoinDisplay() {
  const el = document.getElementById('coin-count');
  if (el) el.textContent = getCoinCount();
}

function getCoinCount() {
  const n = parseInt(localStorage.getItem('figglesnoot_coins') || '0', 10);
  return isNaN(n) ? 0 : n;
}

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

export function startGame() {
  isGameOver = false;
  level = 1;
  resetRunSession();
  elapsedTime = 0;
  timerRunning = false;
  remainingTime = getModeInitialTimer();

  if (gameInterval) clearInterval(gameInterval);
  if (showMazeTimeout) clearTimeout(showMazeTimeout);

  hideScreen('title');
  hideScreen('menu');
  hideScreen('gameMode');
  hideScreen('gameOver');
  showScreen('game');

  // Ensure controls are properly set up
  updateControlsVisibility();
  stopMobileHold();

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

  import('./bootstrap-online.js')
    .then(({ bootstrapOnlineServices, getOnlineModule }) =>
      bootstrapOnlineServices().then(() => getOnlineModule()))
    .then((online) => online?.startOnlineRun?.(currentGameMode))
    .catch(() => {});
}

function initializeLevel() {
  isTimeAttackMode = currentGameMode === 'timeAttack';

  if (usesCountdownTimer()) {
    if (currentGameMode === 'base') {
      remainingTime = getModeInitialTimer();
    }
    timer = remainingTime;
  } else {
    timer = GameModes.blackout?.initialTimer ?? 40;
  }

  // Grid increases every 5 levels and resets every 5-level cycle
  gridSize = 6 + (level % 5);

  playerPosition = getPlayerSpawn(gridSize);
  const pathEnd = getOppositeCorner(playerPosition, gridSize);
  const path = generatePath(playerPosition, pathEnd);
  goalPosition = placeGoalNearPath(path, playerPosition);
  obstacles = generateMaze(gridSize, path, goalPosition);
  coinPosition = trySpawnCoin(path, goalPosition, playerPosition);
  isMazeVisible = true;
  hasMovedThisLevel = false;

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

function getCornerPositions(size) {
  const max = size - 1;
  return [
    { x: 0, y: 0 },
    { x: max, y: 0 },
    { x: 0, y: max },
    { x: max, y: max },
  ];
}

/** Level 1 always top-left; later levels pick any corner. */
function getPlayerSpawn(size) {
  const corners = getCornerPositions(size);
  if (level === 1) return corners[0];
  return corners[Math.floor(Math.random() * corners.length)];
}

function getOppositeCorner(spawn, size) {
  const max = size - 1;
  if (spawn.x === 0 && spawn.y === 0) return { x: max, y: max };
  if (spawn.x === max && spawn.y === 0) return { x: 0, y: max };
  if (spawn.x === 0 && spawn.y === max) return { x: max, y: 0 };
  return { x: 0, y: 0 };
}

function placeGoalNearPath(path, spawn) {
  const minDistance = Math.floor(gridSize / 2);
  const farPathCells = path.filter(
    (pos) => Math.abs(pos.x - spawn.x) + Math.abs(pos.y - spawn.y) >= minDistance
  );
  return farPathCells.length > 0
    ? farPathCells[Math.floor(Math.random() * farPathCells.length)]
    : path[path.length - 1];
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

function generatePath(start, end) {
  const path = [{ x: start.x, y: start.y }];
  let x = start.x;
  let y = start.y;

  while (x !== end.x || y !== end.y) {
    const moves = [];
    if (x !== end.x) moves.push({ x: x + (x < end.x ? 1 : -1), y });
    if (y !== end.y) moves.push({ x, y: y + (y < end.y ? 1 : -1) });
    const next = moves[Math.floor(Math.random() * moves.length)];
    x = next.x;
    y = next.y;
    path.push({ x, y });
  }
  return path;
}

function getRandomGoalPosition() {
  let valid = false;
  let pos;
  while (!valid) {
    pos = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
    const isSpawn = pos.x === playerPosition.x && pos.y === playerPosition.y;
    if (!obstacles.some((o) => o.x === pos.x && o.y === pos.y) && !isSpawn) {
      valid = true;
    }
  }
  return pos;
}

function trySpawnCoin(path, goal, spawn) {
  if (Math.random() >= COIN_SPAWN_CHANCE) return null;
  const obstacleSet = new Set(obstacles.map(o => `${o.x},${o.y}`));
  const goalKey = `${goal.x},${goal.y}`;
  const spawnKey = `${spawn.x},${spawn.y}`;
  const validCells = path.filter((p) => {
    const key = `${p.x},${p.y}`;
    return key !== goalKey && key !== spawnKey && !obstacleSet.has(key);
  });
  if (validCells.length === 0) return null;
  return validCells[Math.floor(Math.random() * validCells.length)];
}

function setCoinCount(count) {
  const n = Math.max(0, parseInt(count, 10) || 0);
  withTrustedStorageWrite(() => {
    localStorage.setItem('figglesnoot_coins', String(n));
  });
  updateCoinDisplay();
}

function addCoins(amount) {
  setCoinCount(getCoinCount() + (amount || 1));
}

function renderMaze() {
  mazeContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  mazeContainer.innerHTML = "";
  
  // Create obstacle lookup Set for O(1) performance instead of O(n) array.some()
  const obstacleSet = new Set(obstacles.map(o => `${o.x},${o.y}`));
  const playerKey = `${playerPosition.x},${playerPosition.y}`;
  const goalKey = `${goalPosition.x},${goalPosition.y}`;
  const coinKey = coinPosition ? `${coinPosition.x},${coinPosition.y}` : null;
  
  // Use DocumentFragment for better performance (batch DOM operations)
  const fragment = document.createDocumentFragment();
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      const cellKey = `${x},${y}`;
      const isObstacle = obstacleSet.has(cellKey);
      const isPlayer = cellKey === playerKey;
      const isGoal = cellKey === goalKey;
      const isCoin = coinKey !== null && cellKey === coinKey;

      // In blackout mode, make only the player and goal blocks black
      if (currentGameMode === 'blackout') {
        if (isPlayer) {
          cell.classList.add("player");
          if (!hasMovedThisLevel) cell.classList.add("spawn-glow");
          if (catModeEnabled) cell.classList.add("cat-mode");
          cell.style.backgroundColor = '#000';
        } else if (isGoal) {
          cell.classList.add("goal");
          cell.style.backgroundColor = '#000';
        } else if (isMazeVisible && isObstacle) {
          cell.classList.add("obstacle");
          cell.style.backgroundColor = '#000';
        } else if (isMazeVisible && isCoin) {
          cell.classList.add("coin");
          cell.style.backgroundColor = '#FFE393';
        }
      } else {
        if (isMazeVisible || isPlayer || isGoal || isCoin) {
          if (isPlayer) {
            cell.classList.add("player");
            if (!hasMovedThisLevel) cell.classList.add("spawn-glow");
            if (catModeEnabled) cell.classList.add("cat-mode");
          } 
          if (isGoal) {
            cell.classList.add("goal"); 
          } 
          if (isMazeVisible && isObstacle) {
            cell.classList.add("obstacle");
          }
          if (isCoin) {
            cell.classList.add("coin");
            cell.style.backgroundColor = '#FFE393';
          }
        }
      }
      fragment.appendChild(cell);
    }
  }
  
  mazeContainer.appendChild(fragment);
}

function movePlayer(dx, dy) {
  if (isGameOver || isDeathAnimationPlaying) return;

  const newX = playerPosition.x + dx;
  const newY = playerPosition.y + dy;

  if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
    // Optimize obstacle check with Set lookup (O(1) instead of O(n))
    const obstacleSet = new Set(obstacles.map(o => `${o.x},${o.y}`));
    if (!obstacleSet.has(`${newX},${newY}`)) {
      if (!hasMovedThisLevel) hasMovedThisLevel = true;
      playerPosition = { x: newX, y: newY };
      isMazeVisible = false;

      if (coinPosition && newX === coinPosition.x && newY === coinPosition.y) {
        playSound(coinCollectSound);
        addCoins(1);
        coinPosition = null;
      }

      // Use requestAnimationFrame for smoother rendering
      requestAnimationFrame(() => renderMaze());

      if (walkingSoundEnabled) {
        playWalkingSound(getMovementSound());
        advanceMovementSound();
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
        stopMobileHold();

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
    } else if (currentGameMode === 'base') {
      remainingTime = getModeInitialTimer();
      timer = remainingTime;
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
    recordLevelComplete(level);
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
    if (usesCountdownTimer()) {
      const currentTime = performance.now();
      const timePassed = (currentTime - startTime) / 1000;
      remainingTime = Math.max(0, timer - timePassed);

      if (remainingTime <= 0) {
        endGame();
        return;
      }
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
  if (usesCountdownTimer()) {
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

  verifyRuntimeIntegrity();
  if (isIntegrityTriggered()) return;

  stopMobileHold();
  
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
    time: usesCountdownTimer() ? remainingTime : elapsedTime,
    date: new Date().toISOString()
  });
  withTrustedStorageWrite(() => {
    localStorage.setItem('figglesnoot_scores', JSON.stringify(scores));
  });

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

  // Reset online message container before showing game over
  const onlineMsg = document.getElementById('online-death-message');
  if (onlineMsg) {
    onlineMsg.innerHTML = '';
    onlineMsg.classList.add('hidden');
  }

  switchScreens('game', 'gameOver');

  import('./bootstrap-online.js')
    .then(({ bootstrapOnlineServices, getOnlineModule }) =>
      bootstrapOnlineServices().then(() => getOnlineModule())
    )
    .then((online) => {
      if (!online?.handleOnlineScoreResult) return;
      return online.handleOnlineScoreResult({
        mode: currentGameMode,
        level: level || 1,
        time: usesCountdownTimer() ? remainingTime : elapsedTime,
      });
    })
    .catch((err) => console.warn('Online score skipped:', err));
}

function restartGame() {
  isGameOver = false; // Reset the game over flag
  level = 1; // Reset level when restarting
  startGame();
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
export function initGameControls() {
  initMobileControls((dx, dy) => {
    if (isGameOver || isDeathAnimationPlaying) return;
    movePlayer(dx, dy);
  });

  initHammer((event) => {
    if (isGameOver || gameScreen.classList.contains('hidden') || !isSwipeEnabled()) return;
    const velocity = Math.abs(event.velocity);
    const angle = event.angle;
    if (velocity < 0.15) return;
    if (angle >= -45 && angle < 45) movePlayer(1, 0);
    else if (angle >= 45 && angle < 135) movePlayer(0, 1);
    else if (angle >= 135 || angle < -135) movePlayer(-1, 0);
    else if (angle >= -135 && angle < -45) movePlayer(0, -1);
  });
}

export function initConsole() {
  if (import.meta.env.PROD) return;

  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !consoleVisible) {
      event.preventDefault();
      toggleConsole();
    } else if (event.key === 'Escape' && consoleVisible) {
      event.preventDefault();
      toggleConsole();
    }
  });
}

export { movePlayer, isGameOver as getIsGameOver };

registerRunIntegrity(() => ({
  levelsCleared: runSession.levelsCleared,
  peakLevel: runSession.peakLevel,
  startedAt: runSession.startedAt,
  getCurrentLevel: () => level,
  isGameOver,
}));

registerProtectedFunction('game.endGame', endGame);
registerProtectedFunction('game.movePlayer', movePlayer);
registerProtectedFunction('game.checkWin', checkWin);
registerProtectedFunction('game.startGame', startGame);

if (!import.meta.env.PROD && typeof window !== 'undefined') {
  window.__FIGGLE_DEV__ = {
    ...(window.__FIGGLE_DEV__ || {}),
    __forceLevel: (n) => { level = n; },
  };
}
