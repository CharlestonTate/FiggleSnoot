/**
 * Client-side integrity: baseline asset hashes on load + guarded score storage.
 * Not bulletproof (browser games never are) but catches casual console tampering.
 */

const BASELINE_KEY = 'figglesnoot_integrity_baseline';
const CACHE_NAME = 'figglesnoot-integrity-v1';
const SCORE_KEY = 'figglesnoot_scores';
const COIN_KEY = 'figglesnoot_coins';
const GUARDED_KEYS = new Set([SCORE_KEY, COIN_KEY]);

let triggered = false;
let trustedWrite = false;
let baselineHashes = null;

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
  add('/style.css');
  add('/index.html');

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

  proto.setItem = function guardedSetItem(key, value) {
    if (GUARDED_KEYS.has(key) && !trustedWrite) {
      triggerViolation('score_storage');
      return;
    }
    return origSet.call(this, key, value);
  };

  proto.removeItem = function guardedRemoveItem(key) {
    if (GUARDED_KEYS.has(key) && !trustedWrite) {
      triggerViolation('score_storage');
      return;
    }
    return origRemove.call(this, key);
  };

  proto.clear = function guardedClear() {
    if (!trustedWrite) {
      triggerViolation('score_storage');
      return;
    }
    return origClear.call(this);
  };
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

export async function verifyIntegrity() {
  if (triggered || !import.meta.env.PROD || !baselineHashes) return !triggered;

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
  await verifyIntegrity();
  if (triggered) throw new Error('integrity_blocked');
}

export async function initIntegrity() {
  installStorageGuard();

  await cacheAssetsInBrowser();

  if (import.meta.env.PROD) {
    baselineHashes = await snapshotAssets();
    try {
      sessionStorage.setItem(BASELINE_KEY, JSON.stringify(baselineHashes));
    } catch {
      /* private mode */
    }
    setInterval(() => { verifyIntegrity(); }, 20000);
  }

  if (!import.meta.env.PROD && typeof window !== 'undefined') {
    window.__FIGGLE_DEV__ = {
      ...(window.__FIGGLE_DEV__ || {}),
      simulateIntegrityViolation: () => triggerViolation('dev_test'),
      verifyIntegrity,
      testScoreTamper: () => {
        localStorage.setItem('figglesnoot_scores', '[]');
      },
    };
  }
}
