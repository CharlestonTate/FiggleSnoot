/**
 * Client-side integrity: asset baselines, runtime function checks, storage guard,
 * and game-session validation. Catches casual DevTools/console tampering — not
 * a determined reverse engineer.
 */

const BASELINE_KEY = 'figglesnoot_integrity_baseline';
const CACHE_NAME = 'figglesnoot-integrity-v1';
const SCORE_KEY = 'figglesnoot_scores';
const COIN_KEY = 'figglesnoot_coins';
const GUARDED_KEYS = new Set([SCORE_KEY, COIN_KEY]);
const RUNTIME_CHECK_MS = 4000;
const ASSET_CHECK_MS = 20000;

let triggered = false;
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
  const res = await fetch(url, { cache: 'force-cache', credentials: 'same-origin' });
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
      triggerViolation('score_storage');
      return;
    }
    return origSet.call(this, key, value);
  }

  function guardedRemoveItem(key) {
    if (GUARDED_KEYS.has(key) && !trustedWrite) {
      triggerViolation('score_storage');
      return;
    }
    return origRemove.call(this, key);
  }

  function guardedClear() {
    if (!trustedWrite) {
      triggerViolation('score_storage');
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

export function isIntegrityTriggered() {
  return triggered;
}

function showOverlay() {
  const overlay = document.getElementById('integrity-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  document.body.classList.add('integrity-lock');

  const closeBtn = document.getElementById('integrity-close-button');
  if (closeBtn && !closeBtn.dataset.wired) {
    closeBtn.dataset.wired = '1';
    closeBtn.addEventListener('click', () => {
      window.close();
      window.location.replace('about:blank');
    });
  }
}

export function triggerViolation(reason = 'unknown') {
  if (triggered) return;
  triggered = true;
  console.warn('[FiggleSnoot] Integrity violation:', reason);
  showOverlay();
}

function verifyStorageGuard() {
  if (!storageGuardRefs) return true;
  if (Storage.prototype.setItem !== storageGuardRefs.setItem) {
    triggerViolation('storage_bypass');
    return false;
  }
  if (Storage.prototype.removeItem !== storageGuardRefs.removeItem) {
    triggerViolation('storage_bypass');
    return false;
  }
  if (Storage.prototype.clear !== storageGuardRefs.clear) {
    triggerViolation('storage_bypass');
    return false;
  }
  return true;
}

function verifyProtectedFunctions() {
  for (const [name, { fn, hash }] of protectedFunctions) {
    if (fn.toString() !== hash) {
      triggerViolation(`function_tamper:${name}`);
      return false;
    }
  }
  return true;
}

function verifyRunSession() {
  if (!runIntegrityGetter) return true;

  const snap = runIntegrityGetter();
  if (!snap || snap.isGameOver) return true;

  const current = snap.getCurrentLevel?.() ?? 1;
  const peak = snap.peakLevel ?? 1;
  const cleared = snap.levelsCleared ?? 0;
  const startedAt = snap.startedAt ?? 0;

  if (current > peak) {
    triggerViolation('level_tamper');
    return false;
  }
  if (current > cleared + 1) {
    triggerViolation('level_tamper');
    return false;
  }

  const minMs = Math.max(0, (current - 1) * 700);
  if (current > 5 && performance.now() - startedAt < minMs) {
    triggerViolation('speed_tamper');
    return false;
  }

  return true;
}

export function verifyRuntimeIntegrity() {
  if (triggered) return false;
  if (!verifyStorageGuard()) return false;
  if (!verifyProtectedFunctions()) return false;
  if (!verifyRunSession()) return false;
  return true;
}

export async function verifyIntegrity() {
  if (triggered) return false;

  verifyRuntimeIntegrity();
  if (triggered) return false;

  if (!import.meta.env.PROD || !baselineHashes) return true;

  try {
    const current = await snapshotAssets();
    for (const [url, hash] of Object.entries(baselineHashes)) {
      if (current[url] !== hash) {
        triggerViolation('file_tamper');
        return false;
      }
    }
  } catch {
    /* network blip — don't ban */
  }
  return !triggered;
}

export async function assertIntegrityForRankedAction() {
  if (triggered) throw new Error('integrity_blocked');
  verifyRuntimeIntegrity();
  if (triggered) throw new Error('integrity_blocked');
  await verifyIntegrity();
  if (triggered) throw new Error('integrity_blocked');
}

function scheduleChecks() {
  setInterval(() => {
    if (triggered) return;
    verifyRuntimeIntegrity();
    const now = Date.now();
    if (import.meta.env.PROD && baselineHashes && now - lastAssetCheck >= ASSET_CHECK_MS) {
      lastAssetCheck = now;
      verifyIntegrity();
    }
  }, RUNTIME_CHECK_MS);
}

export async function initIntegrity() {
  installStorageGuard();

  registerProtectedFunction('integrity.withTrustedStorageWrite', withTrustedStorageWrite);
  registerProtectedFunction('integrity.triggerViolation', triggerViolation);

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

  if (!import.meta.env.PROD && typeof window !== 'undefined') {
    window.__FIGGLE_DEV__ = {
      ...(window.__FIGGLE_DEV__ || {}),
      simulateIntegrityViolation: () => triggerViolation('dev_test'),
      verifyIntegrity,
      verifyRuntimeIntegrity,
      testScoreTamper: () => {
        localStorage.setItem('figglesnoot_scores', '[]');
      },
      testLevelTamper: () => {
        window.__FIGGLE_DEV__?.__forceLevel?.(999);
      },
    };
  }
}
