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

// Game Variables
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

// Start Game
playButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

timerElement.textContent = timer;
levelElement.textContent = level;

function startGame() {
  titleScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  mobileControls.classList.toggle("hidden", !isMobile());
  initializeLevel();
}

function initializeLevel() {
  timer = 30;

  // Grid increases every 5 levels and resets every 5-level cycle
  gridSize = 6 + (level % 5);

  playerPosition = { x: 0, y: 0 };

  const path = generatePath(gridSize);
  goalPosition = placeGoalNearPath(path);
  obstacles = generateMaze(gridSize, path, goalPosition);
  isMazeVisible = true;

  renderMaze();
  updateHUD();

  // **Fix: Clear any existing maze timeout before setting a new one**
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

      if (isMazeVisible || (x === playerPosition.x && y === playerPosition.y) || (x === goalPosition.x && y === goalPosition.y)) {
        if (x === playerPosition.x && y === playerPosition.y) {
          cell.classList.add("player");
        } 
        if (x === goalPosition.x && y === goalPosition.y) {
          cell.classList.add("goal"); 
        } 
        if (isMazeVisible && obstacles.some((o) => o.x === x && o.y === y)) {
          cell.classList.add("obstacle");
        }
      }      
      mazeContainer.appendChild(cell);
    }
  }
}

function movePlayer(dx, dy) {
  const newX = playerPosition.x + dx;
  const newY = playerPosition.y + dy;

  if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
    if (!obstacles.some((o) => o.x === newX && o.y === newY)) {
      playerPosition = { x: newX, y: newY };
      isMazeVisible = false;
      renderMaze();

      // Start timer only if it hasn't started yet
      if (!timerRunning) {
        startTimer();
      }

      checkWin();
    } else {
      endGame();
    }
  }
}


function checkWin() {
  if (playerPosition.x === goalPosition.x && playerPosition.y === goalPosition.y) {
    stopTimer();
    
    let seconds = Math.floor(elapsedTime / 1000);
    let milliseconds = Math.floor((elapsedTime % 1000) / 10);
    
    showTimePopup(`${seconds}.${milliseconds.toString().padStart(2, '0')}s`);

    level++;
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
  if (timerRunning) return; // Prevent multiple intervals

  startTime = performance.now();
  timerRunning = true;

  gameInterval = setInterval(() => {
    elapsedTime = performance.now() - startTime;
    updateHUD();
  }, 10);
}

function updateHUD() {
  let seconds = Math.floor(elapsedTime / 1000);
  let milliseconds = Math.floor((elapsedTime % 1000) / 10);

  timerElement.textContent = `${seconds}.${milliseconds.toString().padStart(2, '0')}`;
  levelElement.textContent = level;
}


function endGame() {
  clearTimeout(showMazeTimeout);
  clearInterval(gameInterval);
  gameScreen.classList.add("hidden");
  gameOverScreen.classList.remove("hidden");
}

function restartGame() {
  level = 1;
  startGame();
}

document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp": movePlayer(0, -1); break;
    case "ArrowDown": movePlayer(0, 1); break;
    case "ArrowLeft": movePlayer(-1, 0); break;
    case "ArrowRight": movePlayer(1, 0); break;
  }
});

if (isMobile()) {
  mobileControls.addEventListener("click", (e) => {
    if (e.target.id === "up") movePlayer(0, -1);
    if (e.target.id === "down") movePlayer(0, 1);
    if (e.target.id === "left") movePlayer(-1, 0);
    if (e.target.id === "right") movePlayer(1, 0);
  });
}

function isMobile() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

document.querySelectorAll("#mobile-controls button").forEach(button => {
  button.addEventListener("touchstart", (e) => {
    e.preventDefault();  // Prevents zooming issues
  }, { passive: false });
});

