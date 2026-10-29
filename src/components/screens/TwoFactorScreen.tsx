'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Shield, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useAppStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'

export default function TwoFactorScreen() {
  const { user, goBackTo, setUser } = useAppStore()
  const { t } = useTranslation()
  const [step, setStep] = useState<'loading' | 'setup' | 'verify' | 'enabled' | 'disable' | 'recovery-verify' | 'recovery'>('loading')
  const [secret, setSecret] = useState('')
  const [uri, setUri] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const setupStarted = useRef(false)

  const returnToSettings = () => goBackTo('settings')

  useEffect(() => {
    if (user?.twoFactorEnabled) {
      setStep((current) => current === 'recovery' ? current : 'enabled')
    } else if (!setupStarted.current) {
      setupStarted.current = true
      setup2FA()
    }
  }, [user?.twoFactorEnabled])

  const setup2FA = async () => {
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await res.json()
      if (data.secret) {
        setSecret(data.secret)
        setUri(data.uri)
        setStep('setup')
      }
    } catch {
      setError('Erreur lors de la configuration 2FA')
    }
  }

  const handleVerify = async (action: 'enable' | 'disable') => {
    if (code.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, action }),
      })
      const data = await res.json()
      if (data.success) {
        if (action === 'enable') {
          setUser({ ...user!, twoFactorEnabled: true })
          const codes = Array.isArray(data.recoveryCodes) ? data.recoveryCodes : []
          setRecoveryCodes(codes)
          setStep(codes.length ? 'recovery' : 'enabled')
        } else {
          setUser({ ...user!, twoFactorEnabled: false })
          returnToSettings()
        }
      } else {
        setError(data.message || 'Code invalide')
      }
    } catch {
      setError('Erreur de vérification')
    }
    setLoading(false)
  }

  const handleRegenerateRecoveryCodes = async () => {
    if (!/^\d{6}$/.test(code)) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok || !data.success || !Array.isArray(data.recoveryCodes)) {
        setError(data.message || 'Impossible de renouveler les codes.')
      } else {
        setRecoveryCodes(data.recoveryCodes)
        setCode('')
        setStep('recovery')
      }
    } catch {
      setError('Erreur de connexion. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0D5C63] to-[#083A3E] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D5C63] to-[#083A3E]">
      <div className="flex items-center gap-3 p-4 pb-2">
        <button onClick={() => step === 'recovery' ? (setRecoveryCodes([]), setStep('enabled')) : returnToSettings()} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white text-lg font-bold">{t('settings.enable_2fa')}</h1>
      </div>

      <div className="bg-white rounded-t-3xl mt-2 p-6 min-h-[calc(100vh-80px)]">
        {step === 'setup' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#0D5C63]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-[#0D5C63]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Configurer l&apos;authentification 2FA</h2>
              <p className="text-sm text-gray-500 mt-2">
                Scannez le QR code avec Google Authenticator ou entrez la clé manuellement
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="bg-white rounded-xl p-4 text-center">
                <div className="w-48 h-48 mx-auto flex items-center justify-center">
                  <QRCodeSVG value={uri} size={192} level="M" fgColor="#0D5C63" />
                </div>
                <p className="text-xs text-gray-400 mt-2">Scannez avec Google Authenticator</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Clé secrète (copiez-la manuellement) :</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-white px-3 py-2 rounded-lg border text-gray-800 break-all">
                  {secret}
                </code>
                <button onClick={copySecret} className="p-2 rounded-lg bg-[#0D5C63] text-white shrink-0">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Entrez le code de Google Authenticator :</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
                placeholder="000000"
                className="w-full h-14 text-center text-2xl font-mono tracking-[0.5em] border-2 border-gray-200 rounded-xl focus:border-[#0D5C63] outline-none"
              />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>

            <button
              onClick={() => handleVerify('enable')}
              disabled={code.length !== 6 || loading}
              className="w-full h-13 bg-[#0D5C63] hover:bg-[#083A3E] text-white font-semibold rounded-xl shadow-lg disabled:opacity-50"
            >
              {loading ? 'Vérification...' : 'Activer 2FA'}
            </button>
          </div>
        )}

        {step === 'enabled' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">2FA activée</h2>
              <p className="text-sm text-gray-500 mt-2">
                Votre compte est protégé par l&apos;authentification à deux facteurs
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Codes de secours</p>
              <p className="text-xs text-gray-600">Ils permettent de vous connecter si vous perdez l’accès à votre application d’authentification. Chaque code ne sert qu’une fois.</p>
              <button
                type="button"
                onClick={() => { setCode(''); setError(''); setStep('recovery-verify') }}
                className="w-full h-11 rounded-xl border border-[#0D5C63]/30 bg-white text-sm font-semibold text-[#0D5C63]"
              >
                Régénérer les codes de secours
              </button>
            </div>

            <button
              onClick={() => setStep('disable')}
              className="w-full h-13 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl border border-red-200"
            >
              <ShieldOff className="w-5 h-5 inline mr-2" />
              Désactiver 2FA
            </button>
          </div>
        )}

        {step === 'disable' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldOff className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Désactiver 2FA</h2>
              <p className="text-sm text-gray-500 mt-2">
                Entrez un code de votre Google Authenticateur pour confirmer
              </p>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
              placeholder="000000"
              className="w-full h-14 text-center text-2xl font-mono tracking-[0.5em] border-2 border-gray-200 rounded-xl focus:border-red-500 outline-none"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('enabled'); setCode(''); setError('') }}
                className="flex-1 h-13 bg-gray-100 text-gray-700 font-semibold rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={() => handleVerify('disable')}
                disabled={code.length !== 6 || loading}
                className="flex-1 h-13 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {loading ? '...' : 'Désactiver'}
              </button>
            </div>
          </div>
        )}

        {step === 'recovery-verify' && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-900">Confirmer la régénération</h2>
            <p className="text-sm text-gray-600">Saisissez un code actuel de votre application. Les anciens codes de secours seront invalidés.</p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
              placeholder="000000"
              className="w-full h-14 text-center text-2xl font-mono tracking-[0.5em] border-2 border-gray-200 rounded-xl focus:border-[#0D5C63] outline-none"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setStep('enabled'); setCode('') }} className="flex-1 h-12 rounded-xl bg-gray-100 font-semibold text-gray-700">Annuler</button>
              <button onClick={handleRegenerateRecoveryCodes} disabled={code.length !== 6 || loading} className="flex-1 h-12 rounded-xl bg-[#0D5C63] font-semibold text-white disabled:opacity-50">{loading ? 'Vérification…' : 'Continuer'}</button>
            </div>
          </div>
        )}

        {step === 'recovery' && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-amber-700" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Enregistrez vos codes de secours</h2>
              <p className="text-sm text-gray-600 mt-2">Ils ne seront plus affichés après avoir quitté cet écran. Les anciens codes ont été invalidés.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              {recoveryCodes.map((recoveryCode) => (
                <code key={recoveryCode} className="rounded-lg bg-white p-2 text-center font-mono text-sm tracking-wider text-gray-900">{recoveryCode}</code>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(recoveryCodes.join('\n'))
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="w-full h-12 rounded-xl border border-[#0D5C63]/30 bg-white font-semibold text-[#0D5C63]"
            >
              {copied ? 'Codes copiés' : 'Copier les codes'}
            </button>
            <button
              type="button"
              onClick={() => { setRecoveryCodes([]); setStep('enabled') }}
              className="w-full h-12 rounded-xl bg-[#0D5C63] font-semibold text-white"
            >
              J’ai enregistré mes codes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
