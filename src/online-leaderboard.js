import { httpsCallable } from 'firebase/functions';
import {
  collection, doc, getDocs, query, orderBy, limit, setDoc, serverTimestamp,
} from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { db, functions, isFirebaseConfigured } from './firebase.js';
import { isSignedIn, getCurrentUser, getDisplayName } from './auth.js';
import { isOnline, withTimeout } from './network.js';

const MODE_LABELS = {
  base: 'Normal',
  timeAttack: 'Time Attack',
  blackout: 'Blackout',
};

const RANK_1_MESSAGES = [
  'Wow you are the best in the world',
  'I honestly have nothing bad to say',
  'You are pretty good... for now.',
  'Tate wants to dap you up for this.',
];

const RANK_2_MESSAGES = [
  'Second... really?',
  'That was good, but not great.',
  'To be the best you need to beat the best',
];

const RANK_3_MESSAGES = [
  'Bronze medal energy. Keep grinding.',
  'Third place — podium finish, not perfection.',
  'So close to greatness. One more run.',
];

function pickRandom(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function getRankFlavorMessage(rank) {
  if (rank === 1) return pickRandom(RANK_1_MESSAGES);
  if (rank === 2) return pickRandom(RANK_2_MESSAGES);
  if (rank === 3) return pickRandom(RANK_3_MESSAGES);
  return null;
}

function isBetter(a, b, mode) {
  if (a.level !== b.level) return a.level > b.level;
  if (mode === 'timeAttack') return a.time > b.time;
  return a.time < b.time;
}

function countBetterThan(entries, run, mode, excludeUid = null) {
  return entries.filter((entry) => {
    if (excludeUid && entry.uid === excludeUid) return false;
    return isBetter(entry, run, mode);
  }).length;
}

function computeGlobalRank(entries, run, mode) {
  return countBetterThan(entries, run, mode) + 1;
}

function compareScoreLocally(entries, mode, level, time, uid) {
  const run = { level, time, uid };
  const existing = entries.find((e) => e.uid === uid) || null;
  const countBetter = countBetterThan(entries, run, mode);
  const isGlobalPB = !existing || isBetter(run, existing, mode);
  const currentGlobalRank = isGlobalPB
    ? computeGlobalRank(entries, run, mode)
    : (existing ? computeGlobalRank(entries, existing, mode) : null);
  return { countBetter, isGlobalPB, currentGlobalRank };
}

export function getModeLabel(mode) {
  return MODE_LABELS[mode] || mode;
}

async function fetchAllEntries(mode) {
  if (!db) return [];
  const snap = await withTimeout(getDocs(collection(db, 'leaderboards', mode, 'entries')));
  return snap.docs.map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() }));
}

async function submitScoreDirect(mode, level, time, uid) {
  if (!db) return null;

  const entries = await fetchAllEntries(mode);
  const existing = entries.find((e) => e.uid === uid);
  const run = { level, time };

  if (existing && !isBetter(run, existing, mode)) {
    return null;
  }

  const displayName = getDisplayName() || getCurrentUser()?.email?.split('@')[0] || 'Player';
  await setDoc(doc(db, 'leaderboards', mode, 'entries', uid), {
    level,
    time,
    displayName,
    updatedAt: serverTimestamp(),
  });

  const updated = await fetchAllEntries(mode);
  const globalRank = computeGlobalRank(updated, run, mode);
  return { globalRank, isNewPB: true };
}

export async function getScoreComparison(mode, level, time) {
  if (!isFirebaseConfigured || !isOnline()) return null;

  const uid = getCurrentUser()?.uid;
  if (!uid) return null;

  const runLocalCompare = async () => {
    const entries = await fetchAllEntries(mode);
    return compareScoreLocally(entries, mode, level, time, uid);
  };

  if (!functions) {
    return runLocalCompare();
  }

  try {
    const fn = httpsCallable(functions, 'getScoreComparison');
    const result = await withTimeout(fn({ mode, level, time }));
    return result.data;
  } catch (err) {
    console.warn('Cloud compare unavailable, using Firestore fallback:', err);
    return runLocalCompare();
  }
}

export async function submitScore(mode, level, time) {
  if (!isFirebaseConfigured || !isOnline()) return null;

  const uid = getCurrentUser()?.uid;
  if (!uid) return null;

  if (functions) {
    try {
      const fn = httpsCallable(functions, 'submitScore');
      const result = await withTimeout(fn({ mode, level, time }));
      return result.data;
    } catch (err) {
      console.warn('Cloud submit unavailable, saving to Firestore directly:', err);
    }
  }

  try {
    return await submitScoreDirect(mode, level, time, uid);
  } catch (err) {
    console.warn('Direct score save failed:', err);
    return null;
  }
}

function describeOnlineError(err) {
  const code = err?.code || '';
  if (code === 'functions/not-found' || code === 'functions/unavailable') {
    return 'Global ranking server is not set up yet (Firebase Blaze plan required).';
  }
  if (code === 'unauthenticated') {
    return 'Sign in to compare your score globally.';
  }
  if (err?.message?.includes('Failed to fetch') || code === 'auth/network-request-failed') {
    return 'Network blocked — try disabling ad blockers or use another browser.';
  }
  return 'Could not reach leaderboard — local scores saved.';
}

export function fireConfetti() {
  const duration = 3200;
  const end = Date.now() + duration;
  const colors = ['#ff7eb3', '#457b9d', '#2a9d8f', '#FFE393', '#ffffff', '#ffb347'];

  confetti({
    particleCount: 150,
    spread: 120,
    origin: { x: 0.5, y: 0.5 },
    startVelocity: 55,
    gravity: 0.9,
    scalar: 1.2,
    colors,
  });

  const frame = () => {
    confetti({
      particleCount: 20,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      startVelocity: 35,
      ticks: 80,
      scalar: 1.1,
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

function renderPersonalBestMessage(rank) {
  const flavor = getRankFlavorMessage(rank);
  return `
    <p class="online-death-pb">New personal best!</p>
    <p class="online-death-rank">Global rank: #${rank ?? '?'}</p>
    ${flavor ? `<p class="online-death-flavor">${flavor}</p>` : ''}
  `;
}

/**
 * Called on death — updates #online-death-message. Skips entirely when offline.
 * Local scores in localStorage are always saved separately in game.js.
 */
export async function handleOnlineScoreResult({ mode, level, time }) {
  const container = document.getElementById('online-death-message');
  if (!container) return;

  container.innerHTML = '';
  container.classList.remove('hidden');

  if (!isOnline()) {
    container.innerHTML = '<p class="online-death-hint">Offline — local scores only.</p>';
    return;
  }

  if (!isFirebaseConfigured) {
    container.innerHTML = '<p class="online-death-hint">Online leaderboard not configured.</p>';
    return;
  }

  if (!isSignedIn()) {
    container.innerHTML = `
      <p class="online-death-hint">Make an account to compare your score!</p>
      <button type="button" class="menu-button account-from-death-btn" id="death-go-account">Create Account</button>
    `;
    document.getElementById('death-go-account')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate:account'));
    });
    return;
  }

  container.innerHTML = '<p class="online-death-hint">Checking global rank…</p>';

  try {
    const comparison = await getScoreComparison(mode, level, time);
    if (!comparison) {
      container.innerHTML = '<p class="online-death-hint">Could not load global scores.</p>';
      return;
    }

    const { countBetter, isGlobalPB, currentGlobalRank } = comparison;

    if (isGlobalPB) {
      const submit = await submitScore(mode, level, time);
      const rank = submit?.globalRank ?? currentGlobalRank;
      fireConfetti();
      container.innerHTML = renderPersonalBestMessage(rank);
    } else {
      const n = countBetter ?? 0;
      const people = n === 1 ? '1 person is' : `${n} people are`;
      container.innerHTML = `<p class="online-death-hint">${people} better than you</p>`;
    }
  } catch (err) {
    container.innerHTML = `<p class="online-death-hint">${describeOnlineError(err)}</p>`;
    console.warn('Online score error:', err);
  }
}

export async function fetchTopScores(mode, topN = 25) {
  if (!isFirebaseConfigured || !db || !isOnline()) return [];

  const q = query(
    collection(db, 'leaderboards', mode, 'entries'),
    orderBy('level', 'desc'),
    limit(topN)
  );

  const snap = await withTimeout(getDocs(q));
  const entries = snap.docs.map((docSnap) => ({
    uid: docSnap.id,
    ...docSnap.data(),
  }));

  entries.sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    if (mode === 'timeAttack') return (b.time ?? 0) - (a.time ?? 0);
    return (a.time ?? 0) - (b.time ?? 0);
  });

  return entries.map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }));
}

export function renderGlobalScores(container, scores, mode) {
  if (!container) return;
  container.innerHTML = '';

  if (!isFirebaseConfigured) {
    container.innerHTML = '<div class="no-scores">Set Firebase env vars to enable global leaderboard.</div>';
    return;
  }

  if (scores.length === 0) {
    container.innerHTML = '<div class="no-scores">No global scores yet. Be the first!</div>';
    return;
  }

  scores.forEach((score) => {
    const entry = document.createElement('div');
    entry.classList.add('score-entry');
    const label = getModeLabel(mode);
    entry.innerHTML = `
      <div class="rank">${score.rank}.</div>
      <div class="mode">${score.displayName || 'Anonymous'}</div>
      <div class="score">Level ${score.level || 1}</div>
      <div class="date">${label}</div>
    `;
    container.appendChild(entry);
  });
}

export function initOnlineLeaderboard() {
  window.addEventListener('navigate:account', () => {
    window.dispatchEvent(new CustomEvent('menus:go-account'));
  });
}
