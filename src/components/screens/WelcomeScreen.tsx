'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Phone, Store, Code, ArrowLeftRight, ShoppingBag,
  Smartphone, Apple, Check, Globe, Headphones,
  Shield, Zap, Gift, Wallet, ChevronRight,
  ArrowRight, Lock, Star, Download, ChevronDown, X,
  CreditCard, TrendingUp, Landmark, MessageCircle, Languages,
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { useTranslation, languages, type Language } from '@/lib/i18n'
import { toast } from 'sonner'

const services = [
  { icon: Send, label: 'Transferts', desc: 'Argent instantané' },
  { icon: Phone, label: 'Mobile Money', desc: 'Payez partout' },
  { icon: CreditCard, label: 'Cartes', desc: 'USD & FC' },
  { icon: ArrowLeftRight, label: 'Troc', desc: 'Échangez facilement' },
  { icon: ShoppingBag, label: 'Marketplace', desc: 'Achetez & vendez' },
  { icon: Code, label: 'API', desc: 'Intégrez TRAIT' },
]

const steps = [
  { num: '01', title: 'Créez votre compte', desc: 'Inscription en 30 secondes, sans papier.' },
  { num: '02', title: 'Vérifiez votre identité', desc: 'Photo de votre pièce d\'identité, c\'est tout.' },
  { num: '03', title: 'Envoyez & recevez', desc: 'Transférez en RDC et dans le monde entier.' },
]

const faq = [
  { q: 'Quels sont les frais ?', a: 'Seulement 0,7% par transaction. Aucun frais caché.' },
  { q: 'Est-ce sécurisé ?', a: 'Chiffrement SSL/TLS, JWT, et authentification à deux facteurs.' },
  { q: 'Quelles devises ?', a: 'USD et Franc Congolais (FC), avec conversion automatique.' },
  { q: 'Comment contacter le support ?', a: 'Disponible 24/7 via chat, email ou téléphone.' },
]

const langLabels: Record<string, string> = { fr: 'Français', en: 'English', es: 'Español', ar: 'العربية', pt: 'Português', ln: 'Lingála', sw: 'Kiswahili', tl: 'Tshiluba', kg: 'Kikongo' }

export default function WelcomeScreen() {
  const navigateTo = useAppStore((s) => s.navigateTo)
  const { t, language, setLanguage } = useTranslation()
  const { canInstall, isInstalled, isStandalone, installApp } = usePWAInstall()
  const [installing, setInstalling] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [installPlatform, setInstallPlatform] = useState<'android' | 'ios'>('android')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleInstall = async (platform: 'android' | 'ios') => {
    setInstallPlatform(platform)
    if (platform === 'android' && canInstall) {
      setInstalling(true)
      const ok = await installApp()
      setInstalling(false)
      if (ok) return toast.success(t('welcome.install_success'))
    }
    setShowInstallModal(true)
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090b] relative">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0D5C63] to-[#14888F] flex items-center justify-center shadow-lg shadow-[#0D5C63]/20">
              <span className="text-white text-sm font-black">T</span>
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">TRAIT</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <Languages className="w-3.5 h-3.5" />
                {language.toUpperCase()}
                <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {showLangMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-border/60 py-1.5 z-50"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => { setLanguage(lang); setShowLangMenu(false) }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${
                          language === lang ? 'text-[#0D5C63] bg-[#0D5C63]/5' : 'text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-md bg-muted/60 flex items-center justify-center text-[9px] font-bold">{lang.toUpperCase()}</span>
                        {langLabels[lang] || lang}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button onClick={() => navigateTo('auth', { mode: 'login' })} variant="ghost" className="text-xs font-semibold h-8 px-3">
              {t('welcome.login')}
            </Button>
            <Button onClick={() => navigateTo('auth', { mode: 'register' })} className="text-xs font-semibold h-8 px-4 bg-[#0D5C63] hover:bg-[#0A4A50] text-white rounded-lg shadow-md shadow-[#0D5C63]/20">
              {t('welcome.signup')}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* ── Hero ── */}
        <section className="pt-16 sm:pt-24 pb-16 text-center relative">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#0D5C63]/5 rounded-full blur-[120px]" />
            <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0D5C63]/10 border border-[#0D5C63]/15 text-[#0D5C63] text-xs font-semibold mb-6"
            >
              <Zap className="w-3.5 h-3.5" />
              Nouveau : Transferts internationaux disponibles
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6"
            >
              <div className="relative inline-block">
                <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-[#0D5C63]/15 to-[#14888F]/10 blur-2xl" />
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-[#0D5C63] via-[#0A7B82] to-[#14888F] p-[2px] shadow-2xl shadow-[#0D5C63]/30">
                  <div className="w-full h-full rounded-[22px] bg-white dark:bg-zinc-950 flex items-center justify-center">
                    <Image src="/trait-logo.png" alt="TRAIT" width={72} height={72} className="object-contain" priority />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground leading-[1.1] mb-5 tracking-tight"
            >
              Votre argent,
              <br />
              <span className="bg-gradient-to-r from-[#0D5C63] via-[#14888F] to-blue-500 bg-clip-text text-transparent">
                sans frontières.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed"
            >
              Transférez, payez et échangez en toute simplicité avec TRAIT. La fintech de nouvelle génération pour l&apos;Afrique.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Button
                onClick={() => navigateTo('auth', { mode: 'register' })}
                className="w-full sm:w-auto h-12 px-8 text-sm font-bold bg-[#0D5C63] hover:bg-[#0A4A50] text-white rounded-xl shadow-lg shadow-[#0D5C63]/25 transition-all active:scale-[0.98] group"
              >
                {t('welcome.signup')}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <Button
                onClick={() => navigateTo('auth', { mode: 'login' })}
                variant="outline"
                className="w-full sm:w-auto h-12 px-8 text-sm font-bold border-2 border-[#0D5C63]/15 text-[#0D5C63] rounded-xl hover:bg-[#0D5C63]/5 active:scale-[0.98]"
              >
                {t('welcome.login')}
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="pb-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: '50+', label: 'Pays', icon: Globe },
              { value: '0,7%', label: 'Frais', icon: Zap },
              { value: '10$', label: 'Bonus', icon: Gift },
              { value: '99,9%', label: 'Disponibilité', icon: TrendingUp },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 p-5 text-center hover:shadow-lg hover:shadow-[#0D5C63]/5 hover:border-[#0D5C63]/15 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-[#0D5C63]/10 flex items-center justify-center mx-auto mb-3">
                  <s.icon className="w-5 h-5 text-[#0D5C63]" />
                </div>
                <p className="text-2xl font-black text-foreground tracking-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Services ── */}
        <section className="pb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-2">Nos services</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">Tout ce dont vous avez besoin pour gérer votre argent.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {services.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 p-5 text-center hover:shadow-lg hover:shadow-[#0D5C63]/5 hover:border-[#0D5C63]/15 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-[#0D5C63]/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-[#0D5C63] group-hover:scale-110 transition-all duration-300">
                  <s.icon className="w-5 h-5 text-[#0D5C63] group-hover:text-white transition-colors" />
                </div>
                <p className="text-sm font-bold text-foreground mb-0.5">{s.label}</p>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="pb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-2">Comment ça marche</h2>
            <p className="text-sm text-muted-foreground">Commencez en 3 étapes simples.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 p-6 relative overflow-hidden group hover:shadow-lg hover:shadow-[#0D5C63]/5 transition-all duration-300"
              >
                <span className="absolute top-3 right-4 text-6xl font-black text-[#0D5C63]/5 group-hover:text-[#0D5C63]/10 transition-colors">{s.num}</span>
                <div className="w-10 h-10 rounded-xl bg-[#0D5C63] flex items-center justify-center mb-4 shadow-md shadow-[#0D5C63]/20">
                  <span className="text-white text-sm font-bold">{s.num}</span>
                </div>
                <h3 className="text-base font-bold text-foreground mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Security ── */}
        <section className="pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1A2744] to-[#0F172A] p-8 sm:p-12 overflow-hidden"
          >
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#0D5C63]/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-500/10 rounded-full blur-[80px]" />

            <div className="relative z-10 text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center mx-auto mb-5">
                <Shield className="w-7 h-7 text-[#00D4AA]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">Sécurité maximale</h2>
              <p className="text-sm text-blue-200/60 leading-relaxed mb-6">
                Vos transactions sont protégées par les technologies les plus avancées. Vos données sont sécurisées de bout en bout.
              </p>
              <div className="flex items-center justify-center gap-6">
                {[
                  { icon: Lock, label: 'SSL/TLS' },
                  { icon: Shield, label: 'JWT' },
                  { icon: Star, label: 'E2E' },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-2 text-sm text-blue-200/50">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <t.icon className="w-4 h-4 text-[#00D4AA]" />
                    </div>
                    <span className="font-medium">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Quick Links ── */}
        <section className="pb-16">
          <div className="space-y-3">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              onClick={() => navigateTo('agent-register')}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200/60 dark:border-amber-800/30 text-amber-800 dark:text-amber-300 font-semibold text-sm hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer group"
            >
              <span className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Landmark className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold">Agent TRAIT</p>
                  <p className="text-xs font-normal opacity-70">Devenez agent de transfert</p>
                </div>
              </span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              onClick={() => navigateTo('developer-register')}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-zinc-50 dark:from-zinc-800/50 dark:to-zinc-900/50 border border-slate-200/60 dark:border-zinc-700/40 text-foreground font-semibold text-sm hover:shadow-lg hover:shadow-slate-500/10 transition-all duration-300 cursor-pointer group"
            >
              <span className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Code className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="text-left">
                  <p className="font-bold">Espace Développeur</p>
                  <p className="text-xs font-normal text-muted-foreground">Intégrez TRAIT dans vos applications</p>
                </div>
              </span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              onClick={() => navigateTo('support')}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 text-muted-foreground font-medium text-sm hover:text-foreground hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <span className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Headphones className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-foreground">Support</p>
                  <p className="text-xs font-normal">Aide disponible 24/7</p>
                </div>
              </span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="pb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-2">Questions fréquentes</h2>
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            {faq.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  {f.q}
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Download ── */}
        {!isStandalone && !isInstalled && (
          <section className="pb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/5 p-8 text-center"
            >
              <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">Téléchargez l&apos;application</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">Disponible sur Android et iOS. Emportez TRAIT partout avec vous.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => handleInstall('android')}
                  disabled={installing}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-[#0D5C63] hover:bg-[#0A4A50] text-white font-semibold text-sm shadow-lg shadow-[#0D5C63]/25 transition-all cursor-pointer disabled:opacity-50 group"
                >
                  <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-[10px] font-normal opacity-70">Télécharger sur</p>
                    <p className="text-sm font-bold">Android</p>
                  </div>
                </button>
                <button
                  onClick={() => handleInstall('ios')}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm shadow-lg transition-all cursor-pointer group"
                >
                  <Apple className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-[10px] font-normal opacity-70">Télécharger sur</p>
                    <p className="text-sm font-bold">iOS</p>
                  </div>
                </button>
              </div>
              <a href="/downloads/trait.apk" download="TRAIT.apk" className="inline-flex items-center gap-1.5 mt-4 text-xs text-[#0D5C63] hover:underline font-medium">
                <Download className="w-3 h-3" />
                Télécharger l&apos;APK directement
              </a>
            </motion.div>
          </section>
        )}

        {/* ── CTA ── */}
        <section className="pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl bg-gradient-to-br from-[#0D5C63] via-[#0A7B82] to-[#14888F] p-8 sm:p-12 text-center overflow-hidden"
          >
            <div className="absolute inset-0">
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-[80px]" />
            </div>
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">Prêt à commencer ?</h2>
              <p className="text-sm text-white/70 max-w-sm mx-auto mb-6 leading-relaxed">
                Rejoignez des milliers d&apos;utilisateurs qui font confiance à TRAIT pour leurs transactions financières.
              </p>
              <Button
                onClick={() => navigateTo('auth', { mode: 'register' })}
                className="h-12 px-8 bg-white hover:bg-white/90 text-[#0D5C63] font-bold rounded-xl shadow-xl transition-all active:scale-[0.98] group text-sm"
              >
                {t('welcome.cta_button')}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#09090b]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0D5C63] to-[#14888F] flex items-center justify-center">
                <span className="text-white text-[10px] font-black">T</span>
              </div>
              <span className="text-sm font-bold text-foreground">TRAIT</span>
              <span className="text-xs text-muted-foreground">&copy; 2026</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a href="/terms" className="hover:text-foreground transition-colors">Conditions</a>
              <span className="w-px h-3 bg-border" />
              <span>Fait avec ❤️ en RDC</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Install Modal ── */}
      <AnimatePresence>
        {showInstallModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowInstallModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${installPlatform === 'android' ? 'bg-[#0D5C63]' : 'bg-zinc-800'}`}>
                    {installPlatform === 'android' ? <Smartphone className="w-5 h-5 text-white" /> : <Apple className="w-5 h-5 text-white" />}
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {installPlatform === 'android' ? 'Installer sur Android' : 'Installer sur iOS'}
                  </h3>
                </div>
                <button onClick={() => setShowInstallModal(false)} className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                {installPlatform === 'android' ? (
                  <>
                    {['Ouvrez Chrome et allez sur trait-rho.vercel.app', 'Appuyez sur le menu ⋮ puis "Ajouter à l\'écran d\'accueil"', 'Confirmez en appuyant sur "Ajouter"', 'TRAIT est maintenant installé !'].map((step, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-full bg-[#0D5C63]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-[#0D5C63]">{i + 1}</span>
                        </div>
                        <p className="text-sm text-foreground">{step}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {['Ouvrez Safari sur votre iPhone', 'Allez sur trait-rho.vercel.app', 'Appuyez sur le bouton Partager puis "Sur l\'écran d\'accueil"', 'TRAIT est maintenant installé !'].map((step, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{i + 1}</span>
                        </div>
                        <p className="text-sm text-foreground">{step}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <a href="/downloads/trait.apk" download="TRAIT.apk" className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-[#0D5C63] hover:bg-[#0A4A50] text-white text-sm font-semibold transition-colors">
                <Download className="w-4 h-4" />Télécharger l&apos;APK
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
