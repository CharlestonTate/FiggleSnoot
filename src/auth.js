import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase.js';
import { assertCleanDisplayName, assertCleanEmail } from './profanity-filter.js';
import { initSkinsFromProfile } from './skins.js';
let currentUser = null;
let currentDisplayName = null;

export function getCurrentUser() {
  return currentUser;
}

export function getDisplayName() {
  return currentDisplayName;
}

export function isSignedIn() {
  return Boolean(currentUser);
}

async function loadUserProfile(uid) {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn('Could not load user profile:', err);
    return null;
  }
}

export function initAuth(onAuthChange) {
  if (!isFirebaseConfigured || !auth) {
    onAuthChange?.(null, null);
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      try {
        const profile = await loadUserProfile(user.uid);
        currentDisplayName = profile?.displayName || user.email?.split('@')[0] || 'Player';
        initSkinsFromProfile(profile);
      } catch {
        currentDisplayName = user.email?.split('@')[0] || 'Player';
      }
    } else {
      currentDisplayName = null;
    }
    onAuthChange?.(user, currentDisplayName);
    window.dispatchEvent(new CustomEvent('auth:change', {
      detail: { user, displayName: currentDisplayName },
    }));
  });
}

export async function signUp(email, password, displayName) {
  if (!auth || !db) throw new Error('Firebase is not configured.');
  if (!email?.trim()) throw new Error('Enter your email.');
  if (!password) throw new Error('Enter a password.');
  assertCleanEmail(email);
  const trimmedName = (displayName ?? '').trim();
  if (trimmedName.length < 2 || trimmedName.length > 20) {
    throw new Error('Display name must be 2–20 characters.');
  }
  assertCleanDisplayName(trimmedName);

  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await setDoc(doc(db, 'users', cred.user.uid), {
    displayName: trimmedName,
    email: email.trim(),
    equippedSkin: 'default',
    createdAt: serverTimestamp(),
  });
  currentDisplayName = trimmedName;
  return cred.user;
}

export async function signIn(email, password) {
  if (!auth) throw new Error('Firebase is not configured.');
  if (!email?.trim()) throw new Error('Enter your email.');
  if (!password) throw new Error('Enter your password.');
  assertCleanEmail(email);
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const profile = await loadUserProfile(cred.user.uid);
  currentDisplayName = profile?.displayName || cred.user.email?.split('@')[0] || 'Player';
  initSkinsFromProfile(profile);
  return cred.user;
}

export async function logOut() {
  if (!auth) return;
  await signOut(auth);
  currentUser = null;
  currentDisplayName = null;
}

export async function resetPassword(email) {
  if (!auth) throw new Error('Firebase is not configured.');
  assertCleanEmail(email);
  await sendPasswordResetEmail(auth, email.trim());
}

const LEADERBOARD_MODES = ['base', 'timeAttack', 'blackout'];

async function deleteUserFirestoreData(uid) {
  if (!db || !uid) return;
  await Promise.all(LEADERBOARD_MODES.map((mode) =>
    deleteDoc(doc(db, 'leaderboards', mode, 'entries', uid)).catch(() => {})));
  await deleteDoc(doc(db, 'users', uid)).catch(() => {});
}

export async function deleteMyGlobalScores() {
  const uid = currentUser?.uid;
  if (!auth || !db || !uid) throw new Error('Sign in to delete global scores.');
  await Promise.all(LEADERBOARD_MODES.map((mode) =>
    deleteDoc(doc(db, 'leaderboards', mode, 'entries', uid))));
}

export async function deleteAccount(password) {
  if (!auth || !db) throw new Error('Firebase is not configured.');
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  if (!password) throw new Error('Enter your password to delete your account.');

  const cred = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, cred);
  const uid = user.uid;
  await deleteUserFirestoreData(uid);
  await deleteUser(user);
  currentUser = null;
  currentDisplayName = null;
}

export function updateAccountUI() {
  const guestActions = document.getElementById('account-guest-actions');
  const signedInPanel = document.getElementById('account-signed-in');
  const titleEl = document.getElementById('account-title-name');
  const signOutBtn = document.getElementById('account-signout-button');
  const deleteScoresBtn = document.getElementById('account-delete-scores-button');
  const deleteAccountBtn = document.getElementById('account-delete-account-button');
  const skinEl = document.getElementById('account-equipped-skin');

  if (!guestActions || !signedInPanel) return;

  if (currentUser) {
    guestActions.classList.add('hidden');
    signedInPanel.classList.remove('hidden');
    signOutBtn?.classList.toggle('hidden', !currentUser);
    deleteScoresBtn?.classList.toggle('hidden', !currentUser);
    deleteAccountBtn?.classList.toggle('hidden', !currentUser);
    skinEl?.classList.remove('hidden');
    if (titleEl) titleEl.textContent = currentDisplayName || currentUser.email || 'Account';
  } else {
    guestActions.classList.remove('hidden');
    signedInPanel.classList.add('hidden');
    signOutBtn?.classList.add('hidden');
    deleteScoresBtn?.classList.add('hidden');
    deleteAccountBtn?.classList.add('hidden');
    skinEl?.classList.remove('hidden');
    if (titleEl) titleEl.textContent = 'Account';
  }
}

/** Call once after the auth module loads (from bootstrap-online.js). */
export function initAuthModule() {
  initAuth(() => updateAccountUI());
}
