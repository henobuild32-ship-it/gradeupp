'use client'

import { useState } from 'react'
import { ArrowLeft, Lock, KeyRound, Eye, EyeOff } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

export default function ChangePinScreen() {
  const { user, goBack } = useAppStore()
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPins, setShowPins] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')

    if (!currentPin || !newPin || !confirmPin) {
      setError('Tous les champs sont requis')
      return
    }

    if (newPin.length < 4 || newPin.length > 8) {
      setError('Le nouveau code PIN doit contenir 4 à 8 chiffres')
      return
    }

    if (!/^\d+$/.test(newPin)) {
      setError('Le code PIN ne doit contenir que des chiffres')
      return
    }

    if (newPin !== confirmPin) {
      setError('Les codes PIN ne correspondent pas')
      return
    }

    setLoading(true)
    try {
      const verifyRes = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, pin: currentPin }),
      })
      const verifyData = await verifyRes.json()

      if (!verifyData.success) {
        const vMsg = verifyData.message || 'Code PIN actuel incorrect'
        if (vMsg.includes('Session expirée') || vMsg === 'Session invalide' || vMsg === 'Non authentifié') {
          toast.error('Session expirée. Veuillez vous reconnecter.')
          goBack()
          return
        }
        setError(vMsg)
        setLoading(false)
        return
      }

      const res = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, pin: newPin }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Code PIN modifié avec succès')
        goBack()
      } else {
        const sMsg = data.message || 'Erreur lors du changement de code PIN'
        if (sMsg.includes('Session expirée') || sMsg === 'Session invalide' || sMsg === 'Non authentifié') {
          toast.error('Session expirée. Veuillez vous reconnecter.')
          goBack()
          return
        }
        setError(sMsg)
      }
    } catch {
      setError('Erreur de connexion')
    }
    setLoading(false)
  }

  const PinInput = ({ value, onChange, placeholder, label }: {
    value: string; onChange: (v: string) => void; placeholder: string; label: string
  }) => (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          type={showPins ? 'text' : 'password'}
          inputMode="numeric"
          maxLength={8}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder={placeholder}
          className="w-full h-12 text-lg tracking-[0.3em] text-center font-mono bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-[#0D5C63] outline-none transition-colors"
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D5C63] to-[#083A3E]">
      <div className="flex items-center gap-3 p-4 pb-2">
        <button onClick={goBack} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white text-lg font-bold">Changer le code PIN</h1>
      </div>

      <div className="bg-white rounded-t-3xl mt-2 p-6 min-h-[calc(100vh-80px)]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#0D5C63]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#0D5C63]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Modifier votre code PIN</h2>
          <p className="text-sm text-gray-500 mt-1">Le code PIN vous permet de sécuriser vos transactions</p>
        </div>

        <div className="space-y-4 mb-6">
          <PinInput
            label="Code PIN actuel"
            placeholder="Code actuel"
            value={currentPin}
            onChange={setCurrentPin}
          />
          <PinInput
            label="Nouveau code PIN"
            placeholder="Nouveau code (4-8 chiffres)"
            value={newPin}
            onChange={setNewPin}
          />
          <PinInput
            label="Confirmer le nouveau code PIN"
            placeholder="Confirmer le code"
            value={confirmPin}
            onChange={setConfirmPin}
          />

          <button
            onClick={() => setShowPins(!showPins)}
            className="flex items-center gap-2 text-sm text-gray-500 mx-auto"
          >
            {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPins ? 'Masquer' : 'Afficher'} les codes PIN
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !currentPin || !newPin || !confirmPin}
          className="w-full h-13 bg-[#0D5C63] hover:bg-[#083A3E] text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Modification...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <KeyRound className="w-5 h-5" />
              Modifier le code PIN
            </span>
          )}
        </button>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800 font-medium mb-1">Conseils de sécurité</p>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• Ne partagez jamais votre code PIN avec personne</li>
            <li>• Utilisez un code difficile à deviner</li>
            <li>• Évitez les séquences comme 1234 ou 0000</li>
            <li>• Changez régulièrement votre code PIN</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
