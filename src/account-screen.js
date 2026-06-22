import { isOnline, withTimeout } from './network.js';
import {
  bootstrapOnlineServices,
  getAuthModule,
  isOnlineServicesReady,
} from './bootstrap-online.js';
import { createAccountNav } from './menu-nav.js';
import { playSound, dungSound, selectSound } from './audio.js';
import { mapFirebaseError } from './firebase-errors.js';

let wired = false;

function getAccountButtons() {
  const signedIn = document.getElementById('account-signed-in');
  const isSignedIn = signedIn && !signedIn.classList.contains('hidden');

  if (isSignedIn) {
    return [
      document.getElementById('account-signout-button'),
      document.getElementById('account-back-button'),
    ];
  }

  return [
    document.getElementById('account-signin-button'),
    document.getElementById('account-signup-button'),
    document.getElementById('account-reset-password-button'),
    document.getElementById('account-back-button'),
  ];
}

const accountNav = createAccountNav(getAccountButtons);

function getErrorEl() {
  return document.getElementById('account-error');
}

function showAccountMessage(msg, { success = false } = {}) {
  const errorEl = getErrorEl();
  if (!errorEl) return;
  errorEl.textContent = msg;
  errorEl.classList.toggle('account-success', success);
  errorEl.classList.toggle('hidden', !msg);
}

function clearAccountMessage() {
  const errorEl = getErrorEl();
  if (!errorEl) return;
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
  errorEl.classList.remove('account-success');
}

async function withAuthAction(action) {
  if (!isOnline()) {
    throw new Error('You are offline. Connect to use accounts.');
  }
  await bootstrapOnlineServices();
  const auth = getAuthModule();
  if (!auth) {
    throw new Error('Online accounts are not available right now. Try again in a moment.');
  }
  return withTimeout(action(auth), 15000);
}

function refreshAccountUI() {
  getAuthModule()?.updateAccountUI?.();
  accountNav.reset();
}

export function resetAccountNav() {
  accountNav.reset();
}

export function handleAccountNavigation(event) {
  return accountNav.handleKey(event);
}

export function initAccountScreen() {
  if (wired) return;
  wired = true;

  const signUpBtn = document.getElementById('account-signup-button');
  const signInBtn = document.getElementById('account-signin-button');
  const signOutBtn = document.getElementById('account-signout-button');
  const resetBtn = document.getElementById('account-reset-password-button');
  const backBtn = document.getElementById('account-back-button');

  accountNav.bindHover();

  backBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    clearAccountMessage();
    playSound(dungSound);
    window.dispatchEvent(new CustomEvent('account:back'));
  });

  signUpBtn?.addEventListener('click', async (event) => {
    event.preventDefault();
    clearAccountMessage();
    playSound(selectSound);
    try {
      await withAuthAction((auth) => {
        const email = document.getElementById('account-email')?.value ?? '';
        const password = document.getElementById('account-password')?.value ?? '';
        const displayName = document.getElementById('account-displayname-input')?.value ?? '';
        return auth.signUp(email, password, displayName);
      });
      clearAccountMessage();
      refreshAccountUI();
    } catch (e) {
      showAccountMessage(mapFirebaseError(e));
    }
  });

  signInBtn?.addEventListener('click', async (event) => {
    event.preventDefault();
    clearAccountMessage();
    playSound(selectSound);
    try {
      await withAuthAction((auth) => {
        const email = document.getElementById('account-email')?.value ?? '';
        const password = document.getElementById('account-password')?.value ?? '';
        return auth.signIn(email, password);
      });
      clearAccountMessage();
      refreshAccountUI();
    } catch (e) {
      showAccountMessage(mapFirebaseError(e));
    }
  });

  signOutBtn?.addEventListener('click', async (event) => {
    event.preventDefault();
    clearAccountMessage();
    playSound(selectSound);
    try {
      if (isOnlineServicesReady()) {
        await getAuthModule()?.logOut();
      }
      refreshAccountUI();
    } catch (e) {
      showAccountMessage(mapFirebaseError(e));
    }
  });

  resetBtn?.addEventListener('click', async (event) => {
    event.preventDefault();
    clearAccountMessage();
    playSound(selectSound);
    const email = document.getElementById('account-email')?.value?.trim();
    if (!email) {
      showAccountMessage('Enter your email first.');
      return;
    }
    try {
      await withAuthAction((auth) => auth.resetPassword(email));
      showAccountMessage('Password reset email sent.', { success: true });
    } catch (e) {
      showAccountMessage(mapFirebaseError(e));
    }
  });

  window.addEventListener('auth:change', () => refreshAccountUI());
}

export function onAccountScreenOpen() {
  clearAccountMessage();
  accountNav.reset();
  bootstrapOnlineServices()
    .then(() => refreshAccountUI())
    .catch(() => {});
}
