/**
 * Console debug helpers — only attached when running `npm run dev`.
 * Use `figgle.level = 99` etc. Production builds omit this entirely.
 */
import {
  flagViolation,
  revealCheater,
  isIntegrityFlagged,
  isIntegrityTriggered,
  getIntegrityViolations,
  verifyRuntimeIntegrity,
  verifyIntegrity,
} from './integrity.js';

let levelGetter = () => 1;
let levelSetter = () => {};

export function registerLevelDebug(getLevel, setLevel) {
  levelGetter = getLevel;
  levelSetter = setLevel;
}

export function initDebug() {
  if (import.meta.env.PROD || typeof window === 'undefined') return;

  const figgle = {
    /** Current level — set while in a game: `figgle.level = 99` */
    get level() {
      return levelGetter();
    },
    set level(n) {
      levelSetter(n);
      console.log('[figgle] level =', levelGetter());
    },

    /** Show the white "nice try" screen */
    showNiceTry() {
      flagViolation('debug');
      revealCheater();
    },

    /** Flag tampering (die with a PB to trigger nice try) */
    flag(reason = 'debug') {
      flagViolation(reason);
      console.log('[figgle] flagged:', reason);
    },

    get flagged() {
      return isIntegrityFlagged();
    },

    get niceTryVisible() {
      return isIntegrityTriggered();
    },

    get violations() {
      return getIntegrityViolations();
    },

    check() {
      return verifyRuntimeIntegrity();
    },

    checkAssets() {
      return verifyIntegrity();
    },

    tamperScore() {
      localStorage.setItem('figglesnoot_scores', '[]');
    },

    tamperCoins() {
      localStorage.setItem('figglesnoot_coins', '9999');
    },

    tamperMaze() {
      document.querySelectorAll('#maze .obstacle').forEach((el) => {
        el.classList.remove('obstacle');
      });
      console.log('[figgle] obstacle classes removed — run figgle.check()');
    },

    resetGlobalIntro() {
      localStorage.removeItem('figglesnoot_seen_online_leaderboard');
      console.log('[figgle] Global intro reset — open Leaderboard → Global');
    },

    async testLeaderboard500() {
      const { getCurrentUser, getDisplayName } = await import('./auth.js');
      const { db } = await import('./firebase.js');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const uid = getCurrentUser()?.uid;
      if (!uid || !db) throw new Error('Sign in first (Firebase configured).');
      try {
        await setDoc(doc(db, 'leaderboards', 'base', 'entries', uid), {
          level: 500,
          time: 0,
          displayName: getDisplayName() || 'Player',
          skinId: 'default',
          updatedAt: serverTimestamp(),
        });
        console.warn('[figgle] rules did NOT block level-500');
      } catch (err) {
        console.log('[figgle] rules blocked level-500 (expected):', err.message);
      }
    },
  };

  window.figgle = figgle;
  console.info(
    '[FiggleSnoot] Debug ready — try: figgle.level = 99  |  figgle.showNiceTry()  |  figgle.flag()',
  );
}
