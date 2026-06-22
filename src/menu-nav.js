import { playNextSound, playSound, selectSound, dungSound, warfSound } from './audio.js';

/**
 * Generic vertical menu keyboard + mouse navigation.
 * Replaces duplicated handle*Navigation functions for simple button lists.
 */
export function createMenuNav(buttons, options = {}) {
  let index = 0;
  const list = [...buttons];

  function update() {
    list.forEach((btn, i) => btn?.classList.toggle('selected', i === index));
  }

  function reset(newIndex = 0) {
    index = newIndex;
    update();
  }

  function handleKey(event) {
    const key = event.key;
    const lower = key.toLowerCase();

    if (key === 'ArrowUp' || lower === 'w') {
      event.preventDefault();
      index = (index - 1 + list.length) % list.length;
      update();
      playNextSound();
      return true;
    }

    if (key === 'ArrowDown' || lower === 's') {
      event.preventDefault();
      index = (index + 1) % list.length;
      update();
      playNextSound();
      return true;
    }

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (options.onEnter) {
        options.onEnter(index, list[index]);
      } else {
        playSound(selectSound);
      }
      list[index]?.click();
      return true;
    }

    return false;
  }

  list.forEach((btn, i) => {
    btn?.addEventListener('mouseenter', () => {
      index = i;
      update();
    });
  });

  return { handleKey, reset, update, getIndex: () => index };
}

/** Main menu enter sounds (first = warf, last = dung, middle = select) */
export function createMainMenuNav(buttons) {
  return createMenuNav(buttons, {
    onEnter(index) {
      if (index === 0) playSound(warfSound);
      else if (index === buttons.length - 1) playSound(dungSound);
      else playSound(selectSound);
    },
  });
}

/** Death screen enter sounds */
export function createDeathMenuNav(buttons) {
  return createMenuNav(buttons, {
    onEnter(index, btn) {
      if (btn?.id === 'menu-button') playSound(dungSound);
      else playSound(selectSound);
    },
  });
}

/** Personal leaderboard — last button uses dung, others select (direct play for middle) */
export function createPersonalLeaderboardNav(buttons) {
  return createMenuNav(buttons, {
    onEnter(index) {
      if (index === buttons.length - 1) playSound(dungSound);
      else {
        selectSound.currentTime = 0;
        selectSound.play();
      }
    },
  });
}

/** Horizontal leaderboard nav (personal / global / back) */
export function createLeaderboardNav(buttons) {
  let index = 0;

  function update() {
    buttons.forEach((btn, i) => {
      if (i === index) btn?.classList.add('selected');
      else btn?.classList.remove('selected');
    });
  }

  function reset(newIndex = 0) {
    index = newIndex;
    update();
  }

  function handleKey(event) {
    const key = event.key;
    const lower = key.toLowerCase();

    if (key === 'ArrowLeft' || lower === 'a') {
      if (index >= 2) return false;
      event.preventDefault();
      index = (index - 1 + 2) % 2;
      update();
      playNextSound();
      return true;
    }

    if (key === 'ArrowRight' || lower === 'd') {
      if (index >= 2) return false;
      event.preventDefault();
      index = (index + 1) % 2;
      update();
      playNextSound();
      return true;
    }

    if (key === 'ArrowDown' || lower === 's') {
      event.preventDefault();
      index = 2;
      update();
      playNextSound();
      return true;
    }

    if (key === 'ArrowUp' || lower === 'w') {
      if (index !== 2) return false;
      event.preventDefault();
      index = 0;
      update();
      playNextSound();
      return true;
    }

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (index === 2) playSound(dungSound);
      else playSound(selectSound);
      buttons[index]?.click();
      return true;
    }

    return false;
  }

  buttons.forEach((btn, i) => {
    btn?.addEventListener('mouseenter', () => {
      index = i;
      update();
    });
  });

  return { handleKey, reset, update };
}

/** Account screen — Sign In / Sign Up side-by-side, then Forgot, then Back */
export function createAccountNav(getButtons) {
  let index = 0;

  function update() {
    getButtons().forEach((btn, i) => btn?.classList.toggle('selected', i === index));
  }

  function reset(newIndex = 0) {
    index = newIndex;
    update();
  }

  function handleKey(event) {
    if (document.activeElement?.tagName === 'INPUT') return false;

    const buttons = getButtons().filter(Boolean);
    if (!buttons.length) return false;

    const key = event.key;
    const lower = key.toLowerCase();
    const authRow = buttons.length >= 4;

    if ((key === 'ArrowLeft' || lower === 'a') && authRow && (index === 0 || index === 1)) {
      event.preventDefault();
      index = index === 0 ? 1 : 0;
      update();
      playNextSound();
      return true;
    }

    if ((key === 'ArrowRight' || lower === 'd') && authRow && (index === 0 || index === 1)) {
      event.preventDefault();
      index = index === 0 ? 1 : 0;
      update();
      playNextSound();
      return true;
    }

    if (key === 'ArrowUp' || lower === 'w') {
      event.preventDefault();
      index = (index - 1 + buttons.length) % buttons.length;
      update();
      playNextSound();
      return true;
    }

    if (key === 'ArrowDown' || lower === 's') {
      event.preventDefault();
      index = (index + 1) % buttons.length;
      update();
      playNextSound();
      return true;
    }

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      const btn = buttons[index];
      if (btn?.id === 'account-back-button') playSound(dungSound);
      else playSound(selectSound);
      btn?.click();
      return true;
    }

    return false;
  }

  function bindHover() {
    getButtons().forEach((btn, i) => {
      btn?.addEventListener('mouseenter', () => {
        index = i;
        update();
      });
    });
  }

  return { handleKey, reset, update, bindHover };
}

/** Bomb confirmation popup nav */
export function createBombNav(getButtons) {
  let index = 0;

  function update() {
    getButtons().forEach((btn, i) => btn.classList.toggle('selected', i === index));
  }

  function reset() {
    index = 0;
    update();
  }

  function handleKey(event) {
    const buttons = getButtons();
    const key = event.key;
    const lower = key.toLowerCase();

    if (key === 'ArrowUp' || lower === 'w') {
      event.preventDefault();
      index = (index - 1 + buttons.length) % buttons.length;
      update();
      playNextSound();
      return true;
    }

    if (key === 'ArrowDown' || lower === 's') {
      event.preventDefault();
      index = (index + 1) % buttons.length;
      update();
      playNextSound();
      return true;
    }

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (index === 0) playSound(selectSound);
      else playSound(dungSound);
      buttons[index]?.click();
      return true;
    }

    if (key === 'Escape') {
      event.preventDefault();
      playSound(dungSound);
      return 'escape';
    }

    return false;
  }

  getButtons().forEach((btn, i) => {
    btn.addEventListener('mouseenter', () => {
      index = i;
      update();
    });
  });

  return { handleKey, reset, update, setIndex: (i) => { index = i; update(); } };
}
