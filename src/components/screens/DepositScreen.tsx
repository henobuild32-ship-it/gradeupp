'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Phone, Building2, CreditCard, Users, Smartphone, Check, Copy, Banknote, Landmark, ChevronRight, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import { displayAgentCode, formatAgentCodeInput } from '@/lib/agent-format'

function fmtCur(amount: number, currency: string) {
  return currency === 'FC' ? `${amount.toLocaleString('fr-FR')} FC` : `$${amount.toFixed(2)}`
}

const mobileOperators = [
  { id: 'orange', name: 'Orange Money', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { id: 'vodacom', name: 'M-Pesa Vodacom', color: 'bg-green-50 text-green-600 border-green-200' },
  { id: 'airtel', name: 'Airtel Money', color: 'bg-red-50 text-red-600 border-red-200' },
  { id: 'africell', name: 'Africell Money', color: 'bg-blue-50 text-blue-600 border-blue-200' },
]

const depositMethods = [
  { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone, description: 'Orange Money, M-Pesa, Airtel, Africell' },
  { id: 'bank_transfer', label: 'Virement bancaire', icon: Landmark, description: 'Transfert direct' },
  { id: 'card', label: 'Carte Visa/Mastercard', icon: CreditCard, description: 'Paiement par carte' },
  { id: 'agent', label: 'Via Agent Trait', icon: Users, description: 'Dépôt chez un agent' },
]

export default function DepositScreen() {
  const { user, goBack, navigateTo, setUser, preferredCurrency, setPreferredCurrency } = useAppStore()
  const { t } = useTranslation()
  const [selectedMethod, setSelectedMethod] = useState('mobile_money')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(preferredCurrency || 'USD')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form')
  const [copied, setCopied] = useState(false)

  const [mobileOperator, setMobileOperator] = useState('')
  const [mobilePhone, setMobilePhone] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankHolder, setBankHolder] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [agentNumber, setAgentNumber] = useState('')
  const [pendingAgent, setPendingAgent] = useState(false)
  const [pendingAgentCode, setPendingAgentCode] = useState('')
  const [pendingMessage, setPendingMessage] = useState('')

  const numericAmount = parseFloat(amount) || 0
  const isFC = currency === 'FC'

  const getMethodFields = () => {
    switch (selectedMethod) {
      case 'mobile_money':
        return mobileOperator && mobilePhone.length >= 8 && numericAmount > 0
      case 'bank_transfer':
        return bankName && bankAccount && bankHolder && numericAmount > 0
      case 'card':
        return cardNumber.length >= 16 && cardExpiry.length >= 4 && cardCvv.length >= 3 && cardHolder && numericAmount > 0
      case 'agent':
        return displayAgentCode(agentNumber).startsWith('AGT-') && numericAmount > 0
      default:
        return false
    }
  }

  const handleSubmit = async () => {
    if (!getMethodFields()) return
    setLoading(true)
    try {
      const body: any = {
        amount: numericAmount,
        currency,
        method: selectedMethod,
      }

      if (selectedMethod === 'mobile_money') {
        body.mobileOperator = mobileOperator
        body.mobilePhone = mobilePhone
      } else if (selectedMethod === 'bank_transfer') {
        body.bankName = bankName
        body.bankAccount = bankAccount
        body.bankHolder = bankHolder
      } else if (selectedMethod === 'card') {
        body.cardNumber = cardNumber.replace(/\s/g, '')
        body.cardExpiry = cardExpiry
        body.cardCvv = cardCvv
        body.cardHolder = cardHolder
      } else if (selectedMethod === 'agent') {
        const code = displayAgentCode(agentNumber) || agentNumber.trim()
        body.agentNumber = code
        body.agentCode = code
      }

      const token = useAppStore.getState().token
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/transfer/deposit', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success) {
        if (data.pending) {
          setPendingAgent(true)
          setPendingAgentCode(data.deposit?.agentCode || displayAgentCode(agentNumber))
          setPendingMessage(data.message || 'Demande envoyée à l\'agent. En attente de validation.')
        }
        if (data.updatedBalances) {
          setUser({
            ...user!,
            realBalance: data.updatedBalances.realBalance ?? user!.realBalance,
            realBalanceFC: data.updatedBalances.realBalanceFC ?? user!.realBalanceFC,
            bonusBalance: data.updatedBalances.bonusBalance ?? user!.bonusBalance,
            bonusBalanceFC: data.updatedBalances.bonusBalanceFC ?? user!.bonusBalanceFC,
          })
        }
        setStep('success')
        if (!data.pending) toast.success(t('deposit.success'))
        else toast.info(data.message || 'Dépôt en attente de validation par l\'agent')
      } else {
        toast.error(data.message || t('deposit.error'))
      }
    } catch {
      toast.error(t('validation.connection_error'))
    }
    setLoading(false)
  }

  const resetForm = () => {
    setAmount('')
    setMobileOperator('')
    setMobilePhone('')
    setBankName('')
    setBankAccount('')
    setBankHolder('')
    setCardNumber('')
    setCardExpiry('')
    setCardCvv('')
    setCardHolder('')
    setAgentNumber('')
    setPendingAgent(false)
    setPendingAgentCode('')
    setPendingMessage('')
    setStep('form')
  }

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2)
    return digits
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 sticky top-0 z-10 bg-background/80 backdrop-blur-md">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => step === 'success' ? resetForm() : goBack()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">{t('action.deposit')}</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {t('deposit.balance')}: {fmtCur(isFC ? (user?.realBalanceFC || 0) : (user?.realBalance || 0), currency)}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'success' ? (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="px-4 py-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {pendingAgent ? 'Dépôt en attente' : t('deposit.success_title')}
            </h2>
            <p className="text-4xl font-bold text-[#0D5C63] mb-2">{fmtCur(numericAmount, currency)}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedMethod === 'mobile_money' ? `Via ${mobileOperator} (${mobilePhone})` :
               selectedMethod === 'bank_transfer' ? `Virement ${bankName}` :
               selectedMethod === 'card' ? 'Carte bancaire' : `Agent ${pendingAgentCode || displayAgentCode(agentNumber)}`}
            </p>
            {pendingAgent && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-left">
                <p className="text-sm font-semibold text-amber-800 mb-1">En attente de validation</p>
                <p className="text-xs text-amber-700">{pendingMessage}</p>
                <p className="text-xs text-amber-700 mt-2">
                  L&apos;agent doit valider dans « Valider opérations » pour créditer votre compte.
                </p>
              </div>
            )}
            <Button
              onClick={() => { resetForm(); navigateTo('home') }}
              className="h-12 px-8 bg-[#0D5C63] hover:bg-[#083A3E] text-white rounded-xl font-semibold"
            >
              {t('deposit.back_home')}
            </Button>
          </motion.div>
        ) : step === 'confirm' ? (
          <motion.div key="confirm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4 space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold text-lg">{t('deposit.confirm_title')}</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Montant</span>
                    <span className="font-semibold">{fmtCur(numericAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Devise</span>
                    <span className="font-semibold">{currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Méthode</span>
                    <span className="font-semibold">{depositMethods.find(m => m.id === selectedMethod)?.label}</span>
                  </div>

                  {selectedMethod === 'mobile_money' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Opérateur</span>
                        <span className="font-semibold">{mobileOperators.find(o => o.id === mobileOperator)?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Téléphone</span>
                        <span className="font-semibold">{mobilePhone}</span>
                      </div>
                    </>
                  )}

                  {selectedMethod === 'bank_transfer' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Banque</span>
                        <span className="font-semibold">{bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Titulaire</span>
                        <span className="font-semibold">{bankHolder}</span>
                      </div>
                    </>
                  )}

                  {selectedMethod === 'agent' && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Agent N°</span>
                      <span className="font-semibold font-mono">{displayAgentCode(agentNumber)}</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full h-13 bg-[#0D5C63] hover:bg-[#083A3E] text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 text-base"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Traitement...
                    </span>
                  ) : `Confirmer ${fmtCur(numericAmount, currency)}`}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setStep('form')}
                  className="w-full h-12 rounded-xl text-muted-foreground"
                >
                  Modifier
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 space-y-4 pb-8">
            <div className="grid grid-cols-2 gap-3">
              {depositMethods.map((method) => {
                const Icon = method.icon
                const isActive = selectedMethod === method.id
                return (
                  <button
                    key={method.id}
                    onClick={() => { setSelectedMethod(method.id); setStep('form') }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      isActive ? 'border-[#0D5C63] bg-[#0D5C63]/5' : 'border-gray-100 bg-card hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                      isActive ? 'bg-[#0D5C63] text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold">{method.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{method.description}</p>
                  </button>
                )
              })}
            </div>

            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-foreground block mb-1.5">Montant</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                        {currency === 'FC' ? 'FC' : '$'}
                      </span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        className="w-full h-12 pl-10 pr-4 text-lg font-semibold bg-muted/30 border-2 border-gray-200 rounded-xl focus:border-[#0D5C63] outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Devise</label>
                    <select
                      value={currency}
                      onChange={(e) => { setCurrency(e.target.value); setPreferredCurrency(e.target.value as 'USD' | 'FC'); }}
                      className="h-12 px-3 bg-muted/30 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:border-[#0D5C63] outline-none"
                    >
                      <option value="USD">USD $</option>
                      <option value="FC">FC</option>
                    </select>
                  </div>
                </div>

                {selectedMethod === 'mobile_money' && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <label className="text-sm font-medium text-foreground block">Opérateur Mobile Money</label>
                    <div className="grid grid-cols-2 gap-2">
                      {mobileOperators.map((op) => (
                        <button
                          key={op.id}
                          onClick={() => setMobileOperator(op.id)}
                          className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                            mobileOperator === op.id
                              ? 'border-[#0D5C63] bg-[#0D5C63]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {op.name}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Numéro de téléphone</label>
                      <input
                        type="tel"
                        placeholder="+243 XXX XXX XXX"
                        value={mobilePhone}
                        onChange={(e) => setMobilePhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                        className="w-full h-12 px-4 bg-muted/30 border-2 border-gray-200 rounded-xl focus:border-[#0D5C63] outline-none text-base"
                      />
                    </div>
                  </div>
                )}

                {selectedMethod === 'bank_transfer' && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Nom de la banque</label>
                      <input
                        type="text"
                        placeholder="Ex: EquityBCDC, Rawbank..."
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full h-12 px-4 bg-muted/30 border-2 border-gray-200 rounded-xl focus:border-[#0D5C63] outline-none text-base"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Titulaire du compte</label>
                      <input
                        type="text"
                        placeholder="Nom complet du titulaire"
                        value={bankHolder}
                        onChange={(e) => setBankHolder(e.target.value)}
                        className="w-full h-12 px-4 bg-muted/30 border-2 border-gray-200 rounded-xl focus:border-[#0D5C63] outline-none text-base"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Numéro de compte</label>
                      <input
                        type="text"
                        placeholder="Numéro de compte bancaire"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full h-12 px-4 bg-muted/30 border-2 border-gray-200 rounded-xl focus:border-[#0D5C63] outline-none text-base"
                      />
                    </div>
                  </div>
                )}

                {selectedMethod === 'card' && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Titulaire de la carte</label>
                      <input
                        type="text"
                        placeholder="Nom sur la carte"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        className="w-full h-12 px-4 bg-muted/30 border-2 border-gray-200 rounded-xl focus:border-[#0D5C63] outline-none text-base"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Numéro de carte</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        className="w-full h-12 px-4 bg-muted/30 border-2 border-gray-200 rounded-xl focus:border-[#0D5C63] outline-none text-base tracking-wider font-mono"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-foreground block mb-1.5">Expiration</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="MM/AA"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                          className="w-full h-12 px-4 bg-muted/30 border-2 border-gray-200 rounded-xl focus:border-[#0D5C63] outline-none text-base font-mono"
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-sm font-medium text-foreground block mb-1.5">CVV</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          className="w-full h-12 px-4 bg-muted/30 border-2 border-gray-200 rounded-xl focus:border-[#0D5C63] outline-none text-base font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedMethod === 'agent' && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Code agent Trait</label>
                      <input
                        type="text"
                        placeholder="AGT-123456"
                        value={agentNumber}
                        onChange={(e) => setAgentNumber(formatAgentCodeInput(e.target.value, false).slice(0, 10))}
                        className="w-full h-12 px-4 bg-muted/30 border-2 border-gray-200 rounded-xl focus:border-[#0D5C63] outline-none text-base font-mono uppercase"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Le dépôt sera en attente tant que l&apos;agent n&apos;a pas validé la réception des fonds.
                      </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-xs text-amber-800">
                        Rendez-vous chez l&apos;agent Trait, donnez l&apos;argent liquide, puis entrez son code. L&apos;agent validera le crédit sur votre compte TRAIT.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={() => setStep('confirm')}
              disabled={!getMethodFields()}
              className="w-full h-13 bg-[#0D5C63] hover:bg-[#083A3E] text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 text-base"
            >
              <Banknote className="w-5 h-5 mr-2" />
              Déposer {fmtCur(numericAmount, currency)}
            </Button>

            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full">
                <Shield className="w-3 h-3 text-green-600" />
                <span className="text-[10px] text-muted-foreground">Transaction sécurisée</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
