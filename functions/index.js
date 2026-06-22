import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();

const MODES = new Set(['base', 'timeAttack', 'blackout']);
const MAX_LEVEL = 500;
const MAX_TIME = 86400000;
const SUBMIT_COOLDOWN_MS = 15000;
const MAX_LEVEL_JUMP = 50;

const lastSubmitByUid = new Map();

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

function computeGlobalRank(entries, run, mode) {
  return countBetterThan(entries, run, mode) + 1;
}

async function getUserDisplayName(uid) {
  const userDoc = await db.collection('users').doc(uid).get();
  const data = userDoc.data();
  return data?.displayName || 'Anonymous';
}

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

  const countBetter = countBetterThan(entries, run, mode);
  const isGlobalPB = !existing || isBetter(run, existing, mode);
  const currentGlobalRank = isGlobalPB
    ? computeGlobalRank(entries, run, mode)
    : (existing ? computeGlobalRank(entries, existing, mode) : null);

  return { countBetter, isGlobalPB, currentGlobalRank };
});

export const submitScore = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to submit scores.');
  }

  const { mode, level, time } = request.data || {};
  validateMode(mode);
  validateScorePayload(level, time);

  const uid = request.auth.uid;
  const now = Date.now();
  const lastSubmit = lastSubmitByUid.get(uid) || 0;
  if (now - lastSubmit < SUBMIT_COOLDOWN_MS) {
    throw new HttpsError('resource-exhausted', 'Please wait before submitting again.');
  }

  const run = { level, time };
  const existingSnap = await entryRef(mode, uid).get();
  const existing = existingSnap.exists ? existingSnap.data() : null;

  if (existing && !isBetter(run, existing, mode)) {
    throw new HttpsError('failed-precondition', 'Score is not a personal best.');
  }

  if (existing && level > existing.level + MAX_LEVEL_JUMP) {
    throw new HttpsError('invalid-argument', 'Level increase exceeds allowed limit.');
  }

  const displayName = await getUserDisplayName(uid);
  await entryRef(mode, uid).set({
    level,
    time,
    displayName,
    updatedAt: FieldValue.serverTimestamp(),
  });

  lastSubmitByUid.set(uid, now);

  const entries = await fetchAllEntries(mode);
  const globalRank = computeGlobalRank(entries, run, mode);

  return { globalRank, isNewPB: true };
});
