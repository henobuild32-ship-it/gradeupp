import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminAuth: Auth | null = null;

function getFirebaseAdmin(): Auth {
  if (adminAuth) return adminAuth;

  let app: App;
  if (getApps().length) {
    app = getApp();
  } else {
    // Use project ID + default credentials (Vercel provides them)
    // Or service account JSON in FIREBASE_SERVICE_ACCOUNT_KEY
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccount) {
      app = initializeApp({
        credential: cert(JSON.parse(serviceAccount)),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  }

  adminAuth = getAuth(app);
  return adminAuth;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<{
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
} | null> {
  try {
    const auth = getFirebaseAdmin();
    const decoded = await auth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
      photoURL: decoded.picture ?? null,
      emailVerified: decoded.email_verified ?? false,
    };
  } catch {
    return null;
  }
}
