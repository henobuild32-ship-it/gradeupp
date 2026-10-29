import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateTransferFee,
  calculatePercentageFee,
  convertCurrencyAmount,
  DEFAULT_USD_CDF_RATE,
  roundCurrencyAmount,
} from '../src/lib/currency.ts'

describe('Trait USD/CDF money arithmetic', () => {
  it('converts exactly in both directions at the configured default rate', () => {
    assert.equal(DEFAULT_USD_CDF_RATE, 2300)
    assert.equal(convertCurrencyAmount('10.00', 'USD', 'CDF'), 23000)
    assert.equal(convertCurrencyAmount('23000', 'CDF', 'USD'), 10)
  })

  it('keeps same-currency amounts unchanged at cent precision', () => {
    assert.equal(convertCurrencyAmount('123.45', 'USD', 'USD'), 123.45)
    assert.equal(convertCurrencyAmount('123.45', 'CDF', 'CDF'), 123.45)
  })

  it('rounds half-up and handles small and large supported amounts', () => {
    assert.equal(roundCurrencyAmount('0.005'), 0.01)
    assert.equal(roundCurrencyAmount('0.004'), 0)
    assert.equal(convertCurrencyAmount('0.01', 'USD', 'CDF'), 23)
    assert.equal(convertCurrencyAmount('23000000000', 'CDF', 'USD'), 10000000)
  })

  it('calculates the outgoing transfer fee at 1.5% without binary floating-point drift', () => {
    assert.equal(calculateTransferFee('100.00'), 1.5)
    assert.equal(calculateTransferFee('10.01'), 0.15)
    assert.equal(calculateTransferFee('0.01'), 0)
  })

  it('calculates a one-percent fee exactly', () => {
    assert.equal(calculatePercentageFee('100.00', 100), 1)
    assert.equal(calculatePercentageFee('0.50', 100), 0.01)
    assert.throws(() => calculatePercentageFee('1', 10001), /Pourcentage invalide/)
  })

  it('rejects invalid exchange rates', () => {
    assert.throws(() => convertCurrencyAmount('1', 'USD', 'CDF', 0), /Taux de change invalide/)
    assert.throws(() => convertCurrencyAmount('1', 'CDF', 'USD', Number.NaN), /Taux de change invalide/)
  })
})
