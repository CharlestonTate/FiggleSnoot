import { initScreens } from './screens.js';

import { initTitleScreen, initPlayGate, initAppMenus } from './menus.js';

import { initGameControls, initConsole } from './game.js';

import { initCredits } from './credits.js';

import { initIntegrity } from './integrity.js';

const pressedKeys = {};

document.addEventListener('keydown', (event) => {
  pressedKeys[event.key] = true;
});

document.addEventListener('keyup', (event) => {
  pressedKeys[event.key] = false;
});

window.pressedKeys = pressedKeys;



function generateRandomMessage() {

  const randomNum = Math.floor(Math.random() * 6) + 1;

  if (randomNum === 6) {

    console.log('Katie smells really bad today she has armpit sweat stains - Natahan');

  }

}



let sessionStarted = false;



function startAppSession() {

  if (sessionStarted) return;

  sessionStarted = true;



  initAppMenus();

  initGameControls();

  initConsole();

  initCredits();

  generateRandomMessage();

  if (!import.meta.env.PROD) {
    import('./sound-test.js');
  }

  import('./bootstrap-online.js').then(({ bootstrapOnlineServices }) => {

    bootstrapOnlineServices();

  });

}



function init() {
  initIntegrity();

  initScreens();

  initTitleScreen();

  initPlayGate(startAppSession);
}



if (document.readyState === 'loading') {

  document.addEventListener('DOMContentLoaded', init);

} else {

  init();

}


