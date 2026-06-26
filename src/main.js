import { initScreens } from './screens.js';
import { initTitleScreen, initPlayGate } from './title-gate.js';
import { initIntegrity } from './integrity.js';
import { initFormInputState, isFormInputActive } from './form-input-state.js';
import { initDebug } from './debug.js';

const pressedKeys = {};

document.addEventListener('keydown', (event) => {
  if (isFormInputActive()) return;
  pressedKeys[event.key] = true;
});

document.addEventListener('keyup', (event) => {
  if (isFormInputActive()) {
    pressedKeys[event.key] = false;
    return;
  }
  pressedKeys[event.key] = false;
});

window.pressedKeys = pressedKeys;

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason?.name === 'AbortError' || reason?.code === 20) {
    event.preventDefault();
    return;
  }
  const msg = reason?.message || String(reason || '');
  if (msg.includes('Failed to fetch') || msg.includes('Load failed')) {
    event.preventDefault();
  }
});

function generateRandomMessage() {
  const randomNum = Math.floor(Math.random() * 6) + 1;
  if (randomNum === 6) {
    console.log('Katie smells really bad today she has armpit sweat stains - Natahan');
  }
}

let sessionStarted = false;

async function startAppSession() {
  if (sessionStarted) return;
  sessionStarted = true;

  const [menus, game, credits] = await Promise.all([
    import('./menus.js'),
    import('./game.js'),
    import('./credits.js'),
  ]);

  menus.initAppMenus();
  game.initGameControls();
  game.initConsole();
  credits.initCredits();

  generateRandomMessage();

  if (!import.meta.env.PROD) {
    import('./sound-test.js');
  }

  menus.goToMenu();
}

function init() {
  initFormInputState();
  initIntegrity();
  initDebug();
  initScreens();
  initTitleScreen();
  initPlayGate(startAppSession);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
