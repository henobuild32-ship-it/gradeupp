export type UnlockMethod = 'none' | 'pin' | 'biometric'

export function isUnlockMethod(value: unknown): value is UnlockMethod {
  return value === 'none' || value === 'pin' || value === 'biometric'
}

export function canSelectUnlockMethod(method: UnlockMethod, account: { hasPin: boolean; biometricEnrolled: boolean }) {
  if (method === 'pin' && !account.hasPin) return { allowed: false, code: 'PIN_REQUIRED' as const }
  if (method === 'biometric' && !account.biometricEnrolled) return { allowed: false, code: 'BIOMETRIC_ENROLLMENT_REQUIRED' as const }
  return { allowed: true as const }
}
