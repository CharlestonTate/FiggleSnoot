// Audio Management - Sound effects and music
import { soundToggle } from './dom-elements.js';

// Sound effects
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
export const dyingSound = new Audio('sounds/BADWIGGLE.mp3');
export const badWiggleSound = new Audio('sounds/BADWIGGLE.mp3');
export const warpWarpSound = new Audio('sounds/WARPWARP.mp3');

// Online background music for global leaderboard
export const onlineSound1 = new Audio('onlinesounds/january2016online3.mp3');
export const onlineSound2 = new Audio('onlinesounds/july2014online2.mp3');
export const onlineSound3 = new Audio('onlinesounds/sep2015online1.mp3');
export const onlineSounds = [onlineSound1, onlineSound2, onlineSound3];

// Configure online sounds
onlineSounds.forEach(sound => {
  sound.loop = true;
  sound.volume = 0;
});
birthdaySound.loop = true;
jazzSound.loop = true;

// Sound state tracking
export let nextSound = cycleUpSound;
export let nextMovementSound = patterSound;

// Universal sound playing function that respects the sound toggle
export function playSound(audio) {
  if (soundToggle && soundToggle.checked) {
    audio.currentTime = 0;
    audio.play();
  }
}

// Universal walking sound function that respects both toggles
export function playWalkingSound(audio) {
  if (soundToggle && soundToggle.checked && window.walkingSoundEnabled) {
    audio.currentTime = 0;
    audio.play();
  }
}

export function playNextSound() {
  playSound(nextSound);
  nextSound = nextSound === cycleUpSound ? cycleDownSound : cycleUpSound;
}
