import bcrypt from 'bcryptjs'

export function normalizeAdminUsername(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFKC').trim().toLowerCase() : ''
}

export function isAdminTemporarilyLocked(lockedUntil: Date | null | undefined, now = new Date()): boolean {
  return !!lockedUntil && lockedUntil.getTime() > now.getTime()
}

export async function verifyAdminPassword(password: unknown, storedHash: string): Promise<boolean> {
  // Password bytes are intentionally not trimmed or case-normalized.
  if (typeof password !== 'string' || password.length === 0 || password.length > 128 || !storedHash.startsWith('$2')) return false
  return bcrypt.compare(password, storedHash)
}
