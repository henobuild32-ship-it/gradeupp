import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { TransferProviderRegistry, type TransferProviderAdapter } from '../src/lib/transfers/providers.ts'

const testProvider: TransferProviderAdapter = {
  id: 'test-bank',
  displayName: 'Test Bank',
  rail: 'bank',
  countries: ['FR', 'US'],
  currencies: ['USD', 'CDF'],
  async quote() { throw new Error('not called') },
  async submit() { throw new Error('not called') },
  async getStatus() { return 'pending_provider' },
}

describe('External transfer provider registry', () => {
  it('does not advertise providers until a real adapter is registered', () => {
    const registry = new TransferProviderRegistry()
    assert.deepEqual(registry.capabilities(), [])
    assert.deepEqual(registry.find({ country: 'FR', currency: 'USD', rail: 'bank' }), [])
  })

  it('returns only adapters that explicitly support the requested corridor', () => {
    const registry = new TransferProviderRegistry()
    registry.register(testProvider)
    assert.deepEqual(registry.find({ country: 'fr', currency: 'USD', rail: 'bank' }), [testProvider])
    assert.deepEqual(registry.find({ country: 'FR', currency: 'CDF', rail: 'mobile_money' }), [])
    assert.deepEqual(registry.find({ country: 'CD', currency: 'USD', rail: 'bank' }), [])
    assert.throws(() => registry.register(testProvider), /already registered/)
  })
})
