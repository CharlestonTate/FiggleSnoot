import { normalizeGameMode } from './sanitize.js';

const MAX_SCORE_ENTRIES = 500;
const MAX_LEVEL = 500;
const MAX_TIME = 86400000;

function isValidDateString(value) {
  if (typeof value !== 'string') return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

export function parseScoresSafely(raw) {
  let parsed;
  try {
    parsed = raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const safe = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue;
    const mode = normalizeGameMode(entry.mode);
    if (!mode) continue;

    const level = Number(entry.level);
    if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) continue;

    const time = Number(entry.time);
    if (!Number.isFinite(time) || time < 0 || time > MAX_TIME) continue;

    if (!isValidDateString(entry.date)) continue;

    safe.push({ mode, level, time, date: entry.date });
    if (safe.length >= MAX_SCORE_ENTRIES) break;
  }
  return safe;
}

export function loadScoresFromStorage() {
  return parseScoresSafely(localStorage.getItem('figglesnoot_scores'));
}

export function saveScoresToStorage(scores) {
  const safe = parseScoresSafely(JSON.stringify(scores));
  localStorage.setItem('figglesnoot_scores', JSON.stringify(safe));
  return safe;
}
