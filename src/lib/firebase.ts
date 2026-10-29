import { initializeApp, getApps, getApp } from '@firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  type Auth,
} from '@firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const hasRequiredConfig = () =>
  Boolean(firebaseConfig.apiKey?.trim() && firebaseConfig.authDomain?.trim() &&
    firebaseConfig.projectId?.trim() && firebaseConfig.appId?.trim());

let authInstance: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let persistenceReady: Promise<void> | null = null;
let redirectResult: Promise<{ idToken: string; uid: string } | null> | null = null;
const GOOGLE_REDIRECT_PENDING_KEY = 'trait-google-redirect-pending';

/** Google is an optional sign-in provider; missing config must never break Trait auth. */
export function isGoogleAuthConfigured(): boolean {
  return hasRequiredConfig();
}

function getFirebaseAuth(): Auth {
  if (!hasRequiredConfig()) {
    const error = new Error('Google authentication is not configured');
    error.name = 'GoogleAuthNotConfiguredError';
    throw error;
  }

  if (!authInstance) {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    // Finish persistence setup before starting popup/redirect. Firebase can otherwise
    // race a redirect against its first persistence write, especially in installed PWAs.
    persistenceReady = setPersistence(authInstance, browserLocalPersistence).catch(async () => {
      await setPersistence(authInstance!, browserSessionPersistence);
    });
  }
  return authInstance;
}

async function getReadyAuth(): Promise<Auth> {
  const auth = getFirebaseAuth();
  await persistenceReady;
  return auth;
}

function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  }
  return googleProvider;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS/Android always redirect (popup unreliable, especially in PWA)
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return true;
  }
  // Installed PWA (standalone) — popup may be blocked
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  return false;
}

function markGoogleRedirectPending() {
  try { sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1'); } catch { /* Redirect result remains the source of truth. */ }
}

function hasGoogleRedirectPending(): boolean {
  try { return sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === '1'; } catch { return true; }
}

function clearGoogleRedirectPending() {
  try { sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY); } catch { /* Ignore unavailable browser storage. */ }
}

export async function signInWithGoogle(): Promise<{ idToken: string; uid: string } | null> {
  const auth = await getReadyAuth();
  const provider = getGoogleProvider();
  if (isMobileDevice()) {
    redirectResult = null;
    markGoogleRedirectPending();
    await signInWithRedirect(auth, provider);
    return null;
  }

  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return { idToken, uid: result.user.uid };
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw err;
    }
    // Only a browser that cannot host the popup should fall back to a full redirect.
    // Configuration and provider errors must be surfaced instead of being hidden by
    // a second, doomed authentication attempt.
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(code)) {
      redirectResult = null;
      markGoogleRedirectPending();
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

export function completeGoogleRedirect(): Promise<{ idToken: string; uid: string } | null> {
  if (!hasRequiredConfig() || !hasGoogleRedirectPending()) return Promise.resolve(null);
  if (!redirectResult) {
    redirectResult = (async () => {
      try {
        const result = await getRedirectResult(await getReadyAuth());
        if (result?.user) {
          const idToken = await result.user.getIdToken();
          return { idToken, uid: result.user.uid };
        }
        return null;
      } finally {
        clearGoogleRedirectPending();
    }
    })();
  }
  return redirectResult;
}
