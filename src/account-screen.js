import { isOnline, withTimeout } from './network.js';
import {
  bootstrapOnlineServices,
  getAuthModule,
  getOnlineModule,
  isOnlineServicesReady,
} from './bootstrap-online.js';
import { createAccountNav, createMenuNav } from './menu-nav.js';
import { playSound, dungSound, selectSound, badWiggleSound } from './audio.js';
import { mapFirebaseError } from './firebase-errors.js';
import { renderAccountStatsHtml } from './player-stats.js';
import { switchScreens } from './screens.js';
import { initProfanityInputGuards } from './profanity-filter.js';
import { getEquippedSkin, getSkinById, renderSkinSwatchHtml } from './skins.js';

let wired = false;

const hubNav = createAccountNav(() => getHubButtons());
const signInNav = createMenuNav([
  document.getElementById('account-signin-button'),
  document.getElementById('account-forgot-password-button'),
  document.getElementById('account-signin-back-button'),
]);
const signUpNav = createMenuNav([
  document.getElementById('account-signup-button'),
  document.getElementById('account-signup-back-button'),
]);
const forgotNav = createMenuNav([
  document.getElementById('account-reset-password-button'),
  document.getElementById('account-forgot-back-button'),
]);
const signOutNav = createAccountNav(() => [
  document.getElementById('signout-yes-button'),
  document.getElementById('signout-no-button'),
]);

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

function setMessage(elId, msg, { success = false } = {}) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('account-success', success);
  el.classList.toggle('hidden', !msg);
}

function clearMessage(elId) {
  setMessage(elId, '');
}

function clearAllMessages() {
  clearMessage('account-error');
  clearMessage('account-signin-error');
  clearMessage('account-signup-error');
  clearMessage('account-forgot-error');
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

function renderEquippedSkin() {
  const el = document.getElementById('account-equipped-skin');
  if (!el) return;
  const skin = getSkinById(getEquippedSkin());
  el.innerHTML = `
    ${renderSkinSwatchHtml(skin.id, { size: 'lg' })}
    <p class="account-equipped-skin-name">${skin.name}</p>
  `;
}

function refreshAccountUI() {
  renderLocalStats();
  renderEquippedSkin();
  getAuthModule()?.updateAccountUI?.();
  renderOnlineStats();
  hubNav.reset();
}

export function resetAccountNav() {
  hubNav.reset();
}

export function handleAccountNavigation(event) {
  return hubNav.handleKey(event);
}

export function handleAccountSignInNavigation(event) {
  return signInNav.handleKey(event);
}

export function handleAccountSignUpNavigation(event) {
  return signUpNav.handleKey(event);
}

export function handleAccountForgotNavigation(event) {
  return forgotNav.handleKey(event);
}

export function handleAccountSignOutNavigation(event) {
  return signOutNav.handleKey(event);
}

function goToSignIn() {
  clearAllMessages();
  playSound(selectSound);
  switchScreens('account', 'accountSignIn');
  signInNav.reset();
}

function goToSignUp() {
  clearAllMessages();
  playSound(selectSound);
  switchScreens('account', 'accountSignUp');
  signUpNav.reset();
}

function goToForgot() {
  clearAllMessages();
  const email = document.getElementById('signin-email')?.value?.trim();
  if (email) {
    document.getElementById('forgot-email').value = email;
  }
  playSound(selectSound);
  switchScreens('accountSignIn', 'accountForgot');
  forgotNav.reset();
}

function showAccountHubOnly() {
  document.getElementById('account-signin-screen')?.classList.add('hidden');
  document.getElementById('account-signup-screen')?.classList.add('hidden');
  document.getElementById('account-forgot-screen')?.classList.add('hidden');
  document.getElementById('account-signout-screen')?.classList.add('hidden');
  document.getElementById('account-screen')?.classList.remove('hidden');
}

function goToAccountHubFromSubscreen(fromScreen) {
  clearAllMessages();
  playSound(dungSound);
  if (fromScreen) switchScreens(fromScreen, 'account');
  else showAccountHubOnly();
  hubNav.reset();
}

function openSignOutConfirm() {
  const auth = getAuthModule();
  const name = auth?.getDisplayName?.() || auth?.getCurrentUser?.()?.email || 'your account';
  document.getElementById('signout-username').textContent = name;
  clearAllMessages();
  playSound(selectSound);
  switchScreens('account', 'accountSignOut');
  signOutNav.reset();
}

export function initAccountScreen() {
  if (wired) return;
  wired = true;

  initProfanityInputGuards();

  hubNav.bindHover();
  signOutNav.bindHover();

  document.getElementById('account-back-button')?.addEventListener('click', (e) => {
    e.preventDefault();
    clearAllMessages();
    playSound(dungSound);
    window.dispatchEvent(new CustomEvent('account:back'));
  });

  document.getElementById('account-go-signin-button')?.addEventListener('click', (e) => {
    e.preventDefault();
    goToSignIn();
  });

  document.getElementById('account-go-signup-button')?.addEventListener('click', (e) => {
    e.preventDefault();
    goToSignUp();
  });

  document.getElementById('account-signin-back-button')?.addEventListener('click', (e) => {
    e.preventDefault();
    goToAccountHubFromSubscreen('accountSignIn');
  });

  document.getElementById('account-signup-back-button')?.addEventListener('click', (e) => {
    e.preventDefault();
    goToAccountHubFromSubscreen('accountSignUp');
  });

  document.getElementById('account-forgot-back-button')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchScreens('accountForgot', 'accountSignIn');
    playSound(dungSound);
    signInNav.reset();
  });

  document.getElementById('account-forgot-password-button')?.addEventListener('click', (e) => {
    e.preventDefault();
    goToForgot();
  });

  document.getElementById('account-signup-button')?.addEventListener('click', async (e) => {
    e.preventDefault();
    clearMessage('account-signup-error');
    playSound(selectSound);
    try {
      await withAuthAction((auth) => auth.signUp(
        document.getElementById('signup-email')?.value ?? '',
        document.getElementById('signup-password')?.value ?? '',
        document.getElementById('signup-displayname')?.value ?? '',
      ));
      switchScreens('accountSignUp', 'account');
      refreshAccountUI();
    } catch (err) {
      setMessage('account-signup-error', mapFirebaseError(err));
    }
  });

  document.getElementById('account-signin-button')?.addEventListener('click', async (e) => {
    e.preventDefault();
    clearMessage('account-signin-error');
    playSound(selectSound);
    try {
      await withAuthAction((auth) => auth.signIn(
        document.getElementById('signin-email')?.value ?? '',
        document.getElementById('signin-password')?.value ?? '',
      ));
      switchScreens('accountSignIn', 'account');
      refreshAccountUI();
    } catch (err) {
      setMessage('account-signin-error', mapFirebaseError(err));
    }
  });

  document.getElementById('account-signout-button')?.addEventListener('click', (e) => {
    e.preventDefault();
    openSignOutConfirm();
  });

  document.getElementById('signout-no-button')?.addEventListener('click', (e) => {
    e.preventDefault();
    playSound(dungSound);
    switchScreens('accountSignOut', 'account');
    hubNav.reset();
  });

  document.getElementById('signout-yes-button')?.addEventListener('click', async (e) => {
    e.preventDefault();
    clearAllMessages();
    playSound(badWiggleSound);
    try {
      if (isOnlineServicesReady()) {
        await getAuthModule()?.logOut();
      }
      switchScreens('accountSignOut', 'account');
      refreshAccountUI();
    } catch (err) {
      switchScreens('accountSignOut', 'account');
      setMessage('account-error', mapFirebaseError(err));
    }
  });

  document.getElementById('account-delete-scores-button')?.addEventListener('click', async (e) => {
    e.preventDefault();
    clearAllMessages();
    playSound(selectSound);
    if (!window.confirm('Delete all your global leaderboard scores? This cannot be undone.')) return;
    try {
      await withAuthAction((auth) => auth.deleteMyGlobalScores());
      setMessage('account-error', 'Global scores deleted.', { success: true });
      refreshAccountUI();
    } catch (err) {
      setMessage('account-error', mapFirebaseError(err));
    }
  });

  document.getElementById('account-delete-account-button')?.addEventListener('click', async (e) => {
    e.preventDefault();
    clearAllMessages();
    playSound(selectSound);
    if (!window.confirm('Delete your account permanently? All global scores and profile data will be removed.')) return;
    const password = window.prompt('Enter your password to confirm:');
    if (!password) {
      setMessage('account-error', 'Account deletion cancelled.');
      return;
    }
    try {
      await withAuthAction((auth) => auth.deleteAccount(password));
      setMessage('account-error', 'Account deleted.', { success: true });
      refreshAccountUI();
    } catch (err) {
      setMessage('account-error', mapFirebaseError(err));
    }
  });

  document.getElementById('account-reset-password-button')?.addEventListener('click', async (e) => {
    e.preventDefault();
    clearMessage('account-forgot-error');
    playSound(selectSound);
    const email = document.getElementById('forgot-email')?.value?.trim();
    if (!email) {
      setMessage('account-forgot-error', 'Enter your email.');
      return;
    }
    try {
      await withAuthAction((auth) => auth.resetPassword(email));
      setMessage('account-forgot-error', 'Password reset email sent.', { success: true });
    } catch (err) {
      setMessage('account-forgot-error', mapFirebaseError(err));
    }
  });

  window.addEventListener('auth:change', () => refreshAccountUI());
  window.addEventListener('skin:change', () => renderEquippedSkin());
}

export function onAccountScreenOpen() {
  clearAllMessages();
  showAccountHubOnly();
  hubNav.reset();
  renderLocalStats();
  renderEquippedSkin();
  bootstrapOnlineServices()
    .then(() => refreshAccountUI())
    .catch(() => {});
}

export function openAccountScreen() {
  playSound(selectSound);
  window.dispatchEvent(new CustomEvent('menus:open-account'));
}
