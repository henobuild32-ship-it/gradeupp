import { createRemoteJWKSet, jwtVerify } from 'jose';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Firebase/Google public JWKS — no service account required for ID token verification
const jwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export async function verifyFirebaseIdToken(idToken: string): Promise<{
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
} | null> {
  try {
    if (!projectId || !idToken) return null;

    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    const uid = payload.sub;
    if (!uid) return null;

    return {
      uid,
      email: typeof payload.email === 'string' ? payload.email : null,
      displayName: typeof payload.name === 'string' ? payload.name : null,
      photoURL: typeof payload.picture === 'string' ? payload.picture : null,
      emailVerified: payload.email_verified === true,
    };
  } catch {
    return null;
  }
}
