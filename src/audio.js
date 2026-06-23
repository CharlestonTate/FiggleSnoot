import { soundToggle, walkingSoundToggle } from './dom-elements.js';

export const cycleUpSound = new Audio('sounds/CYCLE1.mp3');
export const cycleDownSound = new Audio('sounds/CYCLE2.mp3');
export const selectSound = new Audio('sounds/YES.mp3');
export const deathSound = new Audio('sounds/CLAP1.mp3');
export const levelCompleteSound = new Audio('sounds/CLICK1.mp3');
export const warfSound = new Audio('sounds/WARF.mp3');
export const patterSound = new Audio('sounds/PATTER.mp3');
export const pitterSound = new Audio('sounds/PITTER.mp3');
export const dungSound = new Audio('sounds/DUNG.mp3');
export const warpSound = new Audio('sounds/WARPWARP.mp3');
export const jazzSound = new Audio('sounds/JAZZSTUFF.mp3');
export const birthdaySound = new Audio('sounds/BIRTHDAY.mp3');
export const missionCompleteSound = new Audio('sounds/MISSIONCOMPREET.mp3');
export const coinCollectSound = new Audio('sounds/POPTHING1.mp3');
export const dyingSound = new Audio('sounds/BADWIGGLE.mp3');
export const badWiggleSound = new Audio('sounds/BADWIGGLE.mp3');
export const boomSmallSound = new Audio('sounds/BOOMSMALL.wav');
export const warpWarpSound = new Audio('sounds/WARPWARP.mp3');

export const onlineSound1 = new Audio('onlinesounds/january2016online3.mp3');
export const onlineSound2 = new Audio('onlinesounds/july2014online2.mp3');
export const onlineSound3 = new Audio('onlinesounds/sep2015online1.mp3');
export const onlineSounds = [onlineSound1, onlineSound2, onlineSound3];

[onlineSound1, onlineSound2, onlineSound3].forEach((sound) => {
  sound.loop = true;
  sound.volume = 0;
});
birthdaySound.loop = true;
jazzSound.loop = true;

export let nextSound = cycleUpSound;
export let nextMovementSound = patterSound;

export const uiSounds = [
  cycleUpSound, cycleDownSound, selectSound, deathSound, levelCompleteSound,
  warfSound, patterSound, pitterSound, dungSound, warpSound, jazzSound, coinCollectSound,
];

export function playSound(audio) {
  if (soundToggle && soundToggle.checked) {
    audio.currentTime = 0;
    audio.play();
  }
}

export function playWalkingSound(audio) {
  if (soundToggle && soundToggle.checked && walkingSoundToggle && walkingSoundToggle.checked) {
    audio.currentTime = 0;
    audio.play();
  }
}

export function playNextSound() {
  playSound(nextSound);
  nextSound = nextSound === cycleUpSound ? cycleDownSound : cycleUpSound;
}

export function muteUiSounds(muted) {
  uiSounds.forEach((sound) => {
    sound.muted = muted;
  });
}

export function getMovementSound() {
  return nextMovementSound;
}

export function advanceMovementSound() {
  nextMovementSound = nextMovementSound === patterSound ? pitterSound : patterSound;
}

if (!import.meta.env.PROD && typeof window !== 'undefined') {
  window.playSound = playSound;
}
