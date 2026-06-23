/** Central DOM references — single source for element lookups */
export const titleScreen = document.getElementById('title-screen');
export const playButton = document.getElementById('play-button');
export const gameScreen = document.getElementById('game-screen');
export const gameOverScreen = document.getElementById('game-over-screen');
export const restartButton = document.getElementById('restart-button');
export const menuButton = document.getElementById('menu-button');
export const mazeContainer = document.getElementById('maze');
export const timerElement = document.getElementById('timer-value');
export const levelElement = document.getElementById('level-value');
export const mobileControls = document.getElementById('mobile-controls');
export const menuScreen = document.getElementById('menu-screen');
export const gameModeScreen = document.getElementById('game-mode-screen');
export const settingsScreen = document.getElementById('settings-screen');
export const leaderboardMenuScreen = document.getElementById('leaderboard-menu-screen');
export const personalLeaderboardScreen = document.getElementById('personal-leaderboard-screen');
export const globalLeaderboardScreen = document.getElementById('global-leaderboard-screen');
export const normalModeScoresScreen = document.getElementById('normal-mode-scores-screen');
export const timeAttackScoresScreen = document.getElementById('time-attack-scores-screen');
export const blackoutScoresScreen = document.getElementById('blackout-scores-screen');
export const bombConfirmationPopup = document.getElementById('bomb-confirmation-popup');
export const consoleContainer = document.getElementById('console-container');

export const accountFab = document.getElementById('account-fab');
export const menuHud = document.getElementById('menu-hud');
export const shopButton = document.getElementById('shop-button');

export const menuButtons = document.querySelectorAll('#menu-screen .menu-button');
export const gameModeButtons = document.querySelectorAll('#game-mode-screen .menu-button');
export const deathButtons = [restartButton, menuButton];

export const soundToggle = document.getElementById('sound-toggle');
export const walkingSoundToggle = document.getElementById('walking-sound-toggle');
export const catToggle = document.getElementById('cat-toggle');
export const jazzToggle = document.getElementById('jazz-toggle');
export const swipeToggle = document.getElementById('swipe-toggle');
export const settingsBackButton = document.getElementById('settings-back-button');
export const settingItems = document.querySelectorAll('.setting-item');

export const personalScoresContainer = document.getElementById('personal-scores-container');
export const personalLeaderboardButton = document.getElementById('personal-leaderboard-button');
export const globalLeaderboardButton = document.getElementById('global-leaderboard-button');
export const backFromLeaderboardButton = document.getElementById('back-from-leaderboard-button');
export const backFromPersonalButton = document.getElementById('back-from-personal-button');
export const backFromGlobalButton = document.getElementById('back-from-global-button');
export const normalScoresContainer = document.getElementById('normal-scores-container');
export const timeAttackScoresContainer = document.getElementById('time-attack-scores-container');
export const blackoutScoresContainer = document.getElementById('blackout-scores-container');
export const confirmBombButton = document.getElementById('confirm-bomb-button');
export const cancelBombButton = document.getElementById('cancel-bomb-button');

export const personalButtons = [
  document.getElementById('normal-mode-scores-button'),
  document.getElementById('time-attack-scores-button'),
  document.getElementById('blackout-scores-button'),
  backFromPersonalButton,
];

export const leaderboardButtons = [
  personalLeaderboardButton,
  globalLeaderboardButton,
  backFromLeaderboardButton,
];

export const settingsElements = [
  soundToggle,
  walkingSoundToggle,
  catToggle,
  jazzToggle,
  swipeToggle,
  settingsBackButton,
];
