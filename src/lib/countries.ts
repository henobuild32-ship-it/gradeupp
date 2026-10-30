import countryData from './countries.generated.json' with { type: 'json' }
import { getCountryCallingCode, getCountries, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max'

export interface CountryRecord {
  code: string
  nameFr: string
  nameEn: string
  callingCode: string | null
  flag: string
  exampleNational: string | null
}

export const COUNTRIES = countryData as CountryRecord[]
export const PHONE_COUNTRIES = new Set<string>(getCountries())
export const COUNTRIES_BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]))

export function getCountry(code: string | null | undefined): CountryRecord | undefined {
  return code ? COUNTRIES_BY_CODE.get(code.toUpperCase()) : undefined
}

export function getCallingCode(code: string | null | undefined): string | null {
  if (!code || !PHONE_COUNTRIES.has(code.toUpperCase())) return null
  try {
    return `+${getCountryCallingCode(code.toUpperCase() as CountryCode)}`
  } catch {
    return getCountry(code)?.callingCode ?? null
  }
}

export function normalizeInternationalPhone(input: string, countryCode?: string): string | null {
  const value = input.trim()
  if (!value) return null
  const parsed = value.startsWith('+')
    ? parsePhoneNumberFromString(value)
    : countryCode && PHONE_COUNTRIES.has(countryCode.toUpperCase())
      ? parsePhoneNumberFromString(value, countryCode.toUpperCase() as CountryCode)
      : undefined
  if (parsed?.isValid()) return parsed.number

  // Formats internationaux saisis sans « + » : « 243 810 000 001 » ou « 00 243 810 000 001 »
  const digits = value.replace(/\D/g, '')
  if (!digits) return null
  if (countryCode) {
    const callingCode = getCallingCode(countryCode)
    if (callingCode && digits.startsWith(callingCode.replace('+', ''))) {
      const asIntl = parsePhoneNumberFromString(`+${digits}`)
      if (asIntl?.isValid()) return asIntl.number
    }
  }
  if (digits.startsWith('00')) {
    const asIntl = parsePhoneNumberFromString(`+${digits.slice(2)}`)
    if (asIntl?.isValid()) return asIntl.number
  }
  if (digits.length >= 9) {
    const asIntl = parsePhoneNumberFromString(`+${digits}`)
    if (asIntl?.isValid()) return asIntl.number
  }
  return null
}

/** Build an exact, active-account lookup. Never route by a phone suffix. */
export function activePhoneLookupWhere(phone: string) {
  const normalized = normalizeInternationalPhone((phone || '').trim())
  if (!normalized) return null
  const digits = normalized.replace(/\D/g, '')

  return {
    deletedAt: null,
    OR: [{ phone: normalized }, { phone: digits }, { phone: `+${digits}` }],
  }
}

export function normalizePhoneForCountry(input: string, countryCode: string): string | null {
  const code = countryCode.toUpperCase()
  if (!getCountry(code) || !PHONE_COUNTRIES.has(code)) return null
  const value = input.trim()
  if (!value) return null
  const parsed = value.startsWith('+')
    ? parsePhoneNumberFromString(value)
    : parsePhoneNumberFromString(value, code as CountryCode)
  return parsed?.isValid() && parsed.country === code ? parsed.number : null
}

export function validateInternationalPhone(input: string, countryCode?: string): boolean {
  return normalizeInternationalPhone(input, countryCode) !== null
}
