'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, BookOpen, Beaker, Key, Code2, Webhook, Shield, Copy, Check,
  Smartphone, Globe, Server, Wallet, Database, Mail, CheckCircle, AlertTriangle,
  DollarSign, Percent, ExternalLink, Star, Clock, Zap, Lock, RefreshCw,
  Terminal, Repeat, Filter, Sliders, Ban, Play, Layers, Download,
  Link2, Eye, EyeOff, ArrowRight, HelpCircle, Search, Upload, Share2,
  QrCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

// ─── Rocket icon ───────────────────────────────────────────────
function Rocket({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
}

// ─── Code block with copy ──────────────────────────────────────
function CodeBlock({ code, label, lang }: { code: string; label?: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group">
      <div className="flex items-center justify-between mb-1.5">
        {label && <p className="text-xs font-semibold text-muted-foreground">{label}</p>}
        {lang && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{lang}</span>}
      </div>
      <div className="absolute top-8 right-2 z-10">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md bg-slate-700/50 hover:bg-slate-600 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); toast.success('Copié !'); setTimeout(() => setCopied(false), 2000) }}>
          {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
      <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs leading-relaxed font-mono overflow-x-auto border border-slate-800"><code>{code}</code></pre>
    </div>
  )
}

// ─── Endpoint row ──────────────────────────────────────────────
function EndpointRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  const isPost = method === 'POST'
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
      <span className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ${isPost ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>{method}</span>
      <code className="text-xs font-mono text-foreground flex-1">{path}</code>
      <span className="text-xs text-muted-foreground hidden sm:inline">{desc}</span>
    </div>
  )
}

type SectionId =
  | 'overview' | 'ui-preview' | 'getting-started' | 'authentication'
  | 'sandbox' | 'endpoints' | 'sdk' | 'testing' | 'webhooks'
  | 'errors' | 'security' | 'fees' | 'production'

const SECTIONS: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: BookOpen },
  { id: 'ui-preview', label: 'Aperçu paiement', icon: Eye },
  { id: 'getting-started', label: 'Premiers pas', icon: Rocket },
  { id: 'authentication', label: 'Authentification', icon: Key },
  { id: 'sandbox', label: 'Bac à sable', icon: Beaker },
  { id: 'endpoints', label: 'API', icon: Server },
  { id: 'sdk', label: 'SDK & exemples', icon: Layers },
  { id: 'testing', label: 'Test en direct', icon: Play },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'errors', label: 'Erreurs', icon: AlertTriangle },
  { id: 'security', label: 'Sécurité', icon: Shield },
  { id: 'fees', label: 'Frais 1,5%', icon: Percent },
  { id: 'production', label: 'Production', icon: Rocket },
]

// ─── Payment UI mockup component ───────────────────────────────
function PaymentUIMockup() {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 border border-slate-700/50 shadow-2xl max-w-sm mx-auto">
      {/* Status bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-slate-400">Connecté</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="size-3 text-emerald-400" />
          <span className="text-[10px] text-slate-400">TRAIT Secure</span>
        </div>
      </div>

      {/* Merchant info */}
      <div className="text-center mb-5">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-emerald-500/30">
          <span className="text-white text-xl font-bold">M</span>
        </div>
        <h3 className="text-white text-base font-bold">MaBoutique SARL</h3>
        <p className="text-slate-400 text-xs">Paiement commande #TRAIT-2024</p>
      </div>

      {/* Amount */}
      <div className="bg-slate-800/80 rounded-xl p-4 text-center mb-4 border border-slate-700/50">
        <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Montant à payer</p>
        <p className="text-white text-3xl font-bold">15 500 <span className="text-lg text-emerald-400">CDF</span></p>
        <p className="text-slate-500 text-xs mt-1">≈ $5,72 USD</p>
      </div>

      {/* Payment methods */}
      <div className="space-y-2 mb-4">
        <p className="text-slate-500 text-[10px] uppercase tracking-widest">Méthode de paiement</p>
        <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl p-3 border border-emerald-500/50 border-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center"><Wallet className="size-4 text-emerald-400" /></div>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">Wallet Trait</p>
            <p className="text-slate-400 text-[10px]">Compte Trait vérifié requis</p>
          </div>
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="size-3 text-white" /></div>
        </div>
        <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 opacity-60">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center"><CreditCardIcon className="size-4 text-blue-400" /></div>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">Carte Trait</p>
            <p className="text-slate-400 text-[10px]">Destinataire avec carte Trait active</p>
          </div>
        </div>
      </div>

      {/* Pay button */}
      <button className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2">
        <Lock className="size-4" />
        Payer 15 500 CDF
      </button>

      {/* Security badge */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        <Lock className="size-3 text-slate-500" />
        <span className="text-[10px] text-slate-500">Paiement sécurisé via TRAIT</span>
        <Shield className="size-3 text-slate-500" />
      </div>
    </div>
  )
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="18" height="11" x="3" y="7" rx="2" ry="2"/>
      <path d="M3 11h18"/><path d="M7 15h4"/><path d="M15 15h2"/>
    </svg>
  )
}

// ─── Main component ────────────────────────────────────────────
export default function IntegrationGuideScreen() {
  const { navigateTo } = useAppStore()
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testAmount, setTestAmount] = useState('2500')
  const [testCurrency, setTestCurrency] = useState('CDF')
  const [showSecret, setShowSecret] = useState(false)

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id)
    const el = document.getElementById(`section-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const runTestPayment = async () => {
    setTestLoading(true); setTestResult(null)
    try {
      const res = await fetch('/api/developers/test-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(testAmount) || 2500, currency: testCurrency }),
      })
      const data = await res.json()
      setTestResult(JSON.stringify(data, null, 2))
      if (data.success) {
        toast.success('Test réussi !')
      } else {
        toast.error(data.message || 'Échec')
      }
    } catch {
      setTestResult(JSON.stringify({ error: 'Erreur réseau' }, null, 2))
      toast.error('Erreur réseau')
    } finally { setTestLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('developer-register')}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">Guide d&apos;intégration</h1>
            <p className="text-[10px] text-muted-foreground">TRAIT API v2.0 — Documentation complète</p>
          </div>
          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">v2.0</Badge>
        </div>
        <div className="flex gap-1 px-4 pb-2 overflow-x-auto scrollbar-hide">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => scrollToSection(s.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeSection === s.id ? 'bg-emerald-600 text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
              <s.icon className="size-3" />{s.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-6 pb-24 max-w-4xl mx-auto space-y-6">

        {/* ════════════════════════════════════════════════════════
            SECTION 1: VUE D'ENSEMBLE
           ════════════════════════════════════════════════════════ */}
        <section id="section-overview">
          <Card className="border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 via-white to-slate-50 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-900/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <CardContent className="p-6 space-y-5 relative">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 shrink-0">
                  <BookOpen className="size-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Intégrer Trait Fintech à votre application</h2>
                  <p className="text-sm text-muted-foreground">Paiements et transferts entre comptes Trait, QR et cartes Trait.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { icon: Wallet, label: 'Paiements', value: 'Wallet Trait, Carte Trait, QR' },
                  { icon: Repeat, label: 'Transferts', value: 'Entre comptes Trait' },
                  { icon: QrCode, label: 'QR Code', value: 'Scan & Pay' },
                  { icon: Percent, label: 'Commission', value: '1,5% / transaction' },
                ].map((f, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-border/50 text-center">
                    <f.icon className="size-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-[10px] font-bold text-foreground">{f.label}</p>
                    <p className="text-[9px] text-muted-foreground">{f.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { n: '01', t: 'Inscription', d: 'Créez votre compte développeur et recevez vos clés API par email' },
                  { n: '02', t: 'Intégration', d: 'Testez en sandbox avec nos SDK et documentation interactive' },
                  { n: '03', t: 'Production', d: 'Activez vos clés live et traitez des transactions réelles' },
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-white dark:bg-slate-900 rounded-xl p-3 border border-border/50">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">{s.n}</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{s.t}</p>
                      <p className="text-[10px] text-muted-foreground">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 2: APERÇU DE L'INTERFACE DE PAIEMENT
           ════════════════════════════════════════════════════════ */}
        <section id="section-ui-preview">
          <Card className="border-blue-200 dark:border-blue-800/40 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-950/30 dark:to-slate-900/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0"><Eye className="size-5 text-white" /></div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Aperçu de l&apos;interface de paiement</h3>
                  <p className="text-xs text-muted-foreground">Voici à quoi ressemble l&apos;écran de paiement une fois TRAIT intégré</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <PaymentUIMockup />
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-foreground">Ce que voit votre utilisateur</h4>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {[
                      'Nom du marchand et montant affiché en gros',
                      'Choix du Wallet Trait ou d’une carte Trait active',
                      'Bouton de paiement sécurisé avec cadenas',
                      'Indicateur de connexion et badge de sécurité TRAIT',
                      'Design responsive qui s\'adapte à tous les écrans',
                      'Paiement en CDF ou USD avec conversion automatique',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 border border-blue-200 dark:border-blue-800/30 mt-3">
                    <p className="text-[10px] text-blue-700 dark:text-blue-400 flex items-start gap-1.5">
                      <Code2 className="size-3 shrink-0 mt-0.5" />
                      Cette interface est générée par votre application après un appel à l&apos;API TRAIT. Vous contrôlez totalement le design.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 3: PREMIERS PAS
           ════════════════════════════════════════════════════════ */}
        <section id="section-getting-started">
          <Card className="border-border/70">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0"><Rocket className="size-5 text-white" /></div>
                <div><h3 className="text-sm font-bold text-foreground">Premiers pas</h3><p className="text-xs text-muted-foreground">5 étapes pour intégrer TRAIT</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {[
                  { n: '1', t: 'Compte développeur', d: 'Remplissez le formulaire d\'inscription', icon: Mail },
                  { n: '2', t: 'Validation', d: 'L\'équipe TRAIT approuve votre compte', icon: CheckCircle },
                  { n: '3', t: 'Clés API', d: 'Recevez vos clés par email', icon: Key },
                  { n: '4', t: 'Test sandbox', d: 'Intégrez et validez sans risque', icon: Beaker },
                  { n: '5', t: 'Production', d: 'Clés live et transactions réelles', icon: Shield },
                ].map((s) => (
                  <div key={s.n} className="flex flex-col items-center text-center bg-muted/30 rounded-xl p-3 border border-border/50">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-1.5">
                      <s.icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Étape {s.n}</span>
                    <p className="text-xs font-semibold text-foreground mt-0.5">{s.t}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{s.d}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 4: AUTHENTIFICATION
           ════════════════════════════════════════════════════════ */}
        <section id="section-authentication">
          <Card className="border-blue-200 dark:border-blue-800/40">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0"><Key className="size-5 text-white" /></div>
                <div><h3 className="text-sm font-bold text-foreground">Authentification</h3><p className="text-xs text-muted-foreground">Clés API, JWT et sécurité des requêtes</p></div>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Chaque requête API nécessite une clé secrète dans l&apos;en-tête HTTP :</p>
                <CodeBlock code={`Authorization: Bearer sk_live_xxxxxxxxxxxxx`} label="En-tête d'authentification" lang="HTTP" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                    <p className="font-semibold text-foreground text-xs">🔓 Clé publique <code className="text-[10px] bg-white dark:bg-slate-700 px-1 rounded font-mono">pk_</code></p>
                    <p className="text-xs">Utilisée côté client (frontend) pour initialiser le SDK sans risque.</p>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                    <p className="font-semibold text-foreground text-xs">🔐 Clé secrète <code className="text-[10px] bg-white dark:bg-slate-700 px-1 rounded font-mono">sk_</code></p>
                    <p className="text-xs">Utilisée côté serveur uniquement. Ne JAMAIS exposer dans le frontend.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800/30">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>En mode sandbox, utilisez les clés commençant par <code className="bg-white dark:bg-slate-800 px-1 rounded font-mono">pk_test_</code> et <code className="bg-white dark:bg-slate-800 px-1 rounded font-mono">sk_test_</code>.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 5: SANDBOX (BAC À SABLE)
           ════════════════════════════════════════════════════════ */}
        <section id="section-sandbox">
          <Card className="border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 via-white to-slate-50 dark:from-amber-950/30 dark:via-slate-950 dark:to-slate-900/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full -translate-y-1/2 -translate-x-1/2 blur-3xl" />
            <CardContent className="p-5 space-y-5 relative">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-600 flex items-center justify-center shrink-0"><Beaker className="size-5 text-white" /></div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Bac à sable (Sandbox)</h3>
                  <p className="text-xs text-muted-foreground">Environnement de test isolé — transactions simulées, zéro risque</p>
                </div>
              </div>

              {/* URL d'entrée API sandbox */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border-2 border-amber-300 dark:border-amber-700/50 shadow-lg">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Server className="size-3" /> URL D'ENTRÉE API SANDBOX
                </p>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                  <code className="flex-1 text-sm font-mono font-bold text-amber-700 dark:text-amber-400 break-all">https://sandbox.trait.cd/api/v1</code>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                    onClick={() => { navigator.clipboard.writeText('https://sandbox.trait.cd/api/v1'); toast.success('URL sandbox copiée !') }}>
                    <Copy className="size-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  <span className="font-semibold">Exemple :</span> <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono">POST https://sandbox.trait.cd/api/v1/payments</code>
                </p>
              </div>

              {/* Clés de test */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-border/50">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">🔓 Clé publique test</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg p-2 font-mono truncate">pk_test_a1b2c3d4e5f6g7h8i9j0k1l2</code>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { navigator.clipboard.writeText('pk_test_a1b2c3d4e5f6g7h8i9j0k1l2'); toast.success('Copié !') }}><Copy className="size-3" /></Button>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-border/50">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">🔐 Clé secrète test</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg p-2 font-mono truncate">{showSecret ? 'sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' : 'sk_test_••••••••••••••••••••'}</code>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setShowSecret(!showSecret)}>{showSecret ? <EyeOff className="size-3" /> : <Eye className="size-3" />}</Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { navigator.clipboard.writeText('sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'); toast.success('Copié !') }}><Copy className="size-3" /></Button>
                  </div>
                </div>
              </div>

              {/* Cartes de test */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-2">💳 Cartes de test sandbox</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { number: '4242 4242 4242 4242', label: 'Visa — Succès', color: 'text-blue-600' },
                    { number: '4000 0000 0000 0002', label: 'Visa — Échec', color: 'text-red-600' },
                    { number: '5555 5555 5555 4444', label: 'Mastercard — Succès', color: 'text-amber-600' },
                  ].map((c) => (
                    <div key={c.number} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCardIcon className="size-4 text-muted-foreground" />
                        <code className={`text-xs font-mono font-bold ${c.color}`}>{c.number}</code>
                      </div>
                      <div className="flex gap-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-muted-foreground font-mono">12/28</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-muted-foreground font-mono">123</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">{c.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Les paiements nécessitent un compte Trait enregistré. Les réseaux de paiement externes ne sont pas encore raccordés.
              </div>

              {/* Mode d'emploi */}
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800/30 space-y-2">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5"><HelpCircle className="size-3" /> Comment utiliser le sandbox</p>
                <ol className="text-xs text-amber-800 dark:text-amber-300 space-y-1 list-decimal list-inside">
                  <li>Utilisez l'URL <code className="bg-white dark:bg-slate-800 px-1 rounded text-[9px] font-mono">https://sandbox.trait.cd/api/v1</code> comme base</li>
                  <li>Authentifiez-vous avec la clé <code className="bg-white dark:bg-slate-800 px-1 rounded text-[9px] font-mono">sk_test_</code></li>
                  <li>Utilisez les cartes de test ci-dessus pour simuler des paiements</li>
                  <li>Les transactions sandbox n'affectent pas les soldes réels</li>
                  <li>Activez le mode sandbox dans votre SDK : <code className="bg-white dark:bg-slate-800 px-1 rounded text-[9px] font-mono">sandbox: true</code></li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 6: ENDPOINTS API
           ════════════════════════════════════════════════════════ */}
        <section id="section-endpoints">
          <Card className="border-purple-200 dark:border-purple-800/40">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center shrink-0"><Server className="size-5 text-white" /></div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Endpoints API</h3>
                  <p className="text-xs text-muted-foreground">Tous les endpoints disponibles — sandbox et production</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border/50">
                <Globe className="size-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Base URL sandbox :</span>
                <code className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">https://sandbox.trait.cd/api/v1</code>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 ml-auto"
                  onClick={() => { navigator.clipboard.writeText('https://sandbox.trait.cd/api/v1'); toast.success('Copié !') }}>
                  <Copy className="size-3" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <EndpointRow method="POST" path="/payments" desc="Créer un paiement" />
                <EndpointRow method="GET" path="/payments/:id" desc="Statut d'un paiement" />
                <EndpointRow method="POST" path="/payments/:id/cancel" desc="Annuler un paiement" />
                <EndpointRow method="POST" path="/transfers" desc="Transfert d'argent" />
                <EndpointRow method="GET" path="/transfers/:id" desc="Statut transfert" />
                <EndpointRow method="POST" path="/transfers/qr" desc="Paiement par QR" />
                <EndpointRow method="POST" path="/withdrawals" desc="Effectuer un retrait" />
                <EndpointRow method="GET" path="/withdrawals/:id" desc="Statut retrait" />
                <EndpointRow method="POST" path="/deposits" desc="Initier un dépôt" />
                <EndpointRow method="GET" path="/balance" desc="Consulter le solde" />
                <EndpointRow method="GET" path="/transactions" desc="Historique des transactions" />
                <EndpointRow method="POST" path="/webhooks" desc="Configurer un webhook" />
                <EndpointRow method="GET" path="/webhooks/:id" desc="Détail webhook" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 7: SDK & EXEMPLES PAR LANGAGE
           ════════════════════════════════════════════════════════ */}
        <section id="section-sdk">
          <Card className="border-emerald-200 dark:border-emerald-800/40">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0"><Layers className="size-5 text-white" /></div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">SDK & Exemples par langage</h3>
                  <p className="text-xs text-muted-foreground">Intégrez TRAIT dans votre stack technique</p>
                </div>
              </div>

              {/* Node.js / JavaScript */}
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Code2 className="size-4 text-emerald-600" /><h4 className="text-xs font-bold text-foreground">JavaScript (Node.js)</h4></div>
                <CodeBlock code={`const trait = require('trait-api')('sk_test_xxxxxxxxx')

// Créer un paiement
const payment = await trait.payments.create({
  amount: 15500,
  currency: 'CDF',
  description: 'Commande #123',
  customer: { email: 'client@email.com', phone: '+243901234567' }
})

console.log(payment.id)       // 'pay_abc123'
console.log(payment.status)   // 'processing' | 'completed' | 'failed'

// Vérifier le statut
const status = await trait.payments.get('pay_abc123')

// Webhook
app.post('/webhooks/trait', (req, res) => {
  const event = trait.webhooks.parse(req.body)
  if (event.type === 'payment.completed') {
    // Débloquer l'accès, envoyer un email, etc.
  }
  res.sendStatus(200)
})`} label="Node.js" lang="JavaScript" />
              </div>

              {/* Python */}
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Code2 className="size-4 text-blue-600" /><h4 className="text-xs font-bold text-foreground">Python</h4></div>
                <CodeBlock code={`from trait import Client

client = Client(api_key="sk_test_xxxxxxxxx", sandbox=True)

# Créer un paiement
payment = client.payments.create({
    "amount": 15500,
    "currency": "CDF",
    "description": "Commande #123",
    "customer": {"email": "client@email.com"}
})

print(payment["status"])  # 'processing'

# Effectuer un retrait
withdrawal = client.withdrawals.create({
    "amount": 50000,
    "currency": "CDF",
    "recipientPhone": "+243901234567",  # numéro enregistré dans Trait
    "description": "Paiement commande #123"
})`} label="Python" lang="Python" />
              </div>

              {/* PHP */}
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Code2 className="size-4 text-purple-600" /><h4 className="text-xs font-bold text-foreground">PHP</h4></div>
                <CodeBlock code={`<?php
require_once 'vendor/autoload.php';

$trait = new Trait\\Client('sk_test_xxxxxxxxx');
$trait->setSandbox(true);

$payment = $trait->payments->create([
  'amount' => 15500,
  'currency' => 'CDF',
  'description' => 'Commande #123',
  'customer' => ['email' => 'client@email.com']
]);

echo $payment['status']; // 'processing'
?>`} label="PHP" lang="PHP" />
              </div>

              {/* Flutter / Dart */}
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Smartphone className="size-4 text-sky-600" /><h4 className="text-xs font-bold text-foreground">Flutter / Dart (Mobile)</h4></div>
                <CodeBlock code={`import 'package:trait_flutter/trait.dart';

final client = TraitClient(
  apiKey: 'pk_test_xxxxxxxxx',  // ← clé publique côté client
  sandbox: true,
);

// Lancer le paiement
final payment = await client.payments.create(
  amount: 15500,
  currency: 'CDF',
  description: 'Achat dans mon app',
);

// Écouter le statut en temps réel
client.onPaymentStatusChanged.listen((event) {
  if (event.status == 'completed') {
    // Afficher "Paiement réussi"
  }
});`} label="Flutter / Dart" lang="Dart" />
              </div>

              {/* React Native */}
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Smartphone className="size-4 text-violet-600" /><h4 className="text-xs font-bold text-foreground">React Native</h4></div>
                <CodeBlock code={`import Trait from 'trait-react-native';

const client = new Trait({
  apiKey: 'pk_test_xxxxxxxxx',
  sandbox: true,
});

// Ouvrir l'écran de paiement
const payment = await client.presentPayment({
  amount: 15500,
  currency: 'CDF',
  description: 'Achat #456',
  onComplete: (result) => {
    if (result.status === 'completed') {
      Alert.alert('Succès', 'Paiement effectué !');
    }
  },
});`} label="React Native" lang="TypeScript" />
              </div>

              {/* cURL */}
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Terminal className="size-4 text-slate-600" /><h4 className="text-xs font-bold text-foreground">cURL (test rapide)</h4></div>
                <CodeBlock code={`curl -X POST https://sandbox.trait.cd/api/v1/payments \\
  -H "Authorization: Bearer sk_test_xxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 15500,
    "currency": "CDF",
    "description": "Test depuis cURL",
    "customer": {
      "email": "client@email.com",
      "phone": "+243901234567"
    }
  }'`} label="cURL" lang="bash" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 8: TEST EN DIRECT
           ════════════════════════════════════════════════════════ */}
        <section id="section-testing">
          <Card className="border-blue-200 dark:border-blue-800/40 bg-gradient-to-br from-blue-50 via-white to-slate-50 dark:from-blue-950/30 dark:via-slate-950 dark:to-slate-900/50">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0"><Play className="size-5 text-white" /></div>
                <div><h3 className="text-sm font-bold text-foreground">Tester l&apos;API en direct</h3><p className="text-xs text-muted-foreground">Effectuez un appel réel vers notre sandbox depuis cette page</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Montant</Label>
                  <Input type="number" value={testAmount} onChange={(e) => setTestAmount(e.target.value)} className="h-10 text-sm mt-1" placeholder="2500" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Devise</Label>
                  <select value={testCurrency} onChange={(e) => setTestCurrency(e.target.value)}
                    className="h-10 w-full mt-1 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="CDF">CDF — Franc congolais</option>
                    <option value="USD">USD — Dollars américains</option>
                  </select>
                </div>
              </div>
              <Button onClick={runTestPayment} disabled={testLoading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl gap-2">
                {testLoading ? <><RefreshCw className="size-4 animate-spin" /> Test en cours...</> : <><Beaker className="size-4" /> Lancer le test sandbox</>}
              </Button>
              {testResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Réponse de l'API</p>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1"
                      onClick={() => { navigator.clipboard.writeText(testResult); toast.success('Copié !') }}>
                      <Copy className="size-3" /> Copier
                    </Button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-64 border border-slate-800"><code>{testResult}</code></pre>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 9: WEBHOOKS
           ════════════════════════════════════════════════════════ */}
        <section id="section-webhooks">
          <Card className="border-purple-200 dark:border-purple-800/40">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center shrink-0"><Webhook className="size-5 text-white" /></div>
                <div><h3 className="text-sm font-bold text-foreground">Webhooks</h3><p className="text-xs text-muted-foreground">Notifications en temps réel — retry automatique</p></div>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Configurez une URL de webhook pour recevoir automatiquement les événements.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-foreground">Événements disponibles</p>
                    <div className="space-y-1.5 text-xs">
                      {[
                        { ev: 'payment.completed', color: 'text-emerald-600' },
                        { ev: 'payment.failed', color: 'text-red-600' },
                        { ev: 'transfer.received', color: 'text-blue-600' },
                        { ev: 'transfer.sent', color: 'text-purple-600' },
                        { ev: 'withdrawal.completed', color: 'text-amber-600' },
                        { ev: 'deposit.completed', color: 'text-emerald-600' },
                      ].map((e) => (
                        <div key={e.ev} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-current" />
                          <code className={`${e.color} font-mono text-[10px]`}>{e.ev}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-foreground">Politique de retry</p>
                    <div className="space-y-1 text-xs">
                      <p>🔁 3 tentatives automatiques</p>
                      <p>⏱ Intervalles : 5s → 30s → 5min</p>
                      <p>🔒 Signature HMAC-SHA256</p>
                      <p>📦 Payload JSON structuré</p>
                    </div>
                  </div>
                </div>
                <CodeBlock code={`{
  "event": "payment.completed",
  "data": {
    "id": "pay_abc123",
    "amount": 15500,
    "currency": "CDF",
    "status": "completed",
    "fee": 232.5,
    "commission": 232.5,
    "customer": {
      "email": "client@email.com",
      "phone": "+243901234567"
    },
    "metadata": { "orderId": "123" },
    "timestamp": "2026-06-30T12:00:00Z"
  },
  "signature": "sha256=abc123def456..."
}`} label="Exemple de payload webhook" lang="JSON" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 10: GESTION DES ERREURS
           ════════════════════════════════════════════════════════ */}
        <section id="section-errors">
          <Card className="border-red-200 dark:border-red-800/40">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0"><AlertTriangle className="size-5 text-white" /></div>
                <div><h3 className="text-sm font-bold text-foreground">Gestion des erreurs</h3><p className="text-xs text-muted-foreground">Codes d'erreur, idempotence et stratégies de résilience</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Code</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Signification</th>
                      <th className="text-left py-2 font-semibold text-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {[
                      ['400', 'Requête invalide', 'Vérifiez les paramètres envoyés'],
                      ['401', 'Non authentifié', 'Vérifiez votre clé API'],
                      ['403', 'Non autorisé', 'Vérifiez les permissions'],
                      ['404', 'Ressource introuvable', 'Vérifiez l\'ID de la ressource'],
                      ['409', 'Conflit (idempotence)', 'Réutilisez la même clé'],
                      ['422', 'Données invalides', 'Corrigez les champs en erreur'],
                      ['429', 'Trop de requêtes', 'Réduisez le débit'],
                      ['500', 'Erreur serveur', 'Réessayez plus tard'],
                    ].map((row) => (
                      <tr key={row[0]}>
                        <td className="py-2 pr-4 font-mono font-bold" dangerouslySetInnerHTML={{
                          __html: row[0] === '429' ? '<span class="text-amber-600">429</span>' :
                                  row[0] === '500' ? '<span class="text-red-600">500</span>' :
                                  `<span>${row[0]}</span>`
                        }} />
                        <td className="py-2 pr-4 text-muted-foreground">{row[1]}</td>
                        <td className="py-2 text-muted-foreground">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl p-3 border border-red-200 dark:border-red-800/30">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>Utilisez l'idempotence : envoyez un en-tête <code className="bg-white dark:bg-slate-800 px-1 rounded font-mono">Idempotency-Key</code> pour éviter les doublons en cas de timeout.</span>
              </div>
              <CodeBlock code={`// Exemple avec clé d'idempotence
const response = await fetch('https://sandbox.trait.cd/api/v1/payments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'Content-Type': 'application/json',
    'Idempotency-Key': crypto.randomUUID()  // ← Unique par requête
  },
  body: JSON.stringify({ amount: 15500, currency: 'CDF' })
})`} label="Idempotence — éviter les paiements en double" lang="JavaScript" />
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 11: SÉCURITÉ & BONNES PRATIQUES
           ════════════════════════════════════════════════════════ */}
        <section id="section-security">
          <Card className="border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 to-slate-50 dark:from-emerald-950/30 dark:to-slate-900/50">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0"><Shield className="size-5 text-white" /></div>
                <div><h3 className="text-sm font-bold text-foreground">Sécurité & Bonnes pratiques</h3><p className="text-xs text-muted-foreground">Protégez vos utilisateurs et vos transactions</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: Lock, title: 'HTTPS uniquement', desc: 'Toutes les communications sont chiffrées en TLS 1.3.' },
                  { icon: Ban, title: 'Rate limiting', desc: '100 requêtes/min par clé API. Au-delà, code 429.' },
                  { icon: Key, title: 'Clés côté serveur', desc: 'Ne stockez jamais la clé secrète dans le code frontend.' },
                  { icon: Shield, title: 'Signature HMAC', desc: 'Les webhooks sont signés. Vérifiez la signature à réception.' },
                  { icon: Eye, title: 'Tokenisation', desc: 'Les données sensibles sont tokenisées. Nous ne stockons pas les CVV.' },
                  { icon: RefreshCw, title: 'Idempotence', desc: 'Empêchez les doubles paiements avec Idempotency-Key.' },
                  { icon: Filter, title: 'Validation des entrées', desc: 'Validez et assainissez toutes les données côté serveur.' },
                  { icon: EyeOff, title: 'Journalisation', desc: 'Ne journalisez jamais les clés API ou les données sensibles.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 bg-white dark:bg-slate-900 rounded-xl p-3 border border-border/50">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 12: FRAIS 1,5%
           ════════════════════════════════════════════════════════ */}
        <section id="section-fees">
          <Card className="border-amber-200 dark:border-amber-800/40">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-600 flex items-center justify-center shrink-0"><Percent className="size-5 text-white" /></div>
                <div><h3 className="text-sm font-bold text-foreground">Frais d'intégration</h3><p className="text-xs text-muted-foreground">Commission de 1,5% par transaction — pas de frais cachés</p></div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border-2 border-amber-200 dark:border-amber-800/40 text-center space-y-3">
                <div className="text-5xl font-black text-amber-600">1,5%</div>
                <p className="text-sm text-muted-foreground">par transaction traitée via votre intégration</p>
                <div className="flex justify-center gap-4 text-xs">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-semibold">Pas d'abonnement</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-semibold">Pas de frais fixes</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-semibold">Pas d'installation</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { montant: '5 000 CDF', com: '75 CDF', usd: '$0,09' },
                  { montant: '15 500 CDF', com: '232,5 CDF', usd: '$0,27' },
                  { montant: '100 000 CDF', com: '1 500 CDF', usd: '$1,74' },
                ].map((ex, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-border/50 text-center">
                    <p className="text-xs text-muted-foreground">Transaction</p>
                    <p className="text-base font-bold text-foreground">{ex.montant}</p>
                    <div className="mt-1.5 pt-1.5 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground">Commission 1,5%</p>
                      <p className="text-sm font-bold text-amber-600">{ex.com}</p>
                      <p className="text-[9px] text-muted-foreground">≈ {ex.usd}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 rounded-xl p-3">
                <DollarSign className="size-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>La commission est prélevée automatiquement sur chaque transaction. Vous recevez le montant net sur votre compte développeur.</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 13: PRODUCTION
           ════════════════════════════════════════════════════════ */}
        <section id="section-production">
          <Card className="border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 via-white to-slate-50 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-900/50">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0"><Rocket className="size-5 text-white" /></div>
                <div><h3 className="text-sm font-bold text-foreground">Passer en production</h3><p className="text-xs text-muted-foreground">Checklist pour un déploiement sécurisé</p></div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-border/50 space-y-2">
                <p className="text-[10px] font-bold text-foreground">✅ Checklist production</p>
                <div className="space-y-1.5">
                  {[
                    'Testé et validé en sandbox',
                    'Webhook configuré et réactif',
                    'Clés API stockées en variables d\'environnement',
                    'Idempotence implémentée',
                    'Gestion des erreurs et retry',
                    'Monitoring des webhooks (dashboard)',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="size-3 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-border/50 space-y-2">
                  <p className="text-[10px] font-semibold text-foreground flex items-center gap-1.5"><Beaker className="size-3 text-amber-600" /> Sandbox</p>
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground shrink-0">URL :</span><code className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">sandbox.trait.cd</code></div>
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground shrink-0">Clés :</span><code className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">sk_test_xxx</code></div>
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground shrink-0">Fonds :</span><span className="text-xs text-amber-600">Fictifs</span></div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                  <p className="text-[10px] font-semibold text-foreground flex items-center gap-1.5"><Shield className="size-3 text-emerald-600" /> Production</p>
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground shrink-0">URL :</span><code className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">api.trait.cd/v1</code></div>
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground shrink-0">Clés :</span><code className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">sk_live_xxx</code></div>
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground shrink-0">Fonds :</span><span className="text-xs text-emerald-600 font-semibold">Réels 🎯</span></div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 border border-blue-200 dark:border-blue-800/30">
                <Mail className="size-4 shrink-0 mt-0.5" />
                <span>Une fois votre demande approuvée, l'administrateur TRAIT vous envoie vos <strong>clés de production</strong> par email à l'adresse fournie lors de l'inscription.</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ─── Footer ─── */}
        <div className="text-center pt-6 pb-8 space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="size-3.5" />
            <span>TRAIT API <span className="font-bold text-emerald-600 dark:text-emerald-400">v2.0</span></span>
            <span className="text-border">|</span>
            <span>Guide d'intégration complet</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
              onClick={() => navigateTo('developer-register')}>
              <ArrowLeft className="size-3" /> Inscription
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
              onClick={() => { window.open('https://trait-rho.vercel.app', '_blank') }}>
              <ExternalLink className="size-3" /> Voir l'app
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => { navigator.clipboard.writeText('https://trait-rho.vercel.app'); toast.success('Lien copié !') }}>
              <Link2 className="size-3" /> Copier le lien
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground">
            Une question ? Contactez notre équipe via l'espace Support dans l'application
          </p>
        </div>
      </main>
    </div>
  )
}
