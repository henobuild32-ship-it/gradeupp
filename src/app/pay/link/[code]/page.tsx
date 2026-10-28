'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ShieldCheck, AlertCircle, Loader2, ArrowRight,
  Wallet, CheckCircle2, Lock, Zap, Copy, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface PaymentLinkDetails {
  amount: number
  currency: string
  description: string | null
  status: string
  allowedMethods: string
  owner: { id: string; name: string; pseudo: string }
}

export default function PayLinkPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [link, setLink] = useState<PaymentLinkDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loggedUser, setLoggedUser] = useState<any>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const selectedMethod = 'wallet'
  const [paying, setPaying] = useState(false)
  const [success, setSuccess] = useState(false)
  const [receiptTransactionId, setReceiptTransactionId] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return
    fetch(`/api/payments/links/${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.link) setLink(data.link)
        else setError(data.message || 'Lien introuvable ou expiré')
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))

    fetch('/api/auth/profile', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.user) { setIsLoggedIn(true); setLoggedUser(data.user) }
      })
      .catch(() => {})
  }, [code])

  const fmt = (amount: number, currency: string) =>
    currency === 'FC' || currency === 'CDF'
      ? `${amount.toLocaleString('fr-FR')} CDF`
      : `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`

  const handlePay = async () => {
    if (selectedMethod === 'wallet' && !isLoggedIn) {
      toast.info('Connectez-vous pour payer via Wallet TRAIT')
      router.push(`/?pay_link=${code}`)
      return
    }

    setPaying(true)
    try {
      const res = await fetch(`/api/payments/links/${code}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'wallet' }),
      })
      const data = await res.json()
      if (data.success) {
        if (typeof data.transaction?.id === 'string') setReceiptTransactionId(data.transaction.id)
        setSuccess(true)
        toast.success('Paiement traité avec succès !')
      } else {
        toast.error(data.message || 'Paiement échoué')
      }
    } catch {
      toast.error('Erreur réseau. Réessayez.')
    } finally {
      setPaying(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
    toast.success('Lien copié !')
  }

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-[#0D5C63]/10 flex items-center justify-center mx-auto animate-pulse">
          <Wallet className="h-8 w-8 text-[#0D5C63]" />
        </div>
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>
  )

  // ── Error ──
  if (error || !link) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-sm w-full">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold">Lien invalide ou expiré</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/')} variant="outline" className="w-full rounded-xl">
            Retour à l'accueil
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  // ── Success ──
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-background dark:from-emerald-950/20 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm">
          <Card className="border-emerald-200 dark:border-emerald-800/40 shadow-xl shadow-emerald-500/10">
            <CardContent className="p-8 text-center space-y-5">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Paiement réussi !</h1>
                <p className="text-sm text-muted-foreground mt-1">Fonds transférés instantanément entre comptes Trait</p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-4 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Destinataire</span>
                  <span className="font-bold">{link.owner.name}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground">Montant</span>
                  <span className="font-bold text-emerald-600 text-lg">{fmt(link.amount, link.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Via</span>
                  <Badge className="border border-[#0D5C63]/30 bg-[#0D5C63]/10 text-[#0D5C63]">💳 Wallet Trait</Badge>
                </div>
              </div>
              {receiptTransactionId ? (
                <Button onClick={() => router.push(`/?receipt=${encodeURIComponent(receiptTransactionId)}`)} className="w-full rounded-xl bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white">
                  Voir et télécharger le reçu
                </Button>
              ) : (
                <Button onClick={() => router.push('/')} className="w-full rounded-xl bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white">
                  Retour à Trait Fintech
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ── Main checkout page ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D5C63]/8 via-background to-background dark:from-[#0D5C63]/12">
      {/* Top nav */}
      <div className="bg-[#0D5C63] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <Zap className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm">TRAIT Pay</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleCopyLink} className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition-colors">
            {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedLink ? 'Copié' : 'Copier'}
          </button>
          <div className="flex items-center gap-1 text-xs text-white/80">
            <Lock className="h-3 w-3" />
            <span>Sécurisé</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-5 pb-12">

        {/* Recipient & amount card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Card className="border-border shadow-lg shadow-[#0D5C63]/5 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0D5C63] to-[#14888F] p-6 text-white text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 ring-4 ring-white/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold">{(link.owner.name || '?')[0].toUpperCase()}</span>
              </div>
              <h2 className="text-xl font-bold">{link.owner.name}</h2>
              <p className="text-white/70 text-sm">@{link.owner.pseudo}</p>
            </div>
            <CardContent className="p-5 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Montant demandé</p>
              <p className="text-4xl font-extrabold text-foreground">{fmt(link.amount, link.currency)}</p>
              {link.description && (
                <p className="text-sm text-muted-foreground mt-3 italic border-t pt-3">&ldquo;{link.description}&rdquo;</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Trait wallet only */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 }}>
          <p className="text-sm font-bold text-foreground mb-3">Mode de paiement</p>
          <div className="rounded-2xl border-2 border-[#0D5C63]/30 bg-[#0D5C63]/5 p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">💳</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#0D5C63]">Wallet Trait</p>
                <p className="text-xs text-muted-foreground">Le payeur et le destinataire doivent posséder un compte Trait.</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-[#0D5C63]" />
            </div>
            {isLoggedIn && loggedUser && (
              <p className="text-xs font-semibold text-[#0D5C63] mt-3">
                Solde disponible : {link.currency === 'FC'
                  ? `${(loggedUser.realBalanceFC || 0).toLocaleString('fr-FR')} CDF`
                  : `${(loggedUser.realBalance || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
              </p>
            )}
          </div>
        </motion.div>

        {/* Wallet not logged in */}
        <AnimatePresence>
          {selectedMethod === 'wallet' && !isLoggedIn && (
            <motion.div
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
              className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3.5 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2.5"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Connectez-vous à TRAIT pour utiliser votre Wallet. Vous serez redirigé vers la connexion.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pay button */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <Button
            onClick={handlePay}
            disabled={paying}
            className="w-full h-14 bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-2xl font-bold text-base shadow-xl shadow-[#0D5C63]/20 transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {paying
              ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Traitement...</>
              : <><span>Payer {fmt(link.amount, link.currency)}</span><ArrowRight className="h-5 w-5 ml-2" /></>
            }
          </Button>
        </motion.div>

        {/* Security footer */}
        <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /><span>Paiement chiffré</span></div>
          <div className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-emerald-500" /><span>100% sécurisé</span></div>
          <div className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-emerald-500" /><span>Instantané</span></div>
        </div>
      </div>
    </div>
  )
}
