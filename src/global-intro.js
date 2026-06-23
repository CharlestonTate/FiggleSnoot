import { switchScreens } from './screens.js';
import { playSound, boomSmallSound } from './audio.js';

const SEEN_ONLINE_KEY = 'figglesnoot_seen_online_mode';
const INTRO_MS = 2000;
const EXPLODE_MS = 550;

export function hasSeenOnlineMode() {
  return localStorage.getItem(SEEN_ONLINE_KEY) === 'true';
}

export function markOnlineModeSeen() {
  localStorage.setItem(SEEN_ONLINE_KEY, 'true');
}

let introTimer = null;
let explodeTimer = null;

function clearIntroTimers() {
  if (introTimer) {
    clearTimeout(introTimer);
    introTimer = null;
  }
  if (explodeTimer) {
    clearTimeout(explodeTimer);
    explodeTimer = null;
  }
}

function resetIntroVisuals() {
  const cat = document.getElementById('global-intro-cat');
  const screen = document.getElementById('global-intro-screen');
  cat?.classList.remove('cat-explode');
  screen?.classList.remove('global-intro-flash');
}

/** First visit: COMING SOON + cat, then boom → real global leaderboard */
export function playGlobalIntro(fromScreen, onComplete) {
  clearIntroTimers();
  resetIntroVisuals();
  switchScreens(fromScreen, 'globalIntro');

  introTimer = setTimeout(() => {
    const cat = document.getElementById('global-intro-cat');
    const screen = document.getElementById('global-intro-screen');
    playSound(boomSmallSound);
    cat?.classList.add('cat-explode');
    screen?.classList.add('global-intro-flash');

    explodeTimer = setTimeout(() => {
      markOnlineModeSeen();
      resetIntroVisuals();
      onComplete?.();
    }, EXPLODE_MS);
  }, INTRO_MS);
}

export function cancelGlobalIntro() {
  clearIntroTimers();
  resetIntroVisuals();
}
