/** User-facing messages for Firebase Auth / Firestore / Functions errors */
export function mapFirebaseError(err) {
  const code = err?.code || '';
  const message = err?.message || '';

  const messages = {
    'auth/email-already-in-use': 'That email is already registered. Try signing in.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/invalid-login-credentials': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/operation-not-allowed': 'Email/password sign-in is disabled. Enable it in Firebase Console → Authentication.',
    'auth/network-request-failed': 'Network blocked — disable ad blockers or try another browser.',
    'auth/missing-password': 'Enter a password.',
    'auth/missing-email': 'Enter your email.',
    'permission-denied': 'Server permissions error. Run: firebase deploy --only firestore:rules',
    'functions/unavailable': 'Global server unavailable. Upgrade Firebase to Blaze plan to enable.',
    'functions/not-found': 'Global server not deployed yet.',
  };

  if (messages[code]) return messages[code];
  if (message.includes('Failed to fetch') || message.includes('Network Error')) {
    return 'Network blocked — disable ad blockers or try another browser.';
  }
  return message || 'Something went wrong. Try again.';
}
