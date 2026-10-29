import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateCurrencyFee } from '../src/lib/currency.ts'
import { calculateWithdrawalUsage, FINANCIAL_POLICY, getDayWindow, isWithinDailyTransactionLimit } from '../src/lib/financial-policy-core.ts'
import { canSelectUnlockMethod } from '../src/lib/unlock-method-policy.ts'

describe('financial controls', () => {
  it('sets the requested daily limits and enforces the 30-operation boundary', () => {
    assert.equal(FINANCIAL_POLICY.dailyTransactionLimit, 30)
    assert.equal(isWithinDailyTransactionLimit(29, 30), true)
    assert.equal(isWithinDailyTransactionLimit(30, 30), false)
  })

  it('computes Kinshasa day windows in UTC independent of the host timezone', () => {
    const window = getDayWindow(new Date('2026-10-28T23:30:00.000Z'))
    assert.equal(window.start.toISOString(), '2026-10-28T23:00:00.000Z')
    assert.equal(window.end.toISOString(), '2026-10-29T23:00:00.000Z')
  })

  it('uses one combined USD/CDF withdrawal cap without a currency switch bypass', () => {
    assert.equal(FINANCIAL_POLICY.dailyWithdrawalLimitUsd * 2300, FINANCIAL_POLICY.dailyWithdrawalLimitCdf)
    const atLimit = calculateWithdrawalUsage([{ amount: 5_000, currency: 'USD' }], 4_900, 'USD', 2300, 9_900, 22_770_000)
    assert.equal(atLimit.allowed, true)
    const overLimitInCdf = calculateWithdrawalUsage([{ amount: 9_000, currency: 'USD' }], 2_070_001, 'CDF', 2300, 9_900, 22_770_000)
    assert.equal(overLimitInCdf.allowed, false)
  })

  it('rounds withdrawal and transfer fees per currency at 1% and 1.5%', () => {
    assert.equal(calculateCurrencyFee('100.00', 100, 'USD'), 1)
    assert.equal(calculateCurrencyFee('1001', 100, 'CDF'), 10)
    assert.equal(calculateCurrencyFee('100.00', 150, 'USD'), 1.5)
    assert.equal(calculateCurrencyFee('100.00', 0, 'USD'), 0)
  })

  it('keeps local app unlock choices exclusive and requires enrollment first', () => {
    assert.equal(canSelectUnlockMethod('pin', { hasPin: false, biometricEnrolled: true }).allowed, false)
    assert.equal(canSelectUnlockMethod('biometric', { hasPin: true, biometricEnrolled: false }).allowed, false)
    assert.equal(canSelectUnlockMethod('pin', { hasPin: true, biometricEnrolled: true }).allowed, true)
    assert.equal(canSelectUnlockMethod('biometric', { hasPin: true, biometricEnrolled: true }).allowed, true)
    assert.equal(canSelectUnlockMethod('none', { hasPin: false, biometricEnrolled: false }).allowed, true)
  })
})
