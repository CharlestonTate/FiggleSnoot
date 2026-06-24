import Hammer from 'hammerjs';
import { mobileControls, gameScreen } from './dom-elements.js';

let hammer = null;
let swipeEnabled = false;

let onMove = null;
let holdTimeout = null;
let holdInterval = null;
let activeButton = null;
let mobileControlsInitialized = false;

const REPEAT_DELAY_MS = 160;
const REPEAT_INTERVAL_MS = 110;

export function getHammer() {
  return hammer;
}

export function setHammer(instance) {
  hammer = instance;
}

export function setSwipeEnabled(enabled) {
  swipeEnabled = enabled;
  updateControlsVisibility();
}

export function isSwipeEnabled() {
  return swipeEnabled;
}

export function stopMobileHold() {
  clearTimeout(holdTimeout);
  clearInterval(holdInterval);
  holdTimeout = null;
  holdInterval = null;
  if (activeButton) {
    activeButton.classList.remove('pressed');
    activeButton = null;
  }
}

function directionFromButton(button) {
  switch (button?.id) {
    case 'up': return [0, -1];
    case 'down': return [0, 1];
    case 'left': return [-1, 0];
    case 'right': return [1, 0];
    default: return null;
  }
}

function fireMove(dx, dy) {
  onMove?.(dx, dy);
}

function beginHold(button) {
  const dir = directionFromButton(button);
  if (!dir) return;

  stopMobileHold();
  activeButton = button;
  button.classList.add('pressed');

  const [dx, dy] = dir;
  fireMove(dx, dy);

  holdTimeout = setTimeout(() => {
    holdInterval = setInterval(() => fireMove(dx, dy), REPEAT_INTERVAL_MS);
  }, REPEAT_DELAY_MS);
}

export function initMobileControls(moveCallback) {
  if (!mobileControls || mobileControlsInitialized) return;
  mobileControlsInitialized = true;
  onMove = moveCallback;

  mobileControls.addEventListener('pointerdown', (e) => {
    const button = e.target.closest('button');
    if (!button || !mobileControls.contains(button)) return;

    e.preventDefault();
    if (button.setPointerCapture) {
      try { button.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    }
    beginHold(button);
  }, { passive: false });

  const endHold = (e) => {
    if (activeButton && e.pointerId !== undefined && activeButton.hasPointerCapture?.(e.pointerId)) {
      try { activeButton.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    }
    stopMobileHold();
  };

  mobileControls.addEventListener('pointerup', endHold);
  mobileControls.addEventListener('pointercancel', endHold);
  mobileControls.addEventListener('pointerleave', (e) => {
    if (e.target === activeButton) stopMobileHold();
  });

  window.addEventListener('blur', stopMobileHold);

  mobileControls.querySelectorAll('button').forEach((button) => {
    button.style.touchAction = 'none';
  });
}

export function updateControlsVisibility() {
  if (!mobileControls) return;

  if (swipeEnabled) {
    stopMobileHold();
    mobileControls.classList.add('hidden');
    mobileControls.style.display = 'none';
    hammer?.get('swipe')?.set({ enable: true });
  } else {
    mobileControls.classList.remove('hidden');
    mobileControls.style.display = '';
    hammer?.get('swipe')?.set({ enable: false });
  }
}

export function initHammer(onSwipe) {
  if (!gameScreen) return;

  hammer = new Hammer(gameScreen, {
    touchAction: 'none',
    cssProps: { userSelect: 'none' },
    recognizers: [[Hammer.Swipe, { direction: Hammer.DIRECTION_ALL }]],
  });

  const swipe = hammer.get('swipe');
  swipe.set({
    direction: Hammer.DIRECTION_ALL,
    enable: false,
    threshold: 8,
    velocity: 0.12,
  });

  hammer.on('swipe', onSwipe);

  gameScreen.addEventListener('touchmove', (e) => {
    if (!gameScreen.classList.contains('hidden') && swipeEnabled) {
      e.preventDefault();
    }
  }, { passive: false });
}
