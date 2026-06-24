import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();

const MODES = new Set(['base', 'timeAttack', 'blackout']);
const MAX_LEVEL = 500;
const MAX_TIME = 86400000;
const SUBMIT_COOLDOWN_MS = 15000;
const MIN_MS_PER_LEVEL = 2500;
const MAX_RUN_MS = 3600000;
const TIME_TOLERANCE_MS = 15000;

function validateMode(mode) {
  if (!MODES.has(mode)) {
    throw new HttpsError('invalid-argument', 'Invalid game mode.');
  }
}

function validateScorePayload(level, time) {
  if (!Number.isFinite(level) || level < 1 || level > MAX_LEVEL || !Number.isInteger(level)) {
    throw new HttpsError('invalid-argument', 'Invalid level.');
  }
  if (!Number.isFinite(time) || time < 0 || time > MAX_TIME) {
    throw new HttpsError('invalid-argument', 'Invalid time.');
  }
}

/** Returns true if score `a` ranks higher than score `b`. */
function isBetter(a, b, mode) {
  if (a.level !== b.level) return a.level > b.level;
  if (mode === 'timeAttack') return a.time > b.time;
  return a.time < b.time;
}

function entryRef(mode, uid) {
  return db.collection('leaderboards').doc(mode).collection('entries').doc(uid);
}

function runRef(runId) {
  return db.collection('runs').doc(runId);
}

function userRef(uid) {
  return db.collection('users').doc(uid);
}

async function fetchAllEntries(mode) {
  const snap = await db.collection('leaderboards').doc(mode).collection('entries').get();
  return snap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
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

async function getUserDisplayName(uid) {
  const userDoc = await userRef(uid).get();
  const data = userDoc.data();
  return data?.displayName || 'Anonymous';
}

async function writeLeaderboardEntry(mode, uid, level, time) {
  const run = { level, time };
  const existingSnap = await entryRef(mode, uid).get();
  const existing = existingSnap.exists ? existingSnap.data() : null;

  if (existing && !isBetter(run, existing, mode)) {
    throw new HttpsError('failed-precondition', 'Score is not a personal best.');
  }

  const displayName = await getUserDisplayName(uid);
  const userDoc = await userRef(uid).get();
  const skinId = userDoc.data()?.equippedSkin || 'default';
  await entryRef(mode, uid).set({
    level,
    time,
    displayName,
    skinId,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const entries = await fetchAllEntries(mode);
  const globalRank = computeGlobalRank(entries, run, mode, uid);
  return { globalRank, isNewPB: true };
}

async function assertSubmitCooldown(uid) {
  const snap = await userRef(uid).get();
  const lastSubmit = snap.data()?.lastSubmitAt || 0;
  const now = Date.now();
  if (now - lastSubmit < SUBMIT_COOLDOWN_MS) {
    throw new HttpsError('resource-exhausted', 'Please wait before submitting again.');
  }
  await userRef(uid).set({ lastSubmitAt: now }, { merge: true });
}

function assertPlausibleLevel(level, startedAt) {
  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > MAX_RUN_MS) {
    throw new HttpsError('deadline-exceeded', 'Run expired.');
  }
  const maxLevel = Math.floor(elapsedMs / MIN_MS_PER_LEVEL) + 1;
  if (level > maxLevel) {
    throw new HttpsError('invalid-argument', 'Level not plausible for run duration.');
  }
}

function assertPlausibleTime(mode, time, startedAt) {
  const elapsedMs = Date.now() - startedAt;
  if (mode === 'timeAttack') {
    // Remaining timer value — cannot exceed elapsed + starting budget (~20s per level cap)
    const maxRemaining = Math.min(MAX_TIME, elapsedMs + 120000);
    if (time > maxRemaining) {
      throw new HttpsError('invalid-argument', 'Time not plausible for run duration.');
    }
    return;
  }
  // base/blackout: elapsed or remaining — must not wildly exceed wall-clock elapsed
  if (time > elapsedMs + TIME_TOLERANCE_MS) {
    throw new HttpsError('invalid-argument', 'Time not plausible for run duration.');
  }
}

async function completeRunSubmission(runId, run, uid, level, time) {
  const mode = run.mode;
  validateMode(mode);
  assertPlausibleLevel(level, run.startedAt);
  assertPlausibleTime(mode, time, run.startedAt);

  const result = await writeLeaderboardEntry(mode, uid, level, time);

  await runRef(runId).update({
    status: 'completed',
    submittedLevel: level,
    submittedTime: time,
    peakLevel: Math.max(run.peakLevel || 0, level),
    completedAt: Date.now(),
  });

  return result;
}

export const startRun = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to start a ranked run.');
  }

  const { mode } = request.data || {};
  validateMode(mode);
  const uid = request.auth.uid;
  const now = Date.now();
  const ref = runRef(`${uid}_${mode}`);

  await ref.set({
    uid,
    mode,
    startedAt: now,
    status: 'active',
    peakLevel: 0,
  });

  return { runId: ref.id, serverTime: now };
});

export const submitRun = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to submit scores.');
  }

  const { runId, level, time } = request.data || {};
  if (!runId || typeof runId !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing run id.');
  }

  validateScorePayload(level, time);
  const uid = request.auth.uid;
  await assertSubmitCooldown(uid);

  const snap = await runRef(runId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Invalid run.');
  }

  const run = snap.data();
  if (run.uid !== uid) {
    throw new HttpsError('permission-denied', 'Run does not belong to this account.');
  }
  if (run.status !== 'active') {
    throw new HttpsError('failed-precondition', 'Run already submitted.');
  }

  return completeRunSubmission(runId, run, uid, level, time);
});

export const getScoreComparison = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to compare scores.');
  }

  const { mode, level, time } = request.data || {};
  validateMode(mode);
  validateScorePayload(level, time);

  const run = { level, time };
  const uid = request.auth.uid;
  const entries = await fetchAllEntries(mode);
  const existing = entries.find((e) => e.uid === uid) || null;

  const countBetter = countBetterThan(entries, run, mode, uid);
  const isGlobalPB = !existing || isBetter(run, existing, mode);
  const currentGlobalRank = isGlobalPB
    ? computeGlobalRank(entries, run, mode, uid)
    : (existing ? computeGlobalRank(entries, existing, mode, uid) : null);

  return { countBetter, isGlobalPB, currentGlobalRank };
});

/** Legacy alias — requires runId; use submitRun directly from the client. */
export const submitScore = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to submit scores.');
  }

  const { runId, level, time } = request.data || {};
  if (!runId) {
    throw new HttpsError('failed-precondition', 'Ranked submit requires a run session. Start a new game while signed in.');
  }

  validateScorePayload(level, time);
  const uid = request.auth.uid;
  await assertSubmitCooldown(uid);

  const snap = await runRef(runId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Invalid run.');
  }

  const run = snap.data();
  if (run.uid !== uid) {
    throw new HttpsError('permission-denied', 'Run does not belong to this account.');
  }
  if (run.status !== 'active') {
    throw new HttpsError('failed-precondition', 'Run already submitted.');
  }

  return completeRunSubmission(runId, run, uid, level, time);
});
