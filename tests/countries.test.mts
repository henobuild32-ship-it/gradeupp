import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { COUNTRIES, getCountry, normalizePhoneForCountry } from '../src/lib/countries.ts'

describe('Trait international country directory', () => {
  it('contains unique ISO countries and territories with localized labels and flags', () => {
    assert.equal(COUNTRIES.length, 250)
    assert.equal(new Set(COUNTRIES.map(({ code }) => code)).size, COUNTRIES.length)
    for (const country of COUNTRIES) {
      assert.match(country.code, /^[A-Z]{2}$/)
      assert.ok(country.nameFr.trim())
      assert.ok(country.nameEn.trim())
      assert.ok(country.flag.trim())
      assert.ok(country.callingCode === null || /^\+\d+$/.test(country.callingCode))
    }
  })

  it('normalizes a valid phone number only when it matches the selected country', () => {
    assert.equal(normalizePhoneForCountry('06 12 34 56 78', 'FR'), '+33612345678')
    assert.equal(normalizePhoneForCountry('+33612345678', 'FR'), '+33612345678')
    assert.equal(normalizePhoneForCountry('+33612345678', 'US'), null)
    assert.equal(normalizePhoneForCountry('+33612345678', 'AQ'), null)
    assert.equal(getCountry('FR')?.callingCode, '+33')
  })
})
