import { Capacitor } from '@capacitor/core';
import { AccessControl, NativeBiometric, BiometryType, BiometricAuthError } from '@capgo/capacitor-native-biometric';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type { User } from '@/lib/store';

/**
 * Déverrouillage biométrique multi-plateforme — réel, pas simulé :
 *
 * - Web / PWA  : WebAuthn (plateforme) — empreinte, Face ID / Touch ID,
 *                Windows Hello ou code de l'appareil selon l'OS.
 *                Clé publique vérifiée serveur (@simplewebauthn/server).
 * - APK natif  : @capgo/capacitor-native-biometric — BiometricPrompt Android /
 *                LAContext iOS (+ code de l'appareil en repli). Un secret
 *                aléatoire vit dans le Keystore/Keychain ; le serveur n'en
 *                garde que le SHA-256 et fabrique la session au déverrouillage.
 */

export type BiometricSupport = {
  supported: boolean;
  platform: 'web' | 'native';
  label: string; // libellé humain (Empreinte, Face ID, …)
};

const BIOMETRIC_CRED_KEY = 'trait-biometric-cred';
const NATIVE_SERVICE = 'com.trait.app.biometric';
const NATIVE_USERNAME = 'trait-unlock-secret';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export async function checkBiometricSupport(): Promise<BiometricSupport> {
  if (isNativePlatform()) {
    try {
      const avail = await NativeBiometric.isAvailable({ useFallback: false });
      if (!avail.isAvailable) {
        return { supported: false, platform: 'native', label: 'Indisponible' };
      }
      const label = (() => {
        switch (avail.biometryType) {
          case BiometryType.FACE_ID:
          case BiometryType.FACE_AUTHENTICATION:
            return 'Reconnaissance faciale';
          case BiometryType.FINGERPRINT:
          case BiometryType.TOUCH_ID:
            return 'Empreinte digitale';
          case BiometryType.MULTIPLE:
            return 'Biométrie';
          default:
            return 'Code de l’appareil';
        }
      })();
      return { supported: true, platform: 'native', label };
    } catch {
      return { supported: false, platform: 'native', label: 'Indisponible' };
    }
  }

  // Web : PublicKeyCredential + authentificateur de plateforme requis
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return { supported: false, platform: 'web', label: 'Indisponible' };
    }
    const uvpa = await (window.PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable?.();
    if (!uvpa) {
      return { supported: false, platform: 'web', label: 'Indisponible' };
    }
    const ua = navigator.userAgent;
    const label = /iPhone|iPad|Mac/.test(ua)
      ? 'Face ID / Touch ID'
      : /Android/.test(ua)
        ? 'Empreinte / code de l’appareil'
        : /Windows/.test(ua)
          ? 'Windows Hello'
          : 'Biométrie de l’appareil';
    return { supported: true, platform: 'web', label };
  } catch {
    return { supported: false, platform: 'web', label: 'Indisponible' };
  }
}

const BIOMETRIC_ERROR_FR: Record<number, string> = {
  [BiometricAuthError.UNKNOWN_ERROR]: 'Échec de la biométrie',
  [BiometricAuthError.BIOMETRICS_UNAVAILABLE]: 'Biométrie indisponible sur cet appareil',
  [BiometricAuthError.USER_LOCKOUT]: 'Trop de tentatives — déverrouillez votre appareil puis réessayez',
  [BiometricAuthError.BIOMETRICS_NOT_ENROLLED]:
    'Aucune empreinte ni visage enregistré sur l’appareil. Ajoutez-en un dans les réglages du téléphone.',
  [BiometricAuthError.USER_TEMPORARY_LOCKOUT]: 'Trop de tentatives — réessayez dans quelques instants',
  [BiometricAuthError.AUTHENTICATION_FAILED]: 'Empreinte ou visage non reconnu',
  [BiometricAuthError.APP_CANCEL]: 'Annulé',
  [BiometricAuthError.INVALID_CONTEXT]: 'Erreur biométrie — redémarrez l’application',
  [BiometricAuthError.NOT_INTERACTIVE]: 'Impossible d’afficher le déverrouillage — réessayez',
  [BiometricAuthError.PASSCODE_NOT_SET]: 'Définissez d’abord un code de verrouillage sur votre téléphone',
  [BiometricAuthError.SYSTEM_CANCEL]: 'Annulé',
  [BiometricAuthError.USER_CANCEL]: 'Annulé',
  [BiometricAuthError.USER_FALLBACK]: 'Annulé',
  [BiometricAuthError.NO_PROTECTED_CREDENTIALS_FOUND]:
    'Déverrouillage biométrique à réactiver sur cet appareil. Connectez-vous avec votre PIN TRAIT ou votre mot de passe.',
};

export function describeBiometricError(err: unknown): string {
  const anyErr = err as { errorCode?: unknown; code?: unknown; message?: unknown } | null;
  const raw = String(anyErr?.message || err || '');
  const upper = raw.toUpperCase().replace(/[\s-]+/g, '_');
  const codeRaw = anyErr?.errorCode ?? anyErr?.code;
  const code = typeof codeRaw === 'string' ? Number(codeRaw) : codeRaw;
  if (typeof code === 'number' && BIOMETRIC_ERROR_FR[code]) return BIOMETRIC_ERROR_FR[code];
  const byToken: [RegExp, string][] = [
    [/BIOMETRICS_NOT_ENROLLED|NOT_ENROLLED/, BIOMETRIC_ERROR_FR[BiometricAuthError.BIOMETRICS_NOT_ENROLLED]],
    [/BIOMETRICS_UNAVAILABLE|NOT_AVAILABLE|NO_BIOMETRIC/, BIOMETRIC_ERROR_FR[BiometricAuthError.BIOMETRICS_UNAVAILABLE]],
    [/NOT_IMPLEMENTED|DOES_NOT_EXIST|NOT_REGISTERED|NO_PLUGIN/, 'Biométrie indisponible — mettez à jour l’application'],
    [/LOCKOUT_PERMANENT|TOO_MANY_ATTEMPTS|USER_LOCKOUT/, BIOMETRIC_ERROR_FR[BiometricAuthError.USER_LOCKOUT]],
    [/TEMPORARY_LOCKOUT/, BIOMETRIC_ERROR_FR[BiometricAuthError.USER_TEMPORARY_LOCKOUT]],
    [/AUTHENTICATION_FAILED|BIOMETRIC_[A-Z_]*FAILED/, BIOMETRIC_ERROR_FR[BiometricAuthError.AUTHENTICATION_FAILED]],
    [/PASSCODE_NOT_SET|SCREEN_LOCK_NOT_SET/, BIOMETRIC_ERROR_FR[BiometricAuthError.PASSCODE_NOT_SET]],
    [/NOT_INTERACTIVE/, BIOMETRIC_ERROR_FR[BiometricAuthError.NOT_INTERACTIVE]],
    [/INVALID_CONTEXT/, BIOMETRIC_ERROR_FR[BiometricAuthError.INVALID_CONTEXT]],
    [/CANCEL|ABORT|DISMISSED|NOT_ALLOWED|NOTALLOWED|USER_FALLBACK/, 'Annulé'],
    [/NETWORK|FETCH|ECONNREFUSED|ETIMEDOUT/i, 'Connexion impossible — vérifiez votre réseau'],
  ];
  for (const [pattern, msg] of byToken) {
    if (pattern.test(upper) || pattern.test(raw)) return msg;
  }
  if (!raw || raw === 'Error' || upper === 'UNKNOWN_ERROR') return 'Échec de la biométrie';
  return raw;
}

function deviceName(): string {
  if (isNativePlatform()) {
    return `Appareil ${Capacitor.getPlatform() === 'android' ? 'Android' : 'iOS'}`;
  }
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'PC Windows';
  return 'Navigateur';
}

async function api(path: string, body?: any) {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Erreur biométrique');
  }
  return data;
}

/** Enrôle l'appareil courant pour le déverrouillage biométrique. */
export async function enrollBiometric(): Promise<void> {
  const support = await checkBiometricSupport();
  if (!support.supported) {
    throw new Error('La biométrie n’est pas disponible sur cet appareil');
  }

  if (support.platform === 'native') {
    // Secret aléatoire → Keystore/Keychain, protégé par la biométrie du système.
    // Le contrôle est appliqué au secret lui-même, pas seulement à l'interface.
    const secret = randomSecret();
    try {
      await NativeBiometric.setCredentials({
        username: NATIVE_USERNAME,
        password: secret,
        server: NATIVE_SERVICE,
        accessControl: AccessControl.BIOMETRY_CURRENT_SET,
        title: 'Activer le déverrouillage TRAIT',
        negativeButtonText: 'Annuler',
        maxAttempts: 3,
      });
    } catch (err) {
      throw new Error(describeBiometricError(err));
    }

    // 3. Le serveur ne garde que le hash
    try {
      await api('/api/biometric/native', { enable: true, secret, deviceName: deviceName() });
    } catch (err) {
      await NativeBiometric.deleteCredentials({ server: NATIVE_SERVICE }).catch(() => {});
      throw err;
    }
    return;
  }

  // Web — WebAuthn
  const { options, challengeToken } = await api('/api/biometric/register/options', {});
  const attestation = await startRegistration({ optionsJSON: options as any });
  const verify = await api('/api/biometric/register/verify', {
    response: attestation,
    challengeToken,
    deviceName: deviceName(),
  });
  if (verify.credentialId) {
    try {
      localStorage.setItem(BIOMETRIC_CRED_KEY, verify.credentialId);
    } catch {}
  }
}

/** Déverrouille l'app via la biométrie. Retourne l'utilisateur rafraîchi. */
export async function authenticateBiometric(reason?: string): Promise<User> {
  const support = await checkBiometricSupport();
  if (!support.supported) {
    throw new Error('La biométrie n’est pas disponible sur cet appareil');
  }

  if (support.platform === 'native') {
    let cred: { password?: string } | null = null;
    try {
      cred = await NativeBiometric.getSecureCredentials({
        server: NATIVE_SERVICE,
        reason: reason || 'Confirmez votre identité pour accéder à votre compte.',
        title: 'Déverrouiller TRAIT',
        subtitle: 'Authentification biométrique',
        description: reason || 'Confirmez votre identité pour accéder à votre compte.',
        negativeButtonText: 'Annuler',
        maxAttempts: 3,
      });
    } catch (err) {
      const msg = describeBiometricError(err);
      const errorCode = (err as { errorCode?: unknown } | null)?.errorCode;
      if (errorCode === BiometricAuthError.NO_PROTECTED_CREDENTIALS_FOUND) {
        // Migration d'un secret stocké par l'ancien plugin : l'ancien secret
        // n'est lu qu'après une authentification système, puis immédiatement
        // réécrit avec une protection Keystore/Keychain liée à la biométrie.
        try {
          await NativeBiometric.verifyIdentity({
            title: 'Sécuriser le déverrouillage TRAIT',
            subtitle: 'Mise à niveau de sécurité',
            description: 'Confirmez votre identité pour protéger votre accès sur cet appareil.',
            negativeButtonText: 'Annuler',
            useFallback: true,
            maxAttempts: 3,
          });
          const legacyCredential = await NativeBiometric.getCredentials({ server: NATIVE_SERVICE });
          if (legacyCredential.password) {
            await NativeBiometric.setCredentials({
              username: legacyCredential.username || NATIVE_USERNAME,
              password: legacyCredential.password,
              server: NATIVE_SERVICE,
              accessControl: AccessControl.BIOMETRY_CURRENT_SET,
              title: 'Sécuriser le déverrouillage TRAIT',
              negativeButtonText: 'Annuler',
              maxAttempts: 3,
            });
            cred = await NativeBiometric.getSecureCredentials({
              server: NATIVE_SERVICE,
              reason: 'Confirmez votre identité pour accéder à votre compte.',
              title: 'Déverrouiller TRAIT',
              negativeButtonText: 'Annuler',
              maxAttempts: 3,
            });
          }
        } catch (migrationError) {
          throw new Error(describeBiometricError(migrationError));
        }
      }
      if (/introuvable|non reconnu|Échec/i.test(msg)) {
        throw new Error('Déverrouillage biométrique introuvable sur cet appareil — réactivez-le dans les réglages.');
      }
      if (!cred?.password) throw new Error(msg);
    }
    if (!cred?.password) {
      throw new Error('Déverrouillage biométrique introuvable sur cet appareil — réactivez-le dans les réglages.');
    }
    const data = await api('/api/biometric/native/unlock', { secret: cred.password });
    if (data.token) {
      const { useAppStore } = await import('@/lib/store');
      useAppStore.getState().setToken(data.token);
    }
    return data.user as User;
  }

  // Web — WebAuthn : la credential locale permet de s'authentifier même
  // sans session (cookie expiré) — le serveur identifie l'utilisateur par la clé.
  let credentialId: string | null = null;
  try {
    credentialId = localStorage.getItem(BIOMETRIC_CRED_KEY);
  } catch {}

  const { options, challengeToken } = await api('/api/biometric/auth/options', {
    credentialId: credentialId || undefined,
  });
  const assertion = await startAuthentication({ optionsJSON: options as any });
  const data = await api('/api/biometric/auth/verify', { response: assertion, challengeToken });
  if (data.token) {
    (await import('@/lib/store')).useAppStore.getState().setToken(data.token);
  }
  return data.user as User;
}

/** Désactive le déverrouillage biométrique sur tous les appareils. */
export async function disableBiometric(): Promise<void> {
  if (isNativePlatform()) {
    await NativeBiometric.deleteCredentials({ server: NATIVE_SERVICE }).catch(() => {});
  }
  try {
    localStorage.removeItem(BIOMETRIC_CRED_KEY);
  } catch {}
  const res = await fetch('/api/biometric?all=1', { method: 'DELETE', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Erreur lors de la désactivation');
  }
}

export function storedCredentialId(): string | null {
  try {
    return localStorage.getItem(BIOMETRIC_CRED_KEY);
  } catch {
    return null;
  }
}

function randomSecret(): string {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error('Le stockage sécurisé de cet appareil n’est pas disponible');
  }
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
