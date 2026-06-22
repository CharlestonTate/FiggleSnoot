import {
  soundToggle, walkingSoundToggle, catToggle, jazzToggle, swipeToggle,
  settingsBackButton, settingItems, settingsElements,
} from './dom-elements.js';
import {
  playSound, playNextSound, selectSound, dungSound, jazzSound, muteUiSounds,
} from './audio.js';
import { switchScreens } from './screens.js';
import { setSwipeEnabled } from './controls.js';

export let soundEnabled = true;
export let walkingSoundEnabled = false;
export let catModeEnabled = false;
export let jazzEnabled = false;
export let swipeEnabled = false;

let currentSettingIndex = 0;

export function initSettings() {
  walkingSoundToggle.checked = walkingSoundEnabled;
  jazzToggle.checked = jazzEnabled;
  swipeToggle.checked = swipeEnabled;
  updateSettingsSelection();

  settingsBackButton.addEventListener('click', () => {
    playSound(dungSound);
    switchScreens('settings', 'menu');
    window.dispatchEvent(new CustomEvent('menu:reset'));
  });

  settingItems.forEach((item, index) => {
    item.addEventListener('mouseenter', () => {
      currentSettingIndex = index;
      updateSettingsSelection();
    });
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const toggle = item.querySelector('input[type="checkbox"]');
      toggle.checked = !toggle.checked;
      handleSettingChange(toggle);
      playSound(selectSound);
    });
  });
}

export function updateSettingsSelection() {
  settingItems.forEach((item, index) => {
    item.classList.toggle('selected', index === currentSettingIndex);
  });
  settingsElements.forEach((element, index) => {
    if (element.classList.contains('menu-button')) {
      element.classList.toggle('selected', index === currentSettingIndex);
    }
  });
}

export function handleSettingsNavigation(event) {
  switch (event.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      event.preventDefault();
      currentSettingIndex = (currentSettingIndex - 1 + settingsElements.length) % settingsElements.length;
      updateSettingsSelection();
      playNextSound();
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      event.preventDefault();
      currentSettingIndex = (currentSettingIndex + 1) % settingsElements.length;
      updateSettingsSelection();
      playNextSound();
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (currentSettingIndex === settingsElements.length - 1) {
        playSound(dungSound);
        settingsBackButton.click();
      } else {
        const setting = settingsElements[currentSettingIndex];
        if (setting.type === 'checkbox') {
          setting.checked = !setting.checked;
          handleSettingChange(setting);
          if (setting.id === 'jazz-toggle' && setting.checked) {
            playSound(jazzSound);
          } else {
            playSound(selectSound);
          }
        }
      }
      break;
  }
}

export function handleSettingChange(toggle) {
  if (toggle === soundToggle) {
    soundEnabled = toggle.checked;
    muteUiSounds(!soundEnabled);
  } else if (toggle === walkingSoundToggle) {
    walkingSoundEnabled = toggle.checked;
  } else if (toggle === catToggle) {
    catModeEnabled = toggle.checked;
    const playerCell = document.querySelector('.cell.player');
    if (playerCell) playerCell.classList.toggle('cat-mode', catModeEnabled);
  } else if (toggle === jazzToggle) {
    jazzEnabled = toggle.checked;
    if (jazzEnabled) playSound(jazzSound);
    else jazzSound.pause();
  } else if (toggle === swipeToggle) {
    swipeEnabled = toggle.checked;
    setSwipeEnabled(swipeEnabled);
  }
  saveSettings();
}

export function saveSettings() {
  localStorage.setItem('figglesnootSettings', JSON.stringify({
    soundEnabled,
    walkingSoundEnabled,
    catModeEnabled,
    jazzEnabled,
    swipeEnabled,
  }));
}

export function loadSettings() {
  const savedSettings = localStorage.getItem('figglesnootSettings');
  if (!savedSettings) return;

  const settings = JSON.parse(savedSettings);
  soundEnabled = settings.soundEnabled;
  walkingSoundEnabled = settings.walkingSoundEnabled;
  catModeEnabled = settings.catModeEnabled;
  jazzEnabled = settings.jazzEnabled;
  swipeEnabled = settings.swipeEnabled;

  soundToggle.checked = soundEnabled;
  walkingSoundToggle.checked = walkingSoundEnabled;
  catToggle.checked = catModeEnabled;
  jazzToggle.checked = jazzEnabled;
  swipeToggle.checked = swipeEnabled;

  muteUiSounds(!soundEnabled);

  if (jazzEnabled) jazzSound.play();

  setSwipeEnabled(swipeEnabled);

  const playerCell = document.querySelector('.cell.player');
  if (playerCell) playerCell.classList.toggle('cat-mode', catModeEnabled);
}

export function resetSettingsNav() {
  currentSettingIndex = 0;
  updateSettingsSelection();
}
