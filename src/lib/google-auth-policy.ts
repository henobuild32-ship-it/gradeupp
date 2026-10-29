export type GoogleAccountRole = 'client' | 'agent' | 'seller'

export function isGoogleAccountRole(value: unknown): value is GoogleAccountRole {
  return value === 'client' || value === 'agent' || value === 'seller'
}

export function shouldRequestGoogleProfile(accountFound: boolean): boolean {
  return !accountFound
}

export function canUseGoogleIdentityForNewAccount(email: unknown, emailVerified: boolean): boolean {
  return typeof email === 'string' && email.trim().length > 0 && emailVerified
}

export function missingGoogleProfileFields(
  role: GoogleAccountRole,
  profile: {
    name?: unknown
    phone?: unknown
    country?: unknown
    acceptedTerms?: unknown
    city?: unknown
    businessName?: unknown
    businessType?: unknown
    location?: unknown
  },
): string[] {
  const missing: string[] = []
  if (typeof profile.name !== 'string' || !profile.name.trim()) missing.push('name')
  if (typeof profile.phone !== 'string' || !profile.phone.trim()) missing.push('phone')
  if (typeof profile.country !== 'string' || !profile.country.trim()) missing.push('country')
  if (profile.acceptedTerms !== true) missing.push('acceptedTerms')
  if (role === 'seller') {
    if (typeof profile.city !== 'string' || !profile.city.trim()) missing.push('city')
    if (typeof profile.businessName !== 'string' || !profile.businessName.trim()) missing.push('businessName')
    if (typeof profile.businessType !== 'string' || !profile.businessType.trim()) missing.push('businessType')
    if (typeof profile.location !== 'string' || !profile.location.trim()) missing.push('location')
  }
  return missing
}
