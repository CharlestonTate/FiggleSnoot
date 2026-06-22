/** User-facing messages for Firebase Auth / Firestore errors */
export function mapFirebaseError(err) {
  const code = err?.code || '';
  const messages = {
    'auth/email-already-in-use': 'That email is already registered. Try signing in.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'permission-denied': 'Server permissions error. Run: firebase deploy --only firestore:rules',
  };
  return messages[code] || err?.message || 'Something went wrong. Try again.';
}
