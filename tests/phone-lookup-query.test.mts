import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { activePhoneLookupWhere } from '../src/lib/countries.ts'

describe('Active Trait phone lookup', () => {
  it('normalizes a complete phone and always excludes anonymized accounts', () => {
    assert.deepEqual(activePhoneLookupWhere('+33 6 12 34 56 78'), {
      deletedAt: null,
      OR: [
        { phone: '+33612345678' },
        { phone: '33612345678' },
        { phone: '+33612345678' },
      ],
    })
  })

  it('does not build an account lookup for an invalid number', () => {
    assert.equal(activePhoneLookupWhere('not a telephone number'), null)
  })
})
