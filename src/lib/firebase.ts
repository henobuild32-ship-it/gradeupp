import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, browserLocalPersistence, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Ensure local persistence (session survives reload)
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768;
}

export async function signInWithGoogle(): Promise<{ idToken: string; uid: string } | null> {
  // Mobile always uses redirect
  if (isMobileDevice()) {
    await signInWithRedirect(auth, googleProvider);
    return null;
  }

  // Desktop: try popup first
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return { idToken, uid: result.user.uid };
  } catch (err: any) {
    const code = err?.code || '';
    // If popup fails for network/popup reasons, fallback to redirect
    if (
      code === 'auth/network-request-failed' ||
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request'
    ) {
      // For closed-by-user, don't force redirect (user cancelled intentionally)
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw err;
      }
      // For network/blocked, try redirect as fallback
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

export async function completeGoogleRedirect(): Promise<{ idToken: string; uid: string } | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      const idToken = await result.user.getIdToken();
      return { idToken, uid: result.user.uid };
    }
  } catch {
    // no redirect result
  }
  return null;
}
