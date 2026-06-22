import { initScreens } from './screens.js';

import { initTitleScreen, initPlayGate, initAppMenus } from './menus.js';

import { initGameControls, initConsole } from './game.js';

import { initCredits } from './credits.js';



window.pressedKeys = {};



document.addEventListener('keydown', (event) => {

  window.pressedKeys[event.key] = true;

});



document.addEventListener('keyup', (event) => {

  window.pressedKeys[event.key] = false;

});



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

  import('./sound-test.js');

  import('./bootstrap-online.js').then(({ bootstrapOnlineServices }) => {

    bootstrapOnlineServices();

  });

}



function init() {

  initScreens();

  initTitleScreen();

  initPlayGate(startAppSession);

}



if (document.readyState === 'loading') {

  document.addEventListener('DOMContentLoaded', init);

} else {

  init();

}


