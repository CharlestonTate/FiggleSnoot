/** Screen visibility manager — replaces scattered classList toggles */
const SCREEN_MAP = {
  title: 'title-screen',
  menu: 'menu-screen',
  gameMode: 'game-mode-screen',
  leaderboard: 'leaderboard-menu-screen',
  personalLeaderboard: 'personal-leaderboard-screen',
  globalLeaderboard: 'global-leaderboard-screen',
  normalScores: 'normal-mode-scores-screen',
  timeAttackScores: 'time-attack-scores-screen',
  blackoutScores: 'blackout-scores-screen',
  settings: 'settings-screen',
  account: 'account-screen',
  accountSignIn: 'account-signin-screen',
  accountSignUp: 'account-signup-screen',
  accountForgot: 'account-forgot-screen',
  accountSignOut: 'account-signout-screen',
  shop: 'shop-screen',
  game: 'game-screen',
  gameOver: 'game-over-screen',
  bomb: 'bomb-confirmation-popup',
};

const screens = {};
let current = 'title';

export function initScreens() {
  for (const [name, id] of Object.entries(SCREEN_MAP)) {
    screens[name] = document.getElementById(id);
  }
}

export function getScreen(name) {
  return screens[name];
}

export function getCurrentScreen() {
  return current;
}

export function isScreenVisible(name) {
  const el = screens[name];
  return el && !el.classList.contains('hidden');
}

export function hideScreen(name) {
  screens[name]?.classList.add('hidden');
}

export function showScreen(name) {
  screens[name]?.classList.remove('hidden');
  current = name;
}

/** Hide one screen and show another */
export function switchScreens(from, to) {
  if (from) hideScreen(from);
  if (to) showScreen(to);
}

/**
 * Show exactly one screen — hides every other visible screen first.
 * Use for menu/HUD navigation so overlays (shop, leaderboard) never stack.
 */
export function navigateTo(to) {
  for (const name of Object.keys(SCREEN_MAP)) {
    if (name !== to && isScreenVisible(name)) {
      hideScreen(name);
    }
  }
  if (to) showScreen(to);
}

/** All screens currently visible (normally should be 0 or 1). */
export function getVisibleScreens() {
  return Object.keys(SCREEN_MAP).filter((name) => isScreenVisible(name));
}

/** Hide every registered screen */
export function hideAllScreens() {
  Object.keys(screens).forEach(hideScreen);
}

/** Hide all screens then show one */
export function showOnly(name) {
  hideAllScreens();
  showScreen(name);
}

/** Which screen is currently visible (checks DOM, not just tracker) */
export function getVisibleScreen() {
  for (const [name] of Object.entries(SCREEN_MAP)) {
    if (isScreenVisible(name)) return name;
  }
  return null;
}

export { screens };
