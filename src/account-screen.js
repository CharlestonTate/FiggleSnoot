import { isOnline, withTimeout } from './network.js';
import {
  bootstrapOnlineServices,
  getAuthModule,
  getOnlineModule,
  isOnlineServicesReady,
} from './bootstrap-online.js';
import { createMenuNav, createSignOutConfirmNav } from './menu-nav.js';
import { playSound, dungSound, selectSound, badWiggleSound } from './audio.js';
import { mapFirebaseError } from './firebase-errors.js';
import { renderAccountStatsHtml } from './player-stats.js';
import { switchScreens, hideScreen, showScreen } from './screens.js';

let wired = false;

const ERROR_IDS = {
  hub: 'account-error',
  signIn: 'account-signin-error',
  signUp: 'account-signup-error',
  forgot: 'account-forgot-error',
};

function getHubButtons() {
  const signedIn = document.getElementById('account-signed-in');
  const isSignedIn = signedIn && !signedIn.classList.contains('hidden');

  if (isSignedIn) {
    return [
      document.getElementById('account-signout-button'),
      document.getElementById('account-delete-scores-button'),
      document.getElementById('account-delete-account-button'),
      document.getElementById('account-back-button'),
    ];
  }

  return [
    document.getElementById('account-go-signin-button'),
    document.getElementById('account-go-signup-button'),
    document.getElementById('account-back-button'),
  ];
}

let hubNav = null;

function refreshHubNav() {
  hubNav = createMenuNav(getHubButtons());
  hubNav.reset();
}

const signInNav = createMenuNav([
  document.getElementById('account-signin-submit'),
  document.getElementById('account-go-forgot-button'),
  document.getElementById('account-signin-back'),
]);
const signUpNav = createMenuNav([
  document.getElementById('account-signup-submit'),
  document.getElementById('account-signup-back'),
]);
const forgotNav = createMenuNav([
  document.getElementById('account-forgot-submit'),
  document.getElementById('account-forgot-back'),
]);
const signOutNav = createSignOutConfirmNav([
  document.getElementById('account-signout-yes'),
  document.getElementById('account-signout-no'),
]);

function showMessage(screen, msg, { success = false } = {}) {
  const id = ERROR_IDS[screen];
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('account-success', success);
  el.classList.toggle('hidden', !msg);
}

function clearMessage(screen) {
  showMessage(screen, '');
  const el = document.getElementById(ERROR_IDS[screen]);
  el?.classList.remove('account-success');
}

function clearAllMessages() {
  Object.keys(ERROR_IDS).forEach((key) => clearMessage(key));
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

function renderLocalStats() {
  const container = document.getElementById('account-stats-container');
  if (!container) return;
  container.innerHTML = renderAccountStatsHtml();
}

async function renderOnlineStats() {
  const onlineEl = document.getElementById('account-online-stats');
  if (!onlineEl) return;

  const auth = getAuthModule();
  const user = auth?.getCurrentUser?.();
  if (!user) {
    onlineEl.classList.add('hidden');
    onlineEl.innerHTML = '';
    return;
  }

  try {
    await bootstrapOnlineServices();
    const online = getOnlineModule();
    if (!online?.fetchUserGlobalEntries) {
      onlineEl.classList.add('hidden');
      return;
    }
    const entries = await withTimeout(online.fetchUserGlobalEntries(user.uid), 10000);
    onlineEl.innerHTML = online.renderOnlineStatsHtml(entries);
    onlineEl.classList.remove('hidden');
  } catch {
    onlineEl.classList.add('hidden');
  }
}

function refreshAccountUI() {
  renderLocalStats();
  getAuthModule()?.updateAccountUI?.();
  renderOnlineStats();
  refreshHubNav();
}

function goToHub() {
  clearAllMessages();
  hideScreen('accountSignIn');
  hideScreen('accountSignUp');
  hideScreen('accountForgot');
  hideScreen('accountSignOut');
  showScreen('account');
  refreshAccountUI();
}

function goToSignIn() {
  clearAllMessages();
  switchScreens('account', 'accountSignIn');
  signInNav.reset();
}

function goToSignUp() {
  clearAllMessages();
  switchScreens('account', 'accountSignUp');
  signUpNav.reset();
}

function goToForgot() {
  clearAllMessages();
  const email = document.getElementById('signin-email')?.value?.trim();
  if (email) {
    document.getElementById('forgot-email').value = email;
  }
  switchScreens('accountSignIn', 'accountForgot');
  forgotNav.reset();
}

function goToSignOutConfirm() {
  clearAllMessages();
  const auth = getAuthModule();
  const name = auth?.getDisplayName?.() || auth?.getCurrentUser?.()?.email || 'your account';
  const nameEl = document.getElementById('signout-username');
  if (nameEl) nameEl.textContent = name;
  switchScreens('account', 'accountSignOut');
  signOutNav.reset();
}

export function handleAccountNavigation(event) {
  if (!hubNav) refreshHubNav();
  return hubNav?.handleKey(event);
}

export function handleAccountSignInNavigation(event) {
  if (document.activeElement?.tagName === 'INPUT') return false;
  return signInNav.handleKey(event);
}

export function handleAccountSignUpNavigation(event) {
  if (document.activeElement?.tagName === 'INPUT') return false;
  return signUpNav.handleKey(event);
}

export function handleAccountForgotNavigation(event) {
  if (document.activeElement?.tagName === 'INPUT') return false;
  return forgotNav.handleKey(event);
}

export function handleAccountSignOutNavigation(event) {
  return signOutNav.handleKey(event);
}

export function initAccountScreen() {
  if (wired) return;
  wired = true;

  document.getElementById('account-go-signin-button')?.addEventListener('click', () => {
    playSound(selectSound);
    goToSignIn();
  });

  document.getElementById('account-go-signup-button')?.addEventListener('click', () => {
    playSound(selectSound);
    goToSignUp();
  });

  document.getElementById('account-back-button')?.addEventListener('click', () => {
    clearAllMessages();
    playSound(dungSound);
    window.dispatchEvent(new CustomEvent('account:back'));
  });

  document.getElementById('account-signin-back')?.addEventListener('click', () => {
    playSound(dungSound);
    goToHub();
  });

  document.getElementById('account-signup-back')?.addEventListener('click', () => {
    playSound(dungSound);
    goToHub();
  });

  document.getElementById('account-forgot-back')?.addEventListener('click', () => {
    playSound(dungSound);
    switchScreens('accountForgot', 'accountSignIn');
    signInNav.reset();
  });

  document.getElementById('account-go-forgot-button')?.addEventListener('click', () => {
    playSound(selectSound);
    goToForgot();
  });

  document.getElementById('account-signin-submit')?.addEventListener('click', async () => {
    clearMessage('signIn');
    playSound(selectSound);
    try {
      await withAuthAction((auth) => {
        const email = document.getElementById('signin-email')?.value ?? '';
        const password = document.getElementById('signin-password')?.value ?? '';
        return auth.signIn(email, password);
      });
      goToHub();
    } catch (e) {
      showMessage('signIn', mapFirebaseError(e));
    }
  });

  document.getElementById('account-signup-submit')?.addEventListener('click', async () => {
    clearMessage('signUp');
    playSound(selectSound);
    try {
      await withAuthAction((auth) => {
        const email = document.getElementById('signup-email')?.value ?? '';
        const password = document.getElementById('signup-password')?.value ?? '';
        const displayName = document.getElementById('signup-displayname')?.value ?? '';
        return auth.signUp(email, password, displayName);
      });
      goToHub();
    } catch (e) {
      showMessage('signUp', mapFirebaseError(e));
    }
  });

  document.getElementById('account-forgot-submit')?.addEventListener('click', async () => {
    clearMessage('forgot');
    playSound(selectSound);
    const email = document.getElementById('forgot-email')?.value?.trim();
    if (!email) {
      showMessage('forgot', 'Enter your email.');
      return;
    }
    try {
      await withAuthAction((auth) => auth.resetPassword(email));
      showMessage('forgot', 'Password reset email sent.', { success: true });
    } catch (e) {
      showMessage('forgot', mapFirebaseError(e));
    }
  });

  document.getElementById('account-signout-button')?.addEventListener('click', () => {
    playSound(selectSound);
    goToSignOutConfirm();
  });

  document.getElementById('account-signout-no')?.addEventListener('click', () => {
    playSound(dungSound);
    goToHub();
  });

  document.getElementById('account-signout-yes')?.addEventListener('click', async () => {
    playSound(badWiggleSound);
    try {
      if (isOnlineServicesReady()) {
        await getAuthModule()?.logOut();
      }
      goToHub();
    } catch (e) {
      showMessage('hub', mapFirebaseError(e));
      goToHub();
    }
  });

  document.getElementById('account-delete-scores-button')?.addEventListener('click', async () => {
    clearMessage('hub');
    playSound(selectSound);
    const confirmed = window.confirm(
      'Delete all your global leaderboard scores? This cannot be undone.',
    );
    if (!confirmed) return;
    try {
      await withAuthAction((auth) => auth.deleteMyGlobalScores());
      showMessage('hub', 'Global scores deleted.', { success: true });
      refreshAccountUI();
    } catch (e) {
      showMessage('hub', mapFirebaseError(e));
    }
  });

  document.getElementById('account-delete-account-button')?.addEventListener('click', async () => {
    clearMessage('hub');
    playSound(selectSound);
    const confirmed = window.confirm(
      'Delete your account permanently? All global scores and profile data will be removed.',
    );
    if (!confirmed) return;
    const password = window.prompt('Enter your password to confirm:');
    if (!password) {
      showMessage('hub', 'Account deletion cancelled.');
      return;
    }
    try {
      await withAuthAction((auth) => auth.deleteAccount(password));
      showMessage('hub', 'Account deleted.', { success: true });
      refreshAccountUI();
    } catch (e) {
      showMessage('hub', mapFirebaseError(e));
    }
  });

  window.addEventListener('auth:change', () => refreshAccountUI());
}

export function onAccountScreenOpen() {
  clearAllMessages();
  hideScreen('accountSignIn');
  hideScreen('accountSignUp');
  hideScreen('accountForgot');
  hideScreen('accountSignOut');
  showScreen('account');
  renderLocalStats();
  bootstrapOnlineServices()
    .then(() => refreshAccountUI())
    .catch(() => refreshHubNav());
}

export function openAccountScreen() {
  playSound(selectSound);
  window.dispatchEvent(new CustomEvent('menus:open-account'));
}
