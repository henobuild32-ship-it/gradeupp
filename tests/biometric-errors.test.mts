import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { BiometricAuthError } from '@capgo/capacitor-native-biometric'
import { describeBiometricError } from '../src/lib/biometric.ts'

describe('Trait native biometric fallback messages', () => {
  it('explains locked biometrics and canceled prompts', () => {
    assert.match(describeBiometricError({ errorCode: BiometricAuthError.USER_LOCKOUT }), /Trop de tentatives/)
    assert.equal(describeBiometricError({ errorCode: BiometricAuthError.USER_CANCEL }), 'Annulé')
  })

  it('directs legacy or missing secure credentials to the account fallback', () => {
    assert.match(
      describeBiometricError({ errorCode: BiometricAuthError.NO_PROTECTED_CREDENTIALS_FOUND }),
      /PIN TRAIT ou votre mot de passe/,
    )
  })
})
