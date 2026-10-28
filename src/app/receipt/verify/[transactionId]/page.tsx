'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { BadgeCheck, ShieldCheck, XCircle } from 'lucide-react'
import { formatCurrencyAmount, formatExchangeRate, normalizeCurrency } from '@/lib/currency'

type Verification = {
  success: boolean
  message?: string
  brand?: string
  receiptNumber?: string
  status?: string
  type?: string
  amount?: number
  fee?: number
  currency?: string
  receivingCurrency?: string
  amountReceived?: number
  exchangeRate?: number | null
  createdAt?: string
}

export default function VerifyReceiptPage() {
  const params = useParams<{ transactionId: string }>()
  const [result, setResult] = useState<Verification | null>(null)

  useEffect(() => {
    const id = params.transactionId
    if (!id) return
    fetch(`/api/receipt/verify/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json()
        setResult(response.ok ? data : { success: false, message: data.message })
      })
      .catch(() => setResult({ success: false, message: 'Vérification indisponible. Réessayez plus tard.' }))
  }, [params.transactionId])

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-primary">Trait Fintech</p>
          {result === null ? (
            <p className="mt-8 text-sm text-muted-foreground">Vérification du reçu…</p>
          ) : result.success ? (
            <>
              <BadgeCheck className="mx-auto mt-5 size-12 text-emerald-600" />
              <h1 className="mt-3 text-xl font-bold">Reçu authentique</h1>
              <p className="mt-1 text-sm text-muted-foreground">Cette transaction est confirmée dans Trait Fintech.</p>
              <dl className="mt-6 space-y-3 border-t border-border pt-4 text-left text-sm">
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">N° du reçu</dt><dd className="break-all text-right font-medium">{result.receiptNumber}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Statut</dt><dd className="font-medium text-emerald-700">Réussi</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Montant envoyé</dt><dd className="text-right font-medium">{formatCurrencyAmount(result.amount || 0, normalizeCurrency(result.currency))}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Montant reçu</dt><dd className="text-right font-medium">{formatCurrencyAmount(result.amountReceived || 0, normalizeCurrency(result.receivingCurrency))}</dd></div>
                {result.exchangeRate && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Taux au moment du transfert</dt><dd className="text-right font-medium">1 USD = {formatExchangeRate(result.exchangeRate)} CDF</dd></div>}
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Date</dt><dd className="text-right font-medium">{result.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZoneName: 'short' }).format(new Date(result.createdAt)) : '—'}</dd></div>
              </dl>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mt-5 size-12 text-destructive" />
              <h1 className="mt-3 text-xl font-bold">Reçu non vérifié</h1>
              <p className="mt-2 text-sm text-muted-foreground">{result.message || 'Ce reçu ne correspond pas à une transaction confirmée.'}</p>
            </>
          )}
          <div className="mt-6 flex items-center justify-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <ShieldCheck className="size-4" />Vérification en lecture seule
          </div>
        </div>
      </section>
    </main>
  )
}
