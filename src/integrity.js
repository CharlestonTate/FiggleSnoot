/**
 * Client-side integrity deterrent (UX only — not a security boundary).
 * Flags DevTools tampering silently, then reveals "nice try" on a high score.
 * Ranked/global scores must be validated server-side via Firestore rules or Functions.
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

function showOverlay() {
  const overlay = document.getElementById('integrity-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  document.body.classList.add('integrity-lock');
  document.getElementById('game-screen')?.classList.add('hidden');
  document.getElementById('game-over-screen')?.classList.add('hidden');
}

/** Reveal the full-screen cheater message. */
export function revealCheater() {
  if (revealed) return;
  revealed = true;
  showOverlay();
}

/**
 * Call when the player achieves a personal or global best.
 * Silently flagged cheaters only see "nice try" on a high score.
 */
export function maybeRevealOnHighScore({ isPersonalBest = false, isGlobalPB = false } = {}) {
  if (!flagged || revealed) return false;
  if (isPersonalBest || isGlobalPB) {
    revealCheater();
    return true;
  }
  return false;
}

/** @deprecated Use flagViolation + maybeRevealOnHighScore */
export function triggerViolation(reason = 'unknown', { immediate = false } = {}) {
  flagViolation(reason);
  if (immediate) revealCheater();
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
  if (revealed) return false;
  if (!verifyStorageGuard()) return false;
  if (!verifyProtectedFunctions()) return false;
  if (!verifyRunSession()) return false;
  return true;
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
  await verifyIntegrity();

  if (flagged) {
    revealCheater();
    throw new Error('integrity_blocked');
  }
}

function scheduleChecks() {
  setInterval(() => {
    if (revealed) return;
    verifyRuntimeIntegrity();
    const now = Date.now();
    if (import.meta.env.PROD && baselineHashes && now - lastAssetCheck >= ASSET_CHECK_MS) {
      lastAssetCheck = now;
      verifyIntegrity();
    }
  }, RUNTIME_CHECK_MS);
}

function installDevCommands() {
  if (import.meta.env.PROD || typeof window === 'undefined') return;

  window.__FIGGLE_DEV__ = {
    ...(window.__FIGGLE_DEV__ || {}),

    /** Show the white "nice try" screen immediately */
    showNiceTry: () => {
      flagViolation('dev_test');
      revealCheater();
    },

    /** Alias for showNiceTry */
    simulateIntegrityViolation: () => {
      flagViolation('dev_test');
      revealCheater();
    },

    /** Flag tampering silently — die with a PB to trigger the reveal */
    flagCheater: (reason = 'dev_flag') => flagViolation(reason),

    isCheaterFlagged: () => flagged,
    isNiceTryVisible: () => revealed,
    getViolations: () => getIntegrityViolations(),

    /** Attempt to edit scores in console (flags silently, write blocked) */
    testScoreTamper: () => {
      localStorage.setItem('figglesnoot_scores', '[]');
    },

    /** Attempt to edit coins in console (flags silently, write blocked) */
    testCoinTamper: () => {
      localStorage.setItem('figglesnoot_coins', '9999');
    },

    /** Jump to level 999 — flags on next runtime check */
    testLevelTamper: () => {
      window.__FIGGLE_DEV__?.__forceLevel?.(999);
    },

    /** Strip obstacle cells from the maze DOM — flags on next runtime check */
    testMazeTamper: () => {
      document.querySelectorAll('#maze .obstacle').forEach((el) => {
        el.classList.remove('obstacle');
      });
    },

    /** Run integrity checks immediately instead of waiting for the interval */
    runIntegrityCheck: () => verifyRuntimeIntegrity(),

    verifyIntegrity,
    verifyRuntimeIntegrity,
  };
}

export async function initIntegrity() {
  installStorageGuard();

  registerProtectedFunction('integrity.withTrustedStorageWrite', withTrustedStorageWrite);
  registerProtectedFunction('integrity.flagViolation', flagViolation);
  registerProtectedFunction('integrity.revealCheater', revealCheater);

  await cacheAssetsInBrowser();

  if (import.meta.env.PROD) {
    baselineHashes = await snapshotAssets();
    lastAssetCheck = Date.now();
    try {
      sessionStorage.setItem(BASELINE_KEY, JSON.stringify(baselineHashes));
    } catch {
      /* private mode */
    }
  }

  scheduleChecks();
  installDevCommands();
}
