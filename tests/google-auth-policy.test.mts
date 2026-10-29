import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { canUseGoogleIdentityForNewAccount, isGoogleAccountRole, missingGoogleProfileFields, shouldRequestGoogleProfile } from '../src/lib/google-auth-policy.ts'

describe('Google account completion flow', () => {
  it('returns new Google identities to the remaining profile form in login and signup flows', () => {
    assert.equal(shouldRequestGoogleProfile(false), true)
    assert.equal(shouldRequestGoogleProfile(true), false)
  })

  it('requires a verified Google email before account creation or account linking', () => {
    assert.equal(canUseGoogleIdentityForNewAccount('person@example.com', true), true)
    assert.equal(canUseGoogleIdentityForNewAccount('person@example.com', false), false)
    assert.equal(canUseGoogleIdentityForNewAccount('', true), false)
  })

  it('requires the full seller profile while keeping the client profile concise', () => {
    const base = { name: 'Amina Traoré', phone: '+243812345678', country: 'CD', acceptedTerms: true }
    assert.deepEqual(missingGoogleProfileFields('client', base), [])
    assert.deepEqual(missingGoogleProfileFields('seller', base), ['city', 'businessName', 'businessType', 'location'])
    assert.equal(isGoogleAccountRole('agent'), true)
    assert.equal(isGoogleAccountRole('admin'), false)
  })
})
