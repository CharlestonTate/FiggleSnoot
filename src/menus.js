import {

  playButton, restartButton, menuButton, menuButtons, gameModeButtons, deathButtons,

  consoleContainer, bombConfirmationPopup,

} from './dom-elements.js';

import { switchScreens, isScreenVisible } from './screens.js';

import {

  playSound, selectSound, dungSound, warpSound, birthdaySound, warfSound,

} from './audio.js';

import {

  createMenuNav, createMainMenuNav, createDeathMenuNav,

  createPersonalLeaderboardNav, createLeaderboardNav, createBombNav,

} from './menu-nav.js';

import {

  startGame, setCurrentGameMode, updateCoinDisplay, movePlayer,

} from './game.js';

import {

  initSettings, handleSettingsNavigation, resetSettingsNav, loadSettings,

} from './settings.js';

import {

  initLeaderboard, handleGameModeScoresNavigation, handleGlobalLeaderboardNavigation,

  leaderboardButtons, personalButtons, hideBombConfirmation,

} from './leaderboard.js';

import {

  initAccountScreen, onAccountScreenOpen, handleAccountNavigation,

} from './account-screen.js';



const mainMenuNav = createMainMenuNav(menuButtons);

const gameModeNav = createMenuNav(gameModeButtons);

const deathNav = createDeathMenuNav(deathButtons);

const personalNav = createPersonalLeaderboardNav(personalButtons);

const leaderboardNav = createLeaderboardNav(leaderboardButtons);

const bombNav = createBombNav(() => bombConfirmationPopup.querySelectorAll('.menu-button'));



/** Title screen only — first PLAY click runs startAppSession then opens menu */

export function initPlayGate(startAppSession) {

  const enterGame = () => {

    startAppSession();

    goToMenu();

  };



  playButton.addEventListener('click', enterGame);



  document.addEventListener('keydown', (event) => {

    if (isScreenVisible('title') && event.key === 'Enter' && document.activeElement.tagName !== 'BUTTON') {

      event.preventDefault();

      enterGame();

    }

  });

}



/** Full menu + game UI — runs once after first PLAY */

export function initAppMenus() {

  initSettings();

  initAccountScreen();



  document.getElementById('play-game-button').addEventListener('click', () => {

    switchScreens('menu', 'gameMode');

    gameModeNav.reset();

  });



  document.getElementById('normal-mode-button').addEventListener('click', () => {

    setCurrentGameMode('base');

    playSound(selectSound);

    startGame();

  });



  document.getElementById('time-attack-button').addEventListener('click', () => {

    setCurrentGameMode('timeAttack');

    playSound(selectSound);

    startGame();

  });



  document.getElementById('blackout-button').addEventListener('click', () => {

    setCurrentGameMode('blackout');

    playSound(selectSound);

    startGame();

  });



  document.getElementById('back-to-menu-button').addEventListener('click', () => {

    playSound(dungSound);

    switchScreens('gameMode', 'menu');

    updateCoinDisplay();

    mainMenuNav.reset();

  });



  document.getElementById('back-button').addEventListener('click', () => {

    playSound(dungSound);

    switchScreens('menu', 'title');

    mainMenuNav.reset();

  });



  document.getElementById('settings-button').addEventListener('click', () => {

    playSound(warfSound);

    switchScreens('menu', 'settings');

    resetSettingsNav();

  });



  document.getElementById('account-button').addEventListener('click', () => {

    playSound(selectSound);

    switchScreens('menu', 'account');

    onAccountScreenOpen();

  });



  window.addEventListener('account:back', () => {

    playSound(dungSound);

    switchScreens('account', 'menu');

    mainMenuNav.reset();

  });



  window.addEventListener('menus:go-account', () => {

    playSound(dungSound);

    switchScreens('gameOver', 'account');

    onAccountScreenOpen();

  });



  const goToMenuFromGameOver = () => {

    playSound(dungSound);

    birthdaySound.pause();

    birthdaySound.currentTime = 0;

    switchScreens('gameOver', 'menu');

    updateCoinDisplay();

    mainMenuNav.reset();

  };



  menuButton.addEventListener('click', goToMenuFromGameOver);



  restartButton.addEventListener('click', () => {

    birthdaySound.pause();

    birthdaySound.currentTime = 0;

    switchScreens('gameOver', 'game');

    startGame();

  });



  initLeaderboard(() => mainMenuNav.reset());



  window.addEventListener('menu:reset', () => mainMenuNav.reset());

  window.addEventListener('leaderboard:reset', () => leaderboardNav.reset());

  window.addEventListener('bomb:reset', () => bombNav.reset());



  document.addEventListener('keydown', handleKeyboardNavigation);



  deathNav.reset();

}



function goToMenu() {

  playSound(selectSound);

  switchScreens('title', 'menu');

  updateCoinDisplay();

  mainMenuNav.reset();

}



function handleKeyboardNavigation(event) {

  if (consoleContainer && consoleContainer.style.display !== 'none') return;



  if (isScreenVisible('game')) {

    if (event.repeat) return;

    const key = event.key.toLowerCase();

    switch (key) {

      case 'arrowup': case 'w': movePlayer(0, -1); break;

      case 'arrowdown': case 's': movePlayer(0, 1); break;

      case 'arrowleft': case 'a': movePlayer(-1, 0); break;

      case 'arrowright': case 'd': movePlayer(1, 0); break;

    }

    return;

  }



  if (isScreenVisible('gameOver')) { deathNav.handleKey(event); return; }

  if (isScreenVisible('menu')) { mainMenuNav.handleKey(event); return; }

  if (isScreenVisible('gameMode')) { gameModeNav.handleKey(event); return; }

  if (isScreenVisible('settings')) { handleSettingsNavigation(event); return; }

  if (isScreenVisible('account')) { handleAccountNavigation(event); return; }

  if (isScreenVisible('leaderboard')) { leaderboardNav.handleKey(event); return; }

  if (isScreenVisible('personalLeaderboard')) { personalNav.handleKey(event); return; }

  if (isScreenVisible('globalLeaderboard')) { handleGlobalLeaderboardNavigation(event); return; }

  if (isScreenVisible('normalScores') || isScreenVisible('timeAttackScores') || isScreenVisible('blackoutScores')) {

    handleGameModeScoresNavigation(event);

    return;

  }

  if (isScreenVisible('bomb')) {

    const result = bombNav.handleKey(event);

    if (result === 'escape') hideBombConfirmation();

  }

}



export function initTitleScreen() {

  loadSettings();

  updateCoinDisplay();



  const titleText = document.querySelector('#title-screen h1');

  titleText.innerHTML = '<span class="figgle">FIGGLE</span><span class="snoot">SNOOT</span>';



  const titleState = { figgle: 'FIGGLE', snoot: 'SNOOT' };



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

}


