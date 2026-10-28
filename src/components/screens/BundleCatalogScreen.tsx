'use client'

import { ArrowLeft, AlertTriangle, Smartphone } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const money = (amount: number, currency: 'USD' | 'CDF') => currency === 'CDF'
  ? `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} CDF`
  : `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`

export default function BundleCatalogScreen() {
  const { user, navigateTo } = useAppStore()
  const usdBalance = (user?.realBalance ?? 0) + (user?.bonusBalance ?? 0)
  const cdfBalance = (user?.realBalanceFC ?? 0) + (user?.bonusBalanceFC ?? 0)

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Recharges et abonnements</h1>
      </header>

      <div className="space-y-4 px-4">
        <Card className="border-0 bg-gradient-to-br from-[#0D5C63] to-[#14888F] text-white">
          <CardContent className="grid grid-cols-2 gap-4 p-4">
            <div>
              <p className="text-xs text-white/75">Solde USD</p>
              <p className="mt-1 text-lg font-bold">{money(usdBalance, 'USD')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/75">Solde CDF</p>
              <p className="mt-1 text-lg font-bold">{money(cdfBalance, 'CDF')}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3 text-amber-950 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h2 className="text-sm font-semibold">Service non disponible</h2>
                <p className="mt-1 text-sm leading-relaxed">
                  Aucun opérateur externe de recharge ou d’abonnement n’est raccordé. Ce catalogue n’affiche pas de faux produits et aucun paiement ne peut être prélevé.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => navigateTo('deposit')} className="h-11 rounded-xl bg-[#0D5C63] text-white hover:bg-[#083A3E]">
                Déposer via un agent Trait
              </Button>
              <Button variant="outline" onClick={() => navigateTo('send')} className="h-11 rounded-xl">
                Envoyer à un compte Trait
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Smartphone className="h-5 w-5 shrink-0 text-[#0D5C63]" />
          <p>Les transferts Wallet Trait sont disponibles entre utilisateurs inscrits, dans tous les pays pris en charge et en USD ou CDF.</p>
        </div>
      </div>
    </div>
  )
}
