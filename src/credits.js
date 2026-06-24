import { playSound } from './audio.js';
import { leaveMenu } from './menus.js';
import { navigateTo } from './screens.js';

/**
 * Credits screen: plays party sound, then shows creator/friends text with fade in/out, then returns to title screen with fade.
 */
const partySound = new Audio('sounds/YEAHYEAHPARTY.mp3');
const FADE_MS = 200;
const HOLD_SINGLETON_MS = 3000;
const HOLD_FRIENDS_MS = 2100;

let overlay = null;
let slideEl = null;

function createOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'credits-overlay';
  overlay.className = 'credits-overlay';
  overlay.style.cssText = [
    'position: fixed', 'top: 0', 'left: 0', 'width: 100%', 'height: 100%',
    'background: #1f1c2c', 'display: flex', 'flex-direction: column',
    'align-items: center', 'justify-content: center', 'z-index: 9999',
    'opacity: 0', `transition: opacity ${FADE_MS / 1000}s ease-out`, 'pointer-events: auto',
  ].join(';');

  slideEl = document.createElement('div');
  slideEl.className = 'credits-slide';
  slideEl.style.cssText = [
    'position: absolute', 'display: flex', 'align-items: center', 'justify-content: center',
    'width: 100%', 'height: 100%', 'opacity: 0', 'font-size: 1.8rem', 'font-weight: 700',
    'color: #fff', 'font-family: Poppins, sans-serif', 'text-align: center', 'padding: 20px',
    `transition: opacity ${FADE_MS / 1000}s ease-out`, 'pointer-events: none',
  ].join(';');

  overlay.appendChild(slideEl);
  overlay.style.display = 'none';
  document.body.appendChild(overlay);
  return overlay;
}

function showOverlay() {
  createOverlay();
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  overlay.classList.add('credits-visible');
}

function fadeIn(el, done) {
  el.style.display = 'flex';
  el.style.opacity = '0';
  el.offsetHeight;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      setTimeout(done || (() => {}), FADE_MS);
    });
  });
}

function fadeOut(el, done) {
  el.style.opacity = '0';
  setTimeout(() => {
    el.style.display = 'none';
    if (done) done();
  }, FADE_MS);
}

function goToTitleScreen() {
  leaveMenu();
  navigateTo('title');

  const titleScreen = document.getElementById('title-screen');
  if (!titleScreen) return;
  titleScreen.style.transition = `opacity ${FADE_MS / 1000}s ease-out`;
  titleScreen.style.opacity = '0';
  titleScreen.classList.remove('hidden');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      titleScreen.style.opacity = '1';
    });
  });
  setTimeout(() => {
    titleScreen.style.opacity = '';
    titleScreen.style.transition = '';
  }, FADE_MS);
}

function runSequence() {
  leaveMenu();
  navigateTo(null);

  showOverlay();
  overlay.style.display = 'flex';
  slideEl.style.display = 'none';

  function returnToTitle() {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      goToTitleScreen();
    }, FADE_MS);
  }

  slideEl.textContent = 'a game by c. t. singleton';
  slideEl.style.display = 'flex';
  slideEl.style.opacity = '0';

  fadeIn(slideEl, () => {
    setTimeout(() => {
      fadeOut(slideEl, () => {
        slideEl.textContent = 'i made this for all my friends';
        slideEl.style.display = 'flex';
        slideEl.style.opacity = '0';
        fadeIn(slideEl, () => {
          setTimeout(() => {
            fadeOut(slideEl, () => returnToTitle());
          }, HOLD_FRIENDS_MS);
        });
      });
    }, HOLD_SINGLETON_MS);
  });
}

function onCreditsClick() {
  playSound(partySound);
  runSequence();
}

export function initCredits() {
  const btn = document.getElementById('credits-button');
  if (btn) btn.addEventListener('click', onCreditsClick);
}
