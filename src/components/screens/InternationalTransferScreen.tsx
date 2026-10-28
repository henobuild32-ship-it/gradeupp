'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, CreditCard, Globe2, Landmark, Loader2, ShieldCheck, Smartphone, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CountrySelect } from '@/components/shared/CountrySelect'
import { getCountry, normalizeInternationalPhone } from '@/lib/countries'
import { calculateTransferFee, convertCurrencyAmount, DEFAULT_USD_CDF_RATE, formatCurrencyAmount, formatExchangeRate, normalizeCurrency, type Currency } from '@/lib/currency'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

type Recipient = { id: string; name: string; phone: string }
type TransferMethod = 'wallet' | 'trait-card'

export default function InternationalTransferScreen() {
  const { user, navigateTo, setUser, setPendingPinAction } = useAppStore()
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')
  const [recipient, setRecipient] = useState<Recipient | null>(null)
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'missing' | 'suspended' | 'unavailable' | 'invalid'>('idle')
  const [amount, setAmount] = useState('')
  const [sendingCurrency, setSendingCurrency] = useState<Currency>('USD')
  const [receivingCurrency, setReceivingCurrency] = useState<Currency>('USD')
  const [method, setMethod] = useState<TransferMethod>('wallet')
  const [note, setNote] = useState('')
  const [rate, setRate] = useState(DEFAULT_USD_CDF_RATE)
  const [rateReady, setRateReady] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const normalizedPhone = useMemo(() => normalizeInternationalPhone(phone, country), [phone, country])
  const numericAmount = useMemo(() => Number(amount) || 0, [amount])
  const fee = useMemo(() => calculateTransferFee(numericAmount), [numericAmount])
  const receivedAmount = useMemo(
    () => convertCurrencyAmount(numericAmount, sendingCurrency, receivingCurrency, rate),
    [numericAmount, sendingCurrency, receivingCurrency, rate],
  )
  const totalDebit = numericAmount + fee
  const selectedCountry = getCountry(country)

  useEffect(() => {
    let mounted = true
    fetch('/api/config/exchange-rate')
      .then((response) => response.json())
      .then((data) => { if (mounted && data.success && Number(data.rate) > 0) setRate(Number(data.rate)) })
      .catch(() => { if (mounted) setRate(DEFAULT_USD_CDF_RATE) })
      .finally(() => { if (mounted) setRateReady(true) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    setRecipient(null)
    setLookupState('idle')
    if (!normalizedPhone) {
      if (phone.trim()) setLookupState('invalid')
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLookupState('loading')
      try {
        const token = useAppStore.getState().token
        const headers: Record<string, string> = {}
        if (token) headers.Authorization = `Bearer ${token}`
        const response = await fetch(`/api/users/phone-lookup?phone=${encodeURIComponent(normalizedPhone)}`, { headers, signal: controller.signal })
        const data = await response.json()
        if (!response.ok) {
          setLookupState('unavailable')
        } else if (data.code === 'RECIPIENT_SUSPENDED') {
          setLookupState('suspended')
        } else if (data.success && data.found && data.user) {
          setRecipient({ id: data.user.id, name: data.user.name, phone: data.user.phone })
          setLookupState('found')
        } else {
          setLookupState('missing')
        }
      } catch (error) {
        if (!controller.signal.aborted) setLookupState('unavailable')
      }
    }, 450)
    return () => { clearTimeout(timer); controller.abort() }
  }, [normalizedPhone, phone, country, user?.id])

  const availableBalance = sendingCurrency === 'USD'
    ? (user?.realBalance ?? 0) + (user?.bonusBalance ?? 0)
    : (user?.realBalanceFC ?? 0) + (user?.bonusBalanceFC ?? 0)

  function validate() {
    if (!selectedCountry?.callingCode) {
      toast.error('Ce territoire ne dispose pas d’indicatif téléphonique international attribué.')
      return false
    }
    if (!normalizedPhone) {
      toast.error('Entrez un numéro valide pour le pays sélectionné.')
      return false
    }
    if (!recipient) {
      toast.error('Ce numéro ne correspond pas à un compte Trait actif.')
      return false
    }
    if (recipient.id === user?.id) {
      toast.error('Un transfert vers votre propre compte est impossible.')
      return false
    }
    if (!(numericAmount > 0) || !Number.isFinite(numericAmount)) {
      toast.error('Entrez un montant supérieur à zéro.')
      return false
    }
    if (totalDebit > availableBalance) {
      toast.error(`Solde ${sendingCurrency} insuffisant pour couvrir le montant et les frais.`)
      return false
    }
    if (!rateReady) {
      toast.error('Le taux de conversion est encore en chargement.')
      return false
    }
    return true
  }

  function requestPin() {
    if (!validate() || !recipient || !user) return
    const clientRequestId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : null
    if (!clientRequestId) {
      toast.error('Cet appareil ne permet pas de sécuriser la référence du transfert. Mettez le navigateur à jour.')
      return
    }
    setConfirmOpen(false)
    setPendingPinAction(async (pin) => {
      if (!pin) return
      setSubmitting(true)
      try {
        const response = await fetch('/api/transfer/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverPhone: recipient.phone || normalizedPhone,
            amount: numericAmount,
            currency: sendingCurrency,
            receivingCurrency,
            traitCardTransfer: method === 'trait-card',
            clientRequestId,
            pin,
            description: note.trim() || `Transfert Trait vers ${recipient.name}`,
          }),
        })
        const data = await response.json()
        if (!response.ok || !data.success) {
          if (response.status >= 500) {
            throw new Error('Résultat incertain. Vérifiez l’historique avant toute nouvelle demande; une nouvelle tentative gardera la même référence sécurisée.')
          }
          toast.error(data.message || 'Le transfert a été refusé et aucun débit n’a été confirmé.')
          navigateTo('international-transfer')
          return
        }
        if (data.updatedBalances) setUser({ ...user, ...data.updatedBalances } as any)
        toast.success('Transfert Trait effectué', { description: `${formatCurrencyAmount(Number(data.transaction?.amountReceived ?? receivedAmount), receivingCurrency)} crédités à ${recipient.name}. Le reçu est disponible dans l’historique.` })
        if (data.transaction?.id) navigateTo('receipt', { transactionId: data.transaction.id })
        else navigateTo('history')
      } catch (error) {
        throw new Error(error instanceof Error && error.message.startsWith('Résultat incertain')
          ? error.message
          : 'La réponse du transfert n’est pas arrivée. Vérifiez l’historique avant de réessayer; la même référence sera réutilisée.')
      } finally {
        setSubmitting(false)
      }
    })
    navigateTo('pin-verify')
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-background px-4 pb-10 pt-5 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Retour" onClick={() => navigateTo('home')}><ArrowLeft className="size-5" /></Button>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Trait Fintech</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Transfert international</h1>
        </div>
      </header>

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm leading-6 text-muted-foreground">Envoyez directement vers un numéro inscrit à Trait, dans n’importe quel pays. Aucun Mobile Money externe ni paiement par carte bancaire extérieure n’est utilisé.</p>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="space-y-6 p-4 sm:p-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2"><Globe2 className="size-4 text-primary" /><h2 className="text-sm font-semibold">Compte bénéficiaire Trait</h2></div>
            <div className="space-y-2">
              <Label>Pays de l’indicatif</Label>
              <CountrySelect value={country} onValueChange={(next) => { setCountry(next); setPhone('') }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trait-beneficiary-phone">Téléphone associé au compte Trait</Label>
              <div className="flex gap-2">
                <div className="flex h-12 min-w-[5.5rem] items-center justify-center rounded-lg border bg-muted/30 px-3 text-sm font-medium" aria-label="Indicatif du pays sélectionné">{selectedCountry?.callingCode ?? '—'}</div>
                <Input id="trait-beneficiary-phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={selectedCountry?.exampleNational ?? 'Numéro de téléphone'} value={phone} onChange={(event) => setPhone(event.target.value)} className="h-12 min-w-0 flex-1" />
              </div>
              <div aria-live="polite" className="min-h-5 text-sm">
                {lookupState === 'loading' && <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Recherche du compte Trait…</span>}
                {lookupState === 'found' && recipient && <span className="inline-flex items-center gap-2 text-emerald-700"><CheckCircle2 className="size-4" /> {recipient.name} — compte Trait trouvé (nom du profil, identité non vérifiée)</span>}
                {lookupState === 'missing' && <span className="text-amber-700">Aucun compte Trait actif trouvé pour ce numéro.</span>}
                {lookupState === 'suspended' && <span className="text-destructive">Ce compte ne peut pas recevoir de transfert actuellement.</span>}
                {lookupState === 'unavailable' && <span className="text-destructive">La vérification du compte Trait est temporairement indisponible. Réessayez avant de continuer.</span>}
                {lookupState === 'invalid' && <span className="text-destructive">Le numéro ne respecte pas le format de ce pays.</span>}
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t pt-5">
            <div className="flex items-center gap-2"><Wallet className="size-4 text-primary" /><h2 className="text-sm font-semibold">Mode Trait</h2></div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setMethod('wallet')} aria-pressed={method === 'wallet'} className={`min-h-14 rounded-xl border p-3 text-left transition-colors ${method === 'wallet' ? 'border-primary bg-primary/[0.06]' : 'border-border hover:bg-muted/50'}`}>
                <span className="flex items-center gap-2 text-sm font-semibold"><Wallet className="size-4 text-primary" /> Wallet Trait</span><span className="mt-1 block text-xs text-muted-foreground">Bénéficiaire identifié par téléphone</span>
              </button>
              <button type="button" onClick={() => setMethod('trait-card')} aria-pressed={method === 'trait-card'} className={`min-h-14 rounded-xl border p-3 text-left transition-colors ${method === 'trait-card' ? 'border-primary bg-primary/[0.06]' : 'border-border hover:bg-muted/50'}`}>
                <span className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="size-4 text-primary" /> Carte Trait</span><span className="mt-1 block text-xs text-muted-foreground">Les deux comptes doivent avoir une carte Trait active</span>
              </button>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">La carte Trait utilise le solde Trait du compte. Aucun numéro de carte ni CVV n’est demandé ou transmis pour ce transfert.</p>
          </section>

          <section aria-labelledby="external-transfer-preview-title" className="space-y-3 border-t pt-5">
            <div>
              <h2 id="external-transfer-preview-title" className="text-sm font-semibold">Autres modes internationaux</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Aperçus des parcours préparés. Ils restent désactivés tant qu’un partenaire réel n’est pas connecté et vérifié.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Smartphone className="size-4 text-primary" /> Mobile Money international</div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">Bientôt disponible</span>
                </div>
                <div className="mt-3 space-y-2 rounded-lg border border-border/70 bg-background p-3 text-xs text-muted-foreground">
                  <p>Pays · opérateur compatible</p>
                  <p>Indicatif · téléphone du bénéficiaire Trait/partenaire</p>
                  <p>Montant · frais · estimation de réception</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">Aucun opérateur international n’est actuellement raccordé. Ce parcours n’envoie ni ne débite d’argent.</p>
              </article>
              <article className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Landmark className="size-4 text-primary" /> Virement bancaire</div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">Bientôt disponible</span>
                </div>
                <div className="mt-3 space-y-2 rounded-lg border border-border/70 bg-background p-3 text-xs text-muted-foreground">
                  <p>Pays · banque · nom légal du bénéficiaire</p>
                  <p>IBAN/SWIFT ou coordonnées bancaires locales</p>
                  <p>Montant · frais · taux · délai estimé</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">Aucune banque de règlement n’est connectée. Aucun virement réel ne peut être confirmé pour le moment.</p>
              </article>
            </div>
          </section>

          <section className="space-y-3 border-t pt-5">
            <div className="flex items-center gap-2"><ArrowRight className="size-4 text-primary" /><h2 className="text-sm font-semibold">Montants et devises</h2></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Devise envoyée</Label><Select value={sendingCurrency} onValueChange={(value) => setSendingCurrency(value as Currency)}><SelectTrigger className="h-12"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD — dollar américain</SelectItem><SelectItem value="CDF">CDF — franc congolais</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Devise reçue</Label><Select value={receivingCurrency} onValueChange={(value) => setReceivingCurrency(value as Currency)}><SelectTrigger className="h-12"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD — dollar américain</SelectItem><SelectItem value="CDF">CDF — franc congolais</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label htmlFor="trait-transfer-amount">Montant envoyé</Label><div className="relative"><Input id="trait-transfer-amount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0,00" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-12 pr-16 text-lg tabular-nums" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">{sendingCurrency}</span></div></div>
            {numericAmount > 0 && <div className="rounded-xl bg-muted/40 p-4 text-sm">
              <div className="flex justify-between gap-4 py-1"><span className="text-muted-foreground">Montant envoyé</span><span className="font-medium">{formatCurrencyAmount(numericAmount, sendingCurrency)}</span></div>
              <div className="flex justify-between gap-4 py-1"><span className="text-muted-foreground">Frais Trait (0,7 %)</span><span className="font-medium">{formatCurrencyAmount(fee, sendingCurrency)}</span></div>
              {sendingCurrency !== receivingCurrency && <div className="flex justify-between gap-4 py-1"><span className="text-muted-foreground">Taux appliqué</span><span className="text-right font-medium">1 USD = {formatExchangeRate(rate)} CDF</span></div>}
              <div className="mt-2 flex justify-between gap-4 border-t pt-3"><span className="font-semibold">Bénéficiaire reçoit</span><span className="font-bold text-primary">{formatCurrencyAmount(receivedAmount, receivingCurrency)}</span></div>
              <div className="flex justify-between gap-4 pt-2"><span className="text-muted-foreground">Total débité</span><span className="font-semibold">{formatCurrencyAmount(totalDebit, sendingCurrency)}</span></div>
            </div>}
            <div className="space-y-2"><Label htmlFor="trait-transfer-note">Motif <span className="font-normal text-muted-foreground">(facultatif)</span></Label><Input id="trait-transfer-note" value={note} onChange={(event) => setNote(event.target.value.slice(0, 200))} maxLength={200} placeholder="Ex. aide familiale" className="h-12" /></div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-3.5" /> Crédit du portefeuille Trait : immédiat après validation du PIN.</div>
          </section>

          <Button className="h-12 w-full text-base" onClick={() => { if (validate()) setConfirmOpen(true) }} disabled={submitting || lookupState === 'loading' || !rateReady}>
            {submitting ? <><Loader2 className="mr-2 size-4 animate-spin" /> Validation…</> : <>Vérifier le transfert <ArrowRight className="ml-2 size-4" /></>}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle>Confirmer le transfert</DialogTitle><DialogDescription>Vérifiez le bénéficiaire et les montants. La validation finale se fera avec votre PIN Trait.</DialogDescription></DialogHeader>
          <div className="space-y-3 rounded-xl bg-muted/40 p-4 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Bénéficiaire Trait</span><span className="text-right font-medium">{recipient?.name}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Téléphone</span><span className="font-medium">{normalizedPhone}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Mode</span><span className="font-medium">{method === 'wallet' ? 'Wallet Trait' : 'Carte Trait'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Montant envoyé</span><span className="font-medium">{formatCurrencyAmount(numericAmount, sendingCurrency)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Frais</span><span className="font-medium">{formatCurrencyAmount(fee, sendingCurrency)}</span></div>
            {sendingCurrency !== receivingCurrency && <div className="flex justify-between gap-4"><span className="text-muted-foreground">Taux du moment</span><span className="font-medium">1 USD = {formatExchangeRate(rate)} CDF</span></div>}
            <div className="flex justify-between gap-4 border-t pt-3"><span className="font-semibold">Montant reçu</span><span className="font-bold text-primary">{formatCurrencyAmount(receivedAmount, receivingCurrency)}</span></div>
            <div className="flex justify-between gap-4"><span className="font-semibold">Total débité</span><span className="font-bold">{formatCurrencyAmount(totalDebit, sendingCurrency)}</span></div>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="outline" className="h-12" onClick={() => setConfirmOpen(false)}>Modifier</Button>
            <Button className="h-12" onClick={requestPin}>Confirmer et saisir le PIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
