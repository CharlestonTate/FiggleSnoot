/**
 * Loads Firebase-dependent modules after the game boots.
 * If import fails (offline, unbundled source, etc.) local play still works.
 */
import { isOnline } from './network.js';

let onlineModule = null;
let authModule = null;
let loadPromise = null;

export function isOnlineServicesReady() {
  return Boolean(onlineModule && authModule);
}

export function getOnlineModule() {
  return onlineModule;
}

export function getAuthModule() {
  return authModule;
}

function markAccountOffline(message) {
  const signedOut = document.getElementById('account-signed-out');
  const signedIn = document.getElementById('account-signed-in');
  if (!signedOut) return;
  signedOut.classList.remove('hidden');
  signedIn?.classList.add('hidden');
  const hint = document.getElementById('account-offline-hint');
  if (hint) {
    hint.textContent = message || 'Online accounts unavailable (offline or not configured). You can still play locally.';
    hint.classList.remove('hidden');
  }
}

function clearAccountOfflineHint() {
  document.getElementById('account-offline-hint')?.classList.add('hidden');
}

async function loadOnlineModules() {
  const [auth, online] = await Promise.all([
    import('./auth.js'),
    import('./online-leaderboard.js'),
  ]);
  authModule = auth;
  onlineModule = online;
  auth.initAuthModule();
  online.initOnlineLeaderboard();
  clearAccountOfflineHint();
  return true;
}

export function bootstrapOnlineServices() {
  if (loadPromise) return loadPromise;

  if (!isOnline()) {
    markAccountOffline('Offline — playing local only. Global scores and accounts need internet.');
    loadPromise = Promise.resolve(false);
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      await loadOnlineModules();
      return true;
    } catch (err) {
      console.warn('Online services unavailable — local play only.', err);
      markAccountOffline();
      return false;
    }
  })();

  return loadPromise;
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => {
    markAccountOffline('Offline — playing local only. Global scores and accounts need internet.');
  });

  window.addEventListener('online', () => {
    if (!isOnlineServicesReady()) {
      loadPromise = null;
    }
  });
}
