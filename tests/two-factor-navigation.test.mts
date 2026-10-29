import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { useAppStore } from '../src/lib/store.ts'

describe('2FA settings navigation', () => {
  it('returns to settings when a restored screen only has the welcome page in its back stack', () => {
    useAppStore.setState({
      user: {
        id: 'test-user-2fa',
        phone: '+33123456789',
        name: 'Test User',
        pseudo: 'test-user',
        email: null,
        gender: null,
        city: null,
        country: 'FR',
        role: 'client',
        agentCode: null,
        agentNumber: null,
        validationStatus: 'validated',
        validationRejectReason: null,
        realBalance: 0,
        realBalanceFC: 0,
        bonusBalance: 0,
        bonusBalanceFC: 0,
        isVerified: true,
        suspended: false,
        hasCompletedOnboarding: true,
      },
      admin: null,
      currentPage: 'two-factor-setup',
      navigationStack: [{ page: 'welcome', params: {} }],
      lastAuthenticatedPage: 'two-factor-setup',
      lastAuthenticatedPageParams: {},
      lastAuthenticatedAccountId: 'test-user-2fa',
    })

    useAppStore.getState().goBackTo('settings')

    const state = useAppStore.getState()
    assert.equal(state.currentPage, 'settings')
    assert.equal(state.lastAuthenticatedPage, 'settings')
    assert.equal(state.navigationStack.length, 0)
  })

  it('keeps the real previous settings page when it is present', () => {
    useAppStore.setState({
      currentPage: 'two-factor-setup',
      navigationStack: [{ page: 'home', params: {} }, { page: 'settings', params: {} }],
    })

    useAppStore.getState().goBackTo('settings')

    const state = useAppStore.getState()
    assert.equal(state.currentPage, 'settings')
    assert.equal(state.navigationStack.length, 1)
  })
})

describe('public authentication entry navigation', () => {
  it('opens the registration and login modes selected by the welcome buttons', () => {
    useAppStore.setState({ currentPage: 'welcome', pageParams: {}, navigationStack: [], user: null, admin: null })

    useAppStore.getState().navigateTo('auth', { mode: 'register' })
    assert.equal(useAppStore.getState().currentPage, 'auth')
    assert.equal(useAppStore.getState().pageParams.mode, 'register')

    useAppStore.getState().navigateTo('auth', { mode: 'login' })
    assert.equal(useAppStore.getState().currentPage, 'auth')
    assert.equal(useAppStore.getState().pageParams.mode, 'login')
  })
})
