/**
 * Client-side storage guard (UX helper — not a security boundary).
 * Blocks direct localStorage tampering of scores/coins; ranked validation is server-side.
 */

const BASELINE_KEY = 'figglesnoot_integrity_baseline';
const CACHE_NAME = 'figglesnoot-integrity-v1';
const SCORE_KEY = 'figglesnoot_scores';
const COIN_KEY = 'figglesnoot_coins';
const GUARDED_KEYS = new Set([SCORE_KEY, COIN_KEY]);
const RUNTIME_CHECK_MS = 4000;
const ASSET_CHECK_MS = 20000;

let flagged = false;
let revealed = false;
const violations = new Set();
let trustedWrite = false;
let baselineHashes = null;
let lastAssetCheck = 0;

const protectedFunctions = new Map();
let runIntegrityGetter = null;
let storageGuardRefs = null;

async function hashText(text) {
  if (!crypto?.subtle) {
    let h = 0;
    for (let i = 0; i < text.length; i += 1) {
      h = ((h << 5) - h) + text.charCodeAt(i);
      h |= 0;
    }
    return String(h);
  }
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getSameOriginAssetUrls() {
  const urls = new Set();
  const add = (href) => {
    if (!href) return;
    try {
      const u = new URL(href, location.href);
      if (u.origin === location.origin) urls.add(u.href);
    } catch {
      /* ignore */
    }
  };

  document.querySelectorAll('script[src]').forEach((el) => add(el.src));
  document.querySelectorAll('link[rel="stylesheet"][href]').forEach((el) => add(el.href));
  add(`${location.pathname || '/'}${location.search || ''}`);

  return [...urls];
}

async function fetchAndHash(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`fetch failed ${url}`);
  return hashText(await res.text());
}

async function snapshotAssets() {
  const urls = getSameOriginAssetUrls();
  const entries = {};
  await Promise.all(urls.map(async (url) => {
    try {
      entries[url] = await fetchAndHash(url);
    } catch {
      /* skip unreachable assets */
    }
  }));
  return entries;
}

async function cacheAssetsInBrowser() {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(getSameOriginAssetUrls().map((url) => cache.add(url).catch(() => {})));
  } catch {
    /* ignore */
  }
}

function installStorageGuard() {
  const proto = Storage.prototype;
  const origSet = proto.setItem;
  const origRemove = proto.removeItem;
  const origClear = proto.clear;

  function guardedSetItem(key, value) {
    if (GUARDED_KEYS.has(key) && !trustedWrite) {
      flagViolation('score_storage');
      return;
    }
    return origSet.call(this, key, value);
  }

  function guardedRemoveItem(key) {
    if (GUARDED_KEYS.has(key) && !trustedWrite) {
      flagViolation('score_storage');
      return;
    }
    return origRemove.call(this, key);
  }

  function guardedClear() {
    if (!trustedWrite) {
      flagViolation('score_storage');
      return;
    }
    return origClear.call(this);
  }

  const lockMethod = (name, fn) => {
    try {
      Object.defineProperty(proto, name, {
        value: fn,
        writable: false,
        configurable: false,
        enumerable: true,
      });
    } catch {
      proto[name] = fn;
    }
  };

  lockMethod('setItem', guardedSetItem);
  lockMethod('removeItem', guardedRemoveItem);
  lockMethod('clear', guardedClear);

  storageGuardRefs = {
    setItem: Storage.prototype.setItem,
    removeItem: Storage.prototype.removeItem,
    clear: Storage.prototype.clear,
  };

  registerProtectedFunction('integrity.guardedSetItem', guardedSetItem);
  registerProtectedFunction('integrity.guardedRemoveItem', guardedRemoveItem);
  registerProtectedFunction('integrity.guardedClear', guardedClear);
}

export function registerProtectedFunction(name, fn) {
  if (typeof fn !== 'function') return;
  protectedFunctions.set(name, { fn, hash: fn.toString() });
}

export function registerRunIntegrity(getter) {
  runIntegrityGetter = getter;
}

export function withTrustedStorageWrite(fn) {
  trustedWrite = true;
  try {
    return fn();
  } finally {
    trustedWrite = false;
  }
}

/** Overlay is visible — gameplay and ranked submits are blocked. */
export function isIntegrityTriggered() {
  return revealed;
}

/** Tampering was detected but the player has not been shown "nice try" yet. */
export function isIntegrityFlagged() {
  return flagged;
}

export function getIntegrityViolations() {
  return [...violations];
}

export function flagViolation(reason = 'unknown') {
  flagged = true;
  violations.add(reason);
  console.warn('[FiggleSnoot] Integrity flag:', reason);
}

/** No-op — overlay removed; kept for dev helpers. */
export function revealCheater() {
  revealed = true;
}

/** No-op — overlay removed. */
export function maybeRevealOnHighScore() {
  return false;
}

/** @deprecated */
export function triggerViolation(reason = 'unknown') {
  flagViolation(reason);
}

function verifyStorageGuard() {
  if (!storageGuardRefs) return true;
  if (Storage.prototype.setItem !== storageGuardRefs.setItem) {
    flagViolation('storage_bypass');
    return false;
  }
  if (Storage.prototype.removeItem !== storageGuardRefs.removeItem) {
    flagViolation('storage_bypass');
    return false;
  }
  if (Storage.prototype.clear !== storageGuardRefs.clear) {
    flagViolation('storage_bypass');
    return false;
  }
  return true;
}

function verifyProtectedFunctions() {
  for (const [name, { fn, hash }] of protectedFunctions) {
    if (fn.toString() !== hash) {
      flagViolation(`function_tamper:${name}`);
      return false;
    }
  }
  return true;
}

function verifyMazeIntegrity(snap) {
  if (!snap || snap.isGameOver) return true;

  const maze = document.getElementById('maze');
  if (!maze) return true;

  const cellCount = maze.children.length;
  if (cellCount > 0 && snap.expectedCells > 0 && cellCount !== snap.expectedCells) {
    flagViolation('maze_cells');
    return false;
  }

  if (snap.isMazeVisible && snap.expectedObstacles > 0) {
    const domObstacles = maze.querySelectorAll('.obstacle').length;
    if (domObstacles !== snap.expectedObstacles) {
      flagViolation('maze_obstacles');
      return false;
    }
  }

  return true;
}

function verifyRunSession() {
  if (!runIntegrityGetter) return true;

  const snap = runIntegrityGetter();
  if (!snap || snap.isGameOver) return true;

  verifyMazeIntegrity(snap);

  const current = snap.getCurrentLevel?.() ?? 1;
  const peak = snap.peakLevel ?? 1;
  const cleared = snap.levelsCleared ?? 0;
  const startedAt = snap.startedAt ?? 0;

  if (current > peak) {
    flagViolation('level_tamper');
    return false;
  }
  if (current > cleared + 1) {
    flagViolation('level_tamper');
    return false;
  }

  const minMs = Math.max(0, (current - 1) * 700);
  if (current > 5 && performance.now() - startedAt < minMs) {
    flagViolation('speed_tamper');
    return false;
  }

  return !flagged;
}

export function verifyRuntimeIntegrity() {
  if (!verifyStorageGuard()) return false;
  return !flagged;
}

export async function verifyIntegrity() {
  if (revealed) return false;

  verifyRuntimeIntegrity();
  if (revealed) return false;

  if (!import.meta.env.PROD || !baselineHashes) return true;

  try {
    const current = await snapshotAssets();
    for (const [url, hash] of Object.entries(baselineHashes)) {
      if (current[url] !== hash) {
        flagViolation('file_tamper');
        return false;
      }
    }
  } catch {
    /* network blip — don't ban */
  }
  return !flagged;
}

export async function assertIntegrityForRankedAction() {
  verifyRuntimeIntegrity();
  if (flagged) {
    throw new Error('integrity_blocked');
  }
}

export async function initIntegrity() {
  installStorageGuard();
}
