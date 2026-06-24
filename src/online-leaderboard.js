import { httpsCallable } from 'firebase/functions';
import {
  collection, doc, getDoc, getDocs, query, orderBy, limit, setDoc, serverTimestamp,
} from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { db, functions, isFirebaseConfigured } from './firebase.js';
import { isSignedIn, getCurrentUser, getDisplayName } from './auth.js';
import { isOnline, withTimeout } from './network.js';
import { playSound, selectSound } from './audio.js';
import { assertIntegrityForRankedAction, isIntegrityTriggered } from './integrity.js';
import { getEquippedSkin, createSkinSwatchElement } from './skins.js';
import { appendHint, clearChildren } from './sanitize.js';
import { isIntegrityFlagged } from './integrity.js';

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

let activeRunId = null;
let activeRunMode = null;

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

function computeGlobalRank(entries, run, mode, excludeUid = null) {
  return countBetterThan(entries, run, mode, excludeUid) + 1;
}

function compareScoreLocally(entries, mode, level, time, uid) {
  const run = { level, time, uid };
  const existing = entries.find((e) => e.uid === uid) || null;
  const countBetter = countBetterThan(entries, run, mode, uid);
  const isGlobalPB = !existing || isBetter(run, existing, mode);
  const currentGlobalRank = isGlobalPB
    ? computeGlobalRank(entries, run, mode, uid)
    : (existing ? computeGlobalRank(entries, existing, mode, uid) : null);
  return { countBetter, isGlobalPB, currentGlobalRank };
}

export function getModeLabel(mode) {
  return MODE_LABELS[mode] || mode;
}

export function getActiveRunId() {
  return activeRunId;
}

export function clearActiveRun() {
  activeRunId = null;
  activeRunMode = null;
}

/** Spark-tier ranked session marker — direct Firestore submit when Functions unavailable. */
const SPARK_RUN_PREFIX = 'spark_';

/** Start a ranked session when a signed-in player begins a game. */
export async function startOnlineRun(mode) {
  clearActiveRun();
  if (isIntegrityTriggered() || isIntegrityFlagged()) return null;
  if (!isFirebaseConfigured || !isOnline() || !isSignedIn()) {
    return null;
  }

  const uid = getCurrentUser()?.uid;
  if (!uid) return null;

  if (functions) {
    try {
      const fn = httpsCallable(functions, 'startRun');
      const result = await withTimeout(fn({ mode }), 5000);
      if (result.data?.runId) {
        activeRunId = result.data.runId;
        activeRunMode = mode;
        return activeRunId;
      }
    } catch (err) {
      console.warn('startRun unavailable — using Firestore rules path:', err);
    }
  }

  activeRunId = `${SPARK_RUN_PREFIX}${mode}`;
  activeRunMode = mode;
  return activeRunId;
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

  const displayName = getDisplayName() || 'Player';
  const skinId = getEquippedSkin();
  await setDoc(doc(db, 'leaderboards', mode, 'entries', uid), {
    level,
    time,
    displayName,
    skinId,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  const updated = await fetchAllEntries(mode);
  const globalRank = computeGlobalRank(updated, run, mode, uid);
  return { globalRank, isNewPB: true };
}

export async function getScoreComparison(mode, level, time) {
  if (isIntegrityFlagged() || isIntegrityTriggered()) return null;
  if (!isFirebaseConfigured || !isOnline()) return null;

  const uid = getCurrentUser()?.uid;
  if (!uid) return null;

  const compareLocally = async () => {
    const entries = await fetchAllEntries(mode);
    return compareScoreLocally(entries, mode, level, time, uid);
  };

  if (functions) {
    try {
      const fn = httpsCallable(functions, 'getScoreComparison');
      const result = await withTimeout(fn({ mode, level, time }));
      return result.data;
    } catch (err) {
      console.warn('Cloud compare unavailable, using Firestore read:', err);
    }
  }

  return compareLocally();
}

export async function submitScore(mode, level, time) {
  if (isIntegrityFlagged() || isIntegrityTriggered()) return null;
  if (!isFirebaseConfigured || !isOnline() || !isSignedIn()) return null;

  await assertIntegrityForRankedAction();

  const uid = getCurrentUser()?.uid;
  if (!uid) return null;

  if (!activeRunId || activeRunMode !== mode) {
    console.warn('No active ranked session for this mode.');
    return null;
  }

  const useFunctions = functions && activeRunId && !activeRunId.startsWith(SPARK_RUN_PREFIX);
  if (useFunctions) {
    try {
      const fn = httpsCallable(functions, 'submitRun');
      const result = await withTimeout(fn({ runId: activeRunId, level, time }), 15000);
      clearActiveRun();
      return result.data;
    } catch (err) {
      console.warn('submitRun unavailable, saving via Firestore rules:', err);
    }
  }

  try {
    const result = await submitScoreDirect(mode, level, time, uid);
    clearActiveRun();
    return result;
  } catch (err) {
    console.warn('Direct score save failed:', err);
    throw err;
  }
}

function describeOnlineError(err) {
  const code = err?.code || '';
  if (code === 'functions/not-found' || code === 'functions/unavailable') {
    return 'Global ranking server unavailable — score saved locally.';
  }
  if (code === 'functions/internal') {
    return 'Could not save global score right now — local scores saved.';
  }
  if (code === 'unauthenticated') {
    return 'Sign in to compare your score globally.';
  }
  if (code === 'failed-precondition') {
    return 'Ranked submit unavailable — start a new game while signed in.';
  }
  if (err?.message?.includes('Failed to fetch') || code === 'auth/network-request-failed') {
    return 'Network blocked — try disabling ad blockers or use another browser.';
  }
  return 'Could not reach leaderboard — local scores saved.';
}

export function fireConfetti() {
  const colors = ['#ff7eb3', '#457b9d', '#2a9d8f', '#FFE393', '#ffffff', '#ffb347'];
  const zIndex = 10001;

  confetti({
    particleCount: 140,
    spread: 110,
    origin: { x: 0.5, y: 0.42 },
    startVelocity: 52,
    gravity: 1.15,
    scalar: 2.6,
    ticks: 90,
    zIndex,
    colors,
  });

  setTimeout(() => {
    confetti({
      particleCount: 70,
      angle: 60,
      spread: 60,
      origin: { x: 0.05, y: 0.55 },
      startVelocity: 48,
      scalar: 2.2,
      ticks: 80,
      zIndex,
      colors,
    });
    confetti({
      particleCount: 70,
      angle: 120,
      spread: 60,
      origin: { x: 0.95, y: 0.55 },
      startVelocity: 48,
      scalar: 2.2,
      ticks: 80,
      zIndex,
      colors,
    });
  }, 120);
}

function renderPersonalBestMessage(container, rank) {
  clearChildren(container);
  const pb = document.createElement('p');
  pb.className = 'online-death-pb';
  pb.textContent = 'New personal best!';
  container.appendChild(pb);

  const rankEl = document.createElement('p');
  rankEl.className = 'online-death-rank';
  rankEl.textContent = `Global rank: #${rank ?? '?'}`;
  container.appendChild(rankEl);

  const flavor = getRankFlavorMessage(rank);
  if (flavor) {
    const flavorEl = document.createElement('p');
    flavorEl.className = 'online-death-flavor';
    flavorEl.textContent = flavor;
    container.appendChild(flavorEl);
  }
}

/**
 * Called on death — updates #online-death-message. Skips entirely when offline.
 * Local scores in localStorage are always saved separately in game.js.
 */
export async function handleOnlineScoreResult({ mode, level, time }) {
  const container = document.getElementById('online-death-message');
  if (!container) return;

  clearChildren(container);
  container.classList.remove('hidden');

  if (isIntegrityFlagged() || isIntegrityTriggered()) return;

  if (!isOnline()) {
    appendHint(container, 'Offline — local scores only.');
    return;
  }

  if (!isFirebaseConfigured) {
    appendHint(container, 'Online leaderboard not configured.');
    return;
  }

  if (!isSignedIn()) {
    appendHint(container, 'Make an account to compare your score!');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-button account-from-death-btn';
    btn.id = 'death-go-account';
    btn.textContent = 'Create Account';
    btn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate:account'));
    });
    container.appendChild(btn);
    return;
  }

  appendHint(container, 'Checking global rank…');

  try {
    if (isIntegrityFlagged()) return;

    const comparison = await getScoreComparison(mode, level, time);
    if (!comparison) {
      clearChildren(container);
      appendHint(container, 'Could not load global scores.');
      return;
    }

    const { countBetter, isGlobalPB, currentGlobalRank } = comparison;

    if (isGlobalPB) {
      await assertIntegrityForRankedAction();
      if (isIntegrityTriggered()) return;
      if (!activeRunId) {
        clearChildren(container);
        appendHint(container, 'Ranked submit requires starting the game while signed in. Local scores saved.');
        return;
      }
      const submit = await submitScore(mode, level, time);
      const rank = submit?.globalRank ?? currentGlobalRank;
      fireConfetti();
      clearChildren(container);
      renderPersonalBestMessage(container, rank);
    } else {
      await assertIntegrityForRankedAction();
      clearActiveRun();
      clearChildren(container);
      const n = countBetter ?? 0;
      const people = n === 1 ? '1 person is' : `${n} people are`;
      appendHint(container, `${people} better than you`);
    }
  } catch (err) {
    clearActiveRun();
    clearChildren(container);
    appendHint(container, describeOnlineError(err));
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

export function renderGlobalScores(container, scores, mode, { showAll = false } = {}) {
  if (!container) return;
  clearChildren(container);

  if (!isFirebaseConfigured) {
    const msg = document.createElement('div');
    msg.className = 'no-scores';
    msg.textContent = 'Set Firebase env vars to enable global leaderboard.';
    container.appendChild(msg);
    return;
  }

  if (scores.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'no-scores';
    msg.textContent = 'No global scores yet. Be the first!';
    container.appendChild(msg);
    return;
  }

  const visible = showAll ? scores : scores.slice(0, 5);
  const label = getModeLabel(mode);

  visible.forEach((score) => {
    const entry = document.createElement('div');
    entry.classList.add('score-entry');

    const rank = document.createElement('div');
    rank.className = 'rank';
    rank.textContent = `${score.rank}.`;
    entry.appendChild(rank);

    const modeRow = document.createElement('div');
    modeRow.className = 'mode global-player-row';
    modeRow.appendChild(createSkinSwatchElement(score.skinId || 'default'));
    const name = document.createElement('span');
    name.className = 'leaderboard-player-name';
    name.textContent = score.displayName || 'Anonymous';
    modeRow.appendChild(name);
    entry.appendChild(modeRow);

    const levelEl = document.createElement('div');
    levelEl.className = 'score';
    levelEl.textContent = `Level ${score.level || 1}`;
    entry.appendChild(levelEl);

    const dateEl = document.createElement('div');
    dateEl.className = 'date';
    dateEl.textContent = label;
    entry.appendChild(dateEl);

    container.appendChild(entry);
  });

  if (!showAll && scores.length > 5) {
    const seeAllBtn = document.createElement('button');
    seeAllBtn.type = 'button';
    seeAllBtn.className = 'menu-button global-see-all-button';
    seeAllBtn.textContent = 'See All';
    seeAllBtn.addEventListener('click', () => {
      playSound(selectSound);
      renderGlobalScores(container, scores, mode, { showAll: true });
      window.dispatchEvent(new CustomEvent('global-leaderboard:see-all'));
    });
    container.appendChild(seeAllBtn);
  }
}

export async function fetchUserGlobalEntries(uid) {
  if (!db || !uid) return {};
  const modes = ['base', 'timeAttack', 'blackout'];
  const entries = {};
  await Promise.all(modes.map(async (mode) => {
    try {
      const snap = await getDoc(doc(db, 'leaderboards', mode, 'entries', uid));
      entries[mode] = snap.exists() ? snap.data() : null;
    } catch {
      entries[mode] = null;
    }
  }));
  return entries;
}

export function renderOnlineStatsHtml(entries) {
  const rows = Object.entries(MODE_LABELS).map(([mode, label]) => {
    const entry = entries[mode];
    const best = entry ? `Lv ${entry.level}` : '—';
    return `
      <div class="account-stat-row">
        <span class="account-stat-mode">${label} (online)</span>
        <span class="account-stat-val">Best: ${best}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="account-stats-panel account-online-panel">
      <h2 class="account-stats-title">Global Bests</h2>
      ${rows}
    </div>
  `;
}

export function initOnlineLeaderboard() {
  window.addEventListener('navigate:account', () => {
    window.dispatchEvent(new CustomEvent('menus:go-account'));
  });
}
