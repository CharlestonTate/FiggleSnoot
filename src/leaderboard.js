import {
  personalLeaderboardScreen,
  personalScoresContainer, personalLeaderboardButton, globalLeaderboardButton,
  backFromLeaderboardButton, backFromPersonalButton, backFromGlobalButton,
  normalModeScoresScreen, timeAttackScoresScreen, blackoutScoresScreen,
  normalScoresContainer, timeAttackScoresContainer, blackoutScoresContainer,
  confirmBombButton, cancelBombButton, personalButtons,
  leaderboardButtons,
} from './dom-elements.js';
import { switchScreens, hideScreen, showScreen } from './screens.js';
import { withTrustedStorageWrite } from './integrity.js';
import {
  playSound, selectSound, dungSound, badWiggleSound, boomSmallSound,
} from './audio.js';
import { updateCoinDisplay } from './game.js';
import { soundToggle } from './dom-elements.js';

let currentGlobalMusic = null;
let activeGlobalMode = 'base';
let currentClearingContainer = null;
let globalIntroTimer = null;
let globalIntroResolve = null;

const SEEN_ONLINE_KEY = 'figglesnoot_seen_online_leaderboard';

const leaderboardScreens = {
  normal: {
    screen: normalModeScoresScreen,
    backButton: document.getElementById('back-from-normal-scores-button'),
    container: normalScoresContainer,
  },
  timeAttack: {
    screen: timeAttackScoresScreen,
    backButton: document.getElementById('back-from-time-attack-scores-button'),
    container: timeAttackScoresContainer,
  },
  blackout: {
    screen: blackoutScoresScreen,
    backButton: document.getElementById('back-from-blackout-scores-button'),
    container: blackoutScoresContainer,
  },
};

export function initLeaderboard(onMenuEnter, onMenuLeave) {
  document.getElementById('leaderboard-button').addEventListener('click', () => {
    playSound(selectSound);
    switchScreens('menu', 'leaderboard');
    window.dispatchEvent(new CustomEvent('leaderboard:reset'));
  });

  personalLeaderboardButton.addEventListener('click', () => {
    playSound(selectSound);
    switchScreens('leaderboard', 'personalLeaderboard');
    displayPersonalScores();
  });

  globalLeaderboardButton.addEventListener('click', () => {
    openGlobalLeaderboard();
  });

  document.getElementById('back-from-global-intro-button')?.addEventListener('click', () => {
    cancelGlobalIntro();
    playSound(dungSound);
    switchScreens('globalLeaderboard', 'leaderboard');
    window.dispatchEvent(new CustomEvent('leaderboard:reset'));
  });

  backFromLeaderboardButton.addEventListener('click', () => {
    playSound(dungSound);
    switchScreens('leaderboard', 'menu');
    updateCoinDisplay();
    onMenuEnter?.();
  });

  backFromPersonalButton.addEventListener('click', () => {
    playSound(dungSound);
    switchScreens('personalLeaderboard', 'menu');
    updateCoinDisplay();
    onMenuEnter?.();
  });

  backFromGlobalButton.addEventListener('click', () => {
    playSound(dungSound);
    stopGlobalLeaderboardMusic();
    switchScreens('globalLeaderboard', 'leaderboard');
    window.dispatchEvent(new CustomEvent('leaderboard:reset'));
  });

  document.getElementById('normal-mode-scores-button').addEventListener('click', () => {
    playSound(selectSound);
    switchScreens('personalLeaderboard', 'normalScores');
    displayNormalModeScores();
  });

  document.getElementById('time-attack-scores-button').addEventListener('click', () => {
    playSound(selectSound);
    switchScreens('personalLeaderboard', 'timeAttackScores');
    displayTimeAttackScores();
  });

  document.getElementById('blackout-scores-button').addEventListener('click', () => {
    playSound(selectSound);
    switchScreens('personalLeaderboard', 'blackoutScores');
    displayBlackoutScores();
  });

  Object.values(leaderboardScreens).forEach((data) => {
    data.backButton?.addEventListener('click', navigateBackToPersonalLeaderboard);
    data.backButton?.addEventListener('mouseenter', () => {
      document.querySelectorAll('.menu-button.selected, .bomb-button.selected, .menu-button.hover, .bomb-button.hover').forEach((btn) => {
        btn.classList.remove('selected', 'hover');
      });
      data.backButton.classList.add('selected', 'hover');
    });
  });

  confirmBombButton.addEventListener('click', () => {
    playSound(badWiggleSound);
    clearScores();
  });

  cancelBombButton.addEventListener('click', () => {
    playSound(dungSound);
    hideBombConfirmation();
  });

  document.querySelectorAll('.global-mode-tabs .menu-button').forEach((tab) => {
    tab.addEventListener('click', () => {
      playSound(selectSound);
      document.querySelectorAll('.global-mode-tabs .menu-button').forEach((t) => t.classList.remove('selected'));
      tab.classList.add('selected');
      activeGlobalMode = tab.dataset.mode || 'base';
      const container = document.getElementById('global-scores-container');
      if (container) delete container.dataset.showAll;
      loadGlobalLeaderboard(activeGlobalMode);
    });
  });
}

export function getCurrentLeaderboardScreen() {
  for (const data of Object.values(leaderboardScreens)) {
    if (!data.screen.classList.contains('hidden')) {
      return data;
    }
  }
  return null;
}

export function handleGameModeScoresNavigation(event) {
  const currentScreen = getCurrentLeaderboardScreen();
  if (!currentScreen?.backButton) return;

  const backButton = currentScreen.backButton;
  // how many times am I going to use this, idk
  if (!backButton.classList.contains('selected')) {
    backButton.classList.add('selected', 'hover');
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    navigateBackToPersonalLeaderboard();
  }
}

export function handleGlobalLeaderboardNavigation(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    playSound(dungSound);
    backFromGlobalButton.click();
  }
}

export function showBombConfirmation(container) {
  currentClearingContainer = container;
  const currentScreenEl = container.closest('.screen');
  if (currentScreenEl) {
    currentScreenEl.dataset.previousScreen = currentScreenEl.id;
    currentScreenEl.classList.add('hidden');
  }
  showScreen('bomb');
  window.dispatchEvent(new CustomEvent('bomb:reset'));
}

export function hideBombConfirmation() {
  hideScreen('bomb');
  const previousScreen = document.querySelector('.screen[data-previous-screen]');
  if (previousScreen) {
    previousScreen.classList.remove('hidden');
    delete previousScreen.dataset.previousScreen;
  } else {
    showScreen('personalLeaderboard');
  }
}

function navigateBackToPersonalLeaderboard() {
  hideScreen('normalScores');
  hideScreen('timeAttackScores');
  hideScreen('blackoutScores');
  showScreen('personalLeaderboard');
  playSound(dungSound);
}

function displayPersonalScores() {
  const scores = JSON.parse(localStorage.getItem('figglesnoot_scores') || '[]');
  personalScoresContainer.innerHTML = '';

  if (scores.length === 0) {
    personalScoresContainer.innerHTML = '<div class="no-scores">No scores yet! Play some games to see your best levels here.</div>';
    return;
  }

  const topScores = scores.sort((a, b) => b.level - a.level).slice(0, 5);
  topScores.forEach((score, index) => {
    personalScoresContainer.appendChild(buildScoreEntry(score, index));
  });
}

function displayNormalModeScores() {
  displayModeScores(normalScoresContainer, getAllModeScores('base'), 'Normal');
}

function displayTimeAttackScores() {
  displayModeScores(timeAttackScoresContainer, getAllModeScores('timeAttack'), 'Time Attack');
}

function displayBlackoutScores() {
  displayModeScores(blackoutScoresContainer, getAllModeScores('blackout'), 'Blackout');
}

function hasSeenOnlineLeaderboard() {
  return localStorage.getItem(SEEN_ONLINE_KEY) === '1';
}

function markSeenOnlineLeaderboard() {
  localStorage.setItem(SEEN_ONLINE_KEY, '1');
}

/** Dev/lab helper — run `__FIGGLE_DEV__.resetGlobalIntro()` in the browser console to replay COMING SOON. */
export function resetGlobalIntro() {
  localStorage.removeItem(SEEN_ONLINE_KEY);
  console.log('[FiggleSnoot] Global intro reset. Open Leaderboard → Global to replay the cat explosion.');
  return true;
}

if (!import.meta.env.PROD && typeof window !== 'undefined') {
  window.__FIGGLE_DEV__ = {
    ...(window.__FIGGLE_DEV__ || {}),
    resetGlobalIntro,
  };
}

function showGlobalComingSoon() {
  document.getElementById('global-coming-soon')?.classList.remove('hidden');
  document.getElementById('global-leaderboard-content')?.classList.add('hidden');
}

function showGlobalLeaderboardContent() {
  document.getElementById('global-coming-soon')?.classList.add('hidden');
  document.getElementById('global-leaderboard-content')?.classList.remove('hidden');
}

function cancelGlobalIntro() {
  if (globalIntroTimer) {
    clearTimeout(globalIntroTimer);
    globalIntroTimer = null;
  }
  document.getElementById('global-cat-gif')?.classList.remove('cat-explode');
  globalIntroResolve?.();
  globalIntroResolve = null;
}

function playGlobalIntroAnimation() {
  return new Promise((resolve) => {
    globalIntroResolve = resolve;
    globalIntroTimer = setTimeout(() => {
      globalIntroTimer = null;
      const cat = document.getElementById('global-cat-gif');
      cat?.classList.add('cat-explode');
      playSound(boomSmallSound);
      setTimeout(() => {
        cat?.classList.remove('cat-explode');
        markSeenOnlineLeaderboard();
        resolve();
        globalIntroResolve = null;
      }, 700);
    }, 2000);
  });
}

async function openGlobalLeaderboard() {
  playSound(selectSound);
  switchScreens('leaderboard', 'globalLeaderboard');
  startGlobalLeaderboardMusic();

  if (!hasSeenOnlineLeaderboard()) {
    showGlobalComingSoon();
    await playGlobalIntroAnimation();
    showGlobalLeaderboardContent();
  } else {
    showGlobalLeaderboardContent();
  }

  loadGlobalLeaderboard(activeGlobalMode);
}

function getAllModeScores(mode) {
  return JSON.parse(localStorage.getItem('figglesnoot_scores') || '[]')
    .filter((score) => score.mode === mode)
    .sort((a, b) => b.level - a.level);
}

function displayModeScores(container, allScores, mode) {
  const showAll = container.dataset.showAll === 'true';
  const scores = showAll ? allScores : allScores.slice(0, 5);
  container.innerHTML = '';
  if (allScores.length === 0) {
    container.innerHTML = '<div class="no-scores">No scores yet! Play some games to see your best levels here.</div>';
  } else {
    scores.forEach((score, index) => {
      container.appendChild(buildScoreEntry(score, index, mode));
    });
    if (!showAll && allScores.length > 5) {
      const seeAllBtn = document.createElement('button');
      seeAllBtn.type = 'button';
      seeAllBtn.className = 'menu-button global-see-all-button';
      seeAllBtn.textContent = 'See All';
      seeAllBtn.addEventListener('click', () => {
        playSound(selectSound);
        container.dataset.showAll = 'true';
        displayModeScores(container, allScores, mode);
      });
      container.appendChild(seeAllBtn);
    }
  }
  addBombButton(container);
}

function buildScoreEntry(score, index, modeOverride) {
  const scoreEntry = document.createElement('div');
  scoreEntry.classList.add('score-entry');
  const mode = modeOverride || (score.mode === 'base' ? 'Normal'
    : score.mode === 'timeAttack' ? 'Time Attack'
      : score.mode === 'blackout' ? 'Blackout' : 'Unknown');
  const date = new Date(score.date).toLocaleDateString('en-GB').replace(/\//g, ' / ');
  scoreEntry.innerHTML = `
    <div class="rank">${index + 1}.</div>
    <div class="mode">${mode}</div>
    <div class="score">Level ${score.level || 1}</div>
    <div class="date">${date}</div>
  `;
  return scoreEntry;
}

function addBombButton(container) {
  const bombButton = document.createElement('button');
  bombButton.innerHTML = '💣';
  bombButton.classList.add('bomb-button');
  bombButton.title = 'Clear all scores';
  bombButton.onclick = () => {
    playSound(selectSound);
    showBombConfirmation(container);
  };
  container.appendChild(bombButton);
}

function clearScores() {
  if (!currentClearingContainer) return;

  const scores = JSON.parse(localStorage.getItem('figglesnoot_scores') || '[]');
  const modeMap = {
    'normal-scores-container': 'base',
    'time-attack-scores-container': 'timeAttack',
    'blackout-scores-container': 'blackout',
  };
  const modeToClear = modeMap[currentClearingContainer.id];

  if (modeToClear) {
    withTrustedStorageWrite(() => {
      localStorage.setItem('figglesnoot_scores', JSON.stringify(
        scores.filter((score) => score.mode !== modeToClear)
      ));
    });
    hideBombConfirmation();
    const currentScreen = currentClearingContainer.closest('.screen');
    if (currentScreen?.id === 'normal-mode-scores-screen') displayNormalModeScores();
    else if (currentScreen?.id === 'time-attack-scores-screen') displayTimeAttackScores();
    else if (currentScreen?.id === 'blackout-scores-screen') displayBlackoutScores();
  }
}

function startGlobalLeaderboardMusic() {
  stopGlobalLeaderboardMusic();
  const tracks = [
    'onlinesounds/january2016online3.mp3',
    'onlinesounds/july2014online2.mp3',
    'onlinesounds/sep2015online1.mp3',
  ];
  currentGlobalMusic = new Audio(tracks[Math.floor(Math.random() * tracks.length)]);
  currentGlobalMusic.volume = 0;
  currentGlobalMusic.loop = true;
  if (soundToggle?.checked) {
    currentGlobalMusic.play().then(() => fadeInMusic(currentGlobalMusic, 0.3, 2000)).catch(() => {});
  }
}

function stopGlobalLeaderboardMusic() {
  if (currentGlobalMusic) {
    fadeOutMusic(currentGlobalMusic, 500);
    currentGlobalMusic = null;
  }
}

function fadeInMusic(audio, targetVolume, duration) {
  const steps = 30;
  const stepDuration = duration / steps;
  const volumeStep = targetVolume / steps;
  let currentStep = 0;
  const fadeInterval = setInterval(() => {
    if (currentStep < steps) {
      audio.volume = volumeStep * currentStep;
      currentStep++;
    } else {
      audio.volume = targetVolume;
      clearInterval(fadeInterval);
    }
  }, stepDuration);
}

function fadeOutMusic(audio, duration) {
  const steps = 30;
  const stepDuration = duration / steps;
  const startVolume = audio.volume;
  const volumeStep = startVolume / steps;
  let currentStep = 0;
  const fadeInterval = setInterval(() => {
    if (currentStep < steps) {
      audio.volume = startVolume - (volumeStep * currentStep);
      currentStep++;
    } else {
      audio.volume = 0;
      audio.pause();
      clearInterval(fadeInterval);
    }
  }, stepDuration);
}

export { leaderboardButtons, personalButtons, hideBombConfirmation as dismissBombConfirmation };

async function loadGlobalLeaderboard(mode) {
  const container = document.getElementById('global-scores-container');
  const status = document.getElementById('global-scores-status');
  if (!container) return;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (status) status.textContent = 'Offline — connect to view global scores.';
    container.innerHTML = '<div class="no-scores">Playing local only. Global board needs internet.</div>';
    return;
  }

  if (status) status.textContent = '';
  container.innerHTML = `
    <div class="loading-spinner-wrap">
      <div class="loading-spinner" role="status" aria-label="Loading"></div>
      <p class="loading-spinner-text">Loading scores…</p>
    </div>
  `;

  try {
    const { bootstrapOnlineServices, getOnlineModule } = await import('./bootstrap-online.js');
    await bootstrapOnlineServices();
    const online = getOnlineModule();
    if (!online) throw new Error('Online module unavailable');

    const scores = await online.fetchTopScores(mode);
    online.renderGlobalScores(container, scores, mode);
    if (status) status.textContent = '';
  } catch (err) {
    console.warn('Global leaderboard load failed:', err);
    if (status) status.textContent = 'Could not load leaderboard.';
    container.innerHTML = '<div class="no-scores">Offline or unavailable — try again later.</div>';
  }
}
