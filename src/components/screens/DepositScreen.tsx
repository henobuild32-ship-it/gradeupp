'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Users, Wallet, Clock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import { displayAgentCode, formatAgentCodeInput } from '@/lib/agent-format'

type Currency = 'USD' | 'CDF'

function formatAmount(amount: number, currency: Currency) {
  return currency === 'CDF'
    ? `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} CDF`
    : `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
}

export default function DepositScreen() {
  const { user, goBack, navigateTo, preferredCurrency, setPreferredCurrency } = useAppStore()
  const { t } = useTranslation()
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>(preferredCurrency === 'FC' ? 'CDF' : preferredCurrency ?? 'USD')
  const [agentCode, setAgentCode] = useState('')
  const [step, setStep] = useState<'form' | 'confirm' | 'pending'>('form')
  const [loading, setLoading] = useState(false)
  const [pendingMessage, setPendingMessage] = useState('')

  const numericAmount = Number(amount)
  const code = displayAgentCode(agentCode)
  const validAgentCode = /^AGT-\d{6}$/.test(code)

  const submitDeposit = async () => {
    if (!user || !validAgentCode || !Number.isFinite(numericAmount) || numericAmount <= 0) return
    setLoading(true)
    try {
      const response = await fetch('/api/transfer/deposit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numericAmount, currency, method: 'agent', agentCode: code }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        toast.error(data.message || t('deposit.error'))
        return
      }
      setPendingMessage(data.message || 'Votre demande attend la validation de l’agent Trait.')
      setStep('pending')
      toast.info('Demande envoyée à l’agent Trait.')
    } catch {
      toast.error(t('validation.connection_error'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setAmount('')
    setAgentCode('')
    setPendingMessage('')
    setStep('form')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/90 px-4 py-4 backdrop-blur">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={goBack} aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Dépôt via agent Trait</h1>
          <p className="text-xs text-muted-foreground">Demande en espèces, dans votre compte Trait</p>
        </div>
      </header>

      {step === 'pending' ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 px-4 py-8">
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <Clock className="h-7 w-7 text-amber-700 dark:text-amber-300" />
                <h2 className="text-lg font-bold text-foreground">En attente de validation</h2>
              </div>
              <p className="text-sm text-muted-foreground">{pendingMessage}</p>
              <p className="text-sm font-medium text-foreground">Le montant ne sera crédité qu’après confirmation par l’agent. Aucun reçu de paiement n’est émis avant cette confirmation.</p>
            </CardContent>
          </Card>
          <Button onClick={() => { resetForm(); navigateTo('home') }} className="h-12 w-full rounded-xl bg-[#0D5C63] text-white hover:bg-[#083A3E]">
            {t('deposit.back_home')}
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-4 px-4 py-5">
          <Card className="border-border">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0D5C63]/10 text-[#0D5C63]"><Wallet className="h-5 w-5" /></span>
                <div>
                  <p className="text-xs text-muted-foreground">Solde USD</p>
                  <p className="text-sm font-bold">{formatAmount(user?.realBalance ?? 0, 'USD')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Solde CDF</p>
                <p className="text-sm font-bold">{formatAmount(user?.realBalanceFC ?? 0, 'CDF')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="space-y-5 p-5">
              <div>
                <label htmlFor="deposit-amount" className="mb-2 block text-sm font-semibold">Montant</label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    id="deposit-amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step={currency === 'CDF' ? '1' : '0.01'}
                    placeholder="0"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="h-12 min-w-0 rounded-xl border border-input bg-background px-3 text-lg font-semibold outline-none focus:ring-2 focus:ring-[#0D5C63]"
                  />
                  <select
                    value={currency}
                    onChange={(event) => {
                      const next = event.target.value as Currency
                      setCurrency(next)
                      setPreferredCurrency(next === 'CDF' ? 'FC' : 'USD')
                    }}
                    className="h-12 rounded-xl border border-input bg-background px-3 font-semibold"
                    aria-label="Devise du dépôt"
                  >
                    <option value="USD">USD</option>
                    <option value="CDF">CDF</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="deposit-agent" className="mb-2 block text-sm font-semibold">Code de l’agent Trait</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="deposit-agent"
                    type="text"
                    autoComplete="off"
                    placeholder="AGT-123456"
                    value={agentCode}
                    onChange={(event) => setAgentCode(formatAgentCodeInput(event.target.value))}
                    className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-3 font-mono outline-none focus:ring-2 focus:ring-[#0D5C63]"
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">L’agent doit être validé et actif. Vérifiez son identifiant avant de continuer.</p>
              </div>

              <div className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
                Seul un dépôt confirmé par un agent Trait crédite votre portefeuille. Il n’y a pas de paiement par carte, banque ou opérateur externe.
              </div>

              {step === 'form' ? (
                <Button
                  onClick={() => setStep('confirm')}
                  disabled={!validAgentCode || !Number.isFinite(numericAmount) || numericAmount <= 0}
                  className="h-12 w-full rounded-xl bg-[#0D5C63] font-semibold text-white hover:bg-[#083A3E] disabled:opacity-50"
                >
                  Vérifier la demande
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border p-4 text-sm">
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Montant demandé</span><strong>{formatAmount(numericAmount, currency)}</strong></div>
                    <div className="mt-2 flex justify-between gap-3"><span className="text-muted-foreground">Agent</span><strong className="font-mono">{code}</strong></div>
                  </div>
                  <Button onClick={submitDeposit} disabled={loading} className="h-12 w-full rounded-xl bg-[#0D5C63] font-semibold text-white hover:bg-[#083A3E] disabled:opacity-50">
                    {loading ? 'Envoi…' : 'Envoyer la demande'}
                  </Button>
                  <Button variant="outline" onClick={() => setStep('form')} className="h-11 w-full rounded-xl">Modifier</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 rounded-xl border border-border p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0D5C63]" />
            <p>Vérifiez le montant avec l’agent. L’historique indiquera le reçu après validation définitive.</p>
          </div>
        </div>
      )}
    </div>
  )
}
