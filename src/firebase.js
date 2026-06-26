import { initializeApp } from 'firebase/app';
import { getAuth as createAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app = null;
let auth = null;
let db = null;
let functions = null;
let initialized = false;

/** Initialize Firebase on first online use — not at page load. */
export function initFirebaseApp() {
  if (initialized || !isFirebaseConfigured) {
    return initialized;
  }

  app = initializeApp(firebaseConfig);
  auth = createAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);

  const appCheckKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
  if (appCheckKey && typeof window !== 'undefined') {
    if (import.meta.env.DEV) {
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckKey),
      isTokenAutoRefreshEnabled: true,
    });
  }

  if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true') {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }

  initialized = true;
  return true;
}

export function getFirebaseAuth() {
  initFirebaseApp();
  return auth;
}

export function getFirebaseDb() {
  initFirebaseApp();
  return db;
}

export function getFirebaseFunctions() {
  initFirebaseApp();
  return functions;
}

export { app, auth, db, functions };
