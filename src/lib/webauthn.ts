import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * WebAuthn helpers — RP ID/origin resolution + stateless signed challenges.
 *
 * Les challenges sont signés avec JWT_SECRET (HMAC-SHA256) au lieu d'être
 * gardés en mémoire : sur Vercel serverless chaque requête peut tomber sur
 * une instance différente, un Map en mémoire serait perdu.
 */

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET environment variable is required for biometric authentication');
  return value;
}

export function base64urlEncode(buf: Uint8Array): string {
  return Buffer.from(buf).toString('base64url');
}

export function base64urlDecode(value: string): Uint8Array<ArrayBuffer> {
  const bytes = Buffer.from(value, 'base64url');
  const decoded = new Uint8Array(bytes.length);
  decoded.set(bytes);
  return decoded;
}

/** Signe un challenge : token = payload_b64url.signature_b64url */
export function signChallenge(purpose: string, challenge: string, extra?: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      p: purpose,
      c: challenge,
      s: extra || '',
      exp: Date.now() + CHALLENGE_TTL_MS,
    })
  ).toString('base64url');
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** Vérifie signature + expiration d'un challenge signé. Retourne le challenge stocké. */
export function verifySignedChallenge(token: string, purpose: string): string | null {
  return verifySignedChallengeClaim(token, purpose)?.challenge ?? null;
}

export function verifySignedChallengeClaim(token: string, purpose: string): { challenge: string; subject: string } | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.p !== purpose || typeof data.c !== 'string' || typeof data.s !== 'string') return null;
    if (typeof data.exp !== 'number' || Date.now() > data.exp) return null;
    return { challenge: data.c, subject: data.s };
  } catch {
    return null;
  }
}

/**
 * Résout le RP ID et la liste des origines acceptées depuis les en-têtes.
 * L'origine effective est celle où tourne le navigateur (host proxy Vercel,
 * ou localhost en dev), donc toujours cohérente avec l'appel navigator.credentials.
 */
export function resolveRp(request: Request): { rpID: string; origins: string[] } {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host') || 'localhost:2398';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.');
  const proto = request.headers.get('x-forwarded-proto') || (isLocal ? 'http' : 'https');
  const origins = new Set<string>(['https://trait-rho.vercel.app']);
  const addOrigin = (value?: string | null) => {
    if (!value) return;
    try {
      const parsed = new URL(value.includes('://') ? value : `https://${value}`);
      if (parsed.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && parsed.hostname === 'localhost')) {
        origins.add(parsed.origin);
      }
    } catch {}
  };

  addOrigin(process.env.NEXT_PUBLIC_APP_URL);
  addOrigin(process.env.VERCEL_URL);
  for (const allowed of (process.env.WEBAUTHN_ORIGINS || '').split(',')) addOrigin(allowed.trim());
  if (process.env.NODE_ENV !== 'production') origins.add('http://localhost:2398');

  let requestOrigin = '';
  try { requestOrigin = new URL(`${proto}://${host}`).origin; } catch {}
  if (isLocal && process.env.NODE_ENV !== 'production') origins.add(requestOrigin);

  const trustedOrigin = origins.has(requestOrigin) ? requestOrigin : 'https://trait-rho.vercel.app';
  const rpID = new URL(trustedOrigin).hostname;
  return { rpID, origins: Array.from(origins) };
}

export function randomChallenge(): string {
  return randomBytes(32).toString('base64url');
}
