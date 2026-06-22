import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase.js';
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
  const trimmedName = (displayName ?? '').trim();
  if (trimmedName.length < 2 || trimmedName.length > 20) {
    throw new Error('Display name must be 2–20 characters.');
  }

  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await setDoc(doc(db, 'users', cred.user.uid), {
    displayName: trimmedName,
    email: email.trim(),
    createdAt: serverTimestamp(),
  });
  currentDisplayName = trimmedName;
  return cred.user;
}

export async function signIn(email, password) {
  if (!auth) throw new Error('Firebase is not configured.');
  if (!email?.trim()) throw new Error('Enter your email.');
  if (!password) throw new Error('Enter your password.');
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const profile = await loadUserProfile(cred.user.uid);
  currentDisplayName = profile?.displayName || cred.user.email?.split('@')[0] || 'Player';
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
  await sendPasswordResetEmail(auth, email.trim());
}

export function updateAccountUI() {
  const signedOut = document.getElementById('account-signed-out');
  const signedIn = document.getElementById('account-signed-in');
  const nameEl = document.getElementById('account-display-name');
  if (!signedOut || !signedIn) return;

  if (currentUser) {
    signedOut.classList.add('hidden');
    signedIn.classList.remove('hidden');
    if (nameEl) nameEl.textContent = currentDisplayName || currentUser.email;
  } else {
    signedOut.classList.remove('hidden');
    signedIn.classList.add('hidden');
  }
}

/** Call once after the auth module loads (from bootstrap-online.js). */
export function initAuthModule() {
  initAuth(() => updateAccountUI());
}
