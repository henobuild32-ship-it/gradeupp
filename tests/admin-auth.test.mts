import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { isAdminTemporarilyLocked, normalizeAdminUsername, verifyAdminPassword } from '../src/lib/admin-auth.ts'

describe('administrator credential handling', () => {
  it('normalizes username spaces and case while preserving password bytes', async () => {
    assert.equal(normalizeAdminUsername('  Admin  '), 'admin')
    assert.equal(normalizeAdminUsername('ＡＤＭＩＮ'), 'admin')
    const password = '  Pàssw0rd!  '
    const hash = await bcrypt.hash(password, 4)
    assert.equal(await verifyAdminPassword(password, hash), true)
    assert.equal(await verifyAdminPassword(password.trim(), hash), false)
    assert.equal(await verifyAdminPassword('wrong password', hash), false)
  })

  it('reports active and expired temporary lockouts', () => {
    const now = new Date('2026-10-29T12:00:00Z')
    assert.equal(isAdminTemporarilyLocked(new Date('2026-10-29T12:01:00Z'), now), true)
    assert.equal(isAdminTemporarilyLocked(new Date('2026-10-29T11:59:00Z'), now), false)
    assert.equal(isAdminTemporarilyLocked(null, now), false)
  })
})
