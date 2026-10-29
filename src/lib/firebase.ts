import { initializeApp, getApps, getApp } from '@firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
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
    // Ensure Google sessions can survive a page reload where browser storage permits it.
    void setPersistence(authInstance, browserLocalPersistence).catch(() => {});
  }
  return authInstance;
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

export async function signInWithGoogle(): Promise<{ idToken: string; uid: string } | null> {
  const auth = getFirebaseAuth();
  const provider = getGoogleProvider();
  if (isMobileDevice()) {
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
    // popup-blocked, network-request-failed, internal-error, unauthorized-domain → try redirect
    await signInWithRedirect(auth, provider);
    return null;
  }
}

export async function completeGoogleRedirect(): Promise<{ idToken: string; uid: string } | null> {
  if (!hasRequiredConfig()) return null;
  try {
    const result = await getRedirectResult(getFirebaseAuth());
    if (result?.user) {
      const idToken = await result.user.getIdToken();
      return { idToken, uid: result.user.uid };
    }
  } catch {
    // no redirect result
  }
  return null;
}
