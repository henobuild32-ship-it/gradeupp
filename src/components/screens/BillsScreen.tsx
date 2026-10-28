'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, AlertTriangle, History } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface BillHistory {
  id: string
  billerName: string
  amount: number
  currency: string
  reference: string
  status: string
  createdAt: string
}

const formatAmount = (amount: number, currency: string) => currency === 'FC' || currency === 'CDF'
  ? `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} CDF`
  : `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`

export default function BillsScreen() {
  const { user, navigateTo } = useAppStore()
  const [history, setHistory] = useState<BillHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetch('/api/bills/history', { credentials: 'include' })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data.success) setHistory(data.history ?? [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Factures et paiements</h1>
      </header>

      <div className="px-4 space-y-6">
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="flex items-start gap-3 p-4 text-amber-950 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm leading-relaxed">
              Aucun fournisseur de factures n’est raccordé. Les paiements externes sont désactivés et aucun montant ne peut être prélevé ici.
            </p>
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <History className="h-4 w-4 text-[#0D5C63]" /> Historique
          </h2>
          {loading ? (
            <div className="space-y-2">{[1, 2].map((index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div>
          ) : history.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">Aucun paiement de facture enregistré.</CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <Card key={item.id} className="border-border">
                  <CardContent className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.billerName}</p>
                      <p className="text-xs text-muted-foreground">Réf. {item.reference}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-foreground">{formatAmount(item.amount, item.currency)}</p>
                      <p className="text-xs text-muted-foreground">{item.status}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
