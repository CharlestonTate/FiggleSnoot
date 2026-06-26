import { playButton } from './dom-elements.js';
import { isScreenVisible } from './screens.js';
import { playSound, warpSound } from './audio.js';
import { loadSettings } from './settings.js';

function updateTitleCoinDisplay() {
  const el = document.getElementById('coin-count');
  if (!el) return;
  const n = parseInt(localStorage.getItem('figglesnoot_coins') || '0', 10);
  el.textContent = Number.isNaN(n) ? '0' : String(n);
}

/** Title screen only — runs before PLAY; no Firebase or game modules. */
export function initTitleScreen() {
  loadSettings();
  updateTitleCoinDisplay();

  const titleText = document.querySelector('#title-screen h1');
  if (!titleText) return;

  titleText.innerHTML = '<span class="figgle">FIGGLE</span><span class="snoot">SNOOT</span>';

  const titleState = { figgle: 'FIGGLE', snoot: 'SNOOT' };

  titleText.querySelector('.figgle')?.addEventListener('click', () => {
    playSound(warpSound);
    titleState.figgle = titleState.figgle === 'FIGGLE' ? 'FOGGLER' : 'FIGGLE';
    titleText.querySelector('.figgle').textContent = titleState.figgle;
  });

  titleText.querySelector('.snoot')?.addEventListener('click', () => {
    playSound(warpSound);
    titleState.snoot = titleState.snoot === 'SNOOT' ? 'SNITCH' : 'SNOOT';
    titleText.querySelector('.snoot').textContent = titleState.snoot;
  });
}

/** First PLAY click loads the rest of the app. */
export function initPlayGate(startAppSession) {
  const enterGame = () => {
    startAppSession();
  };

  playButton?.addEventListener('click', enterGame);

  document.addEventListener('keydown', (event) => {
    if (isScreenVisible('title') && event.key === 'Enter' && document.activeElement.tagName !== 'BUTTON') {
      event.preventDefault();
      enterGame();
    }
  });
}
