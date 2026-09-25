'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Phone, Store, Code, ArrowLeftRight, ShoppingBag,
  Smartphone, Apple, Check, Globe, Headphones,
  Shield, Zap, Gift, Wallet, ChevronRight,
  ArrowRight, Lock, Star, Download, ChevronDown, X,
  CreditCard, Landmark, Languages, QrCode, UserRound,
  PieChart, TrendingUp, Banknote, Users, CheckCircle,
  Sparkles, Award, Settings
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { useTranslation, languages, type Language } from '@/lib/i18n'
import { toast } from 'sonner'

const services = [
  { icon: Send, key: 'welcome.service_transfer' },
  { icon: Phone, key: 'welcome.service_mobile' },
  { icon: CreditCard, key: 'welcome.service_cards' },
  { icon: ArrowLeftRight, key: 'welcome.service_barter' },
  { icon: ShoppingBag, key: 'welcome.service_marketplace' },
  { icon: Code, key: 'welcome.service_api' },
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

const stats = [
  { value: '10k+', label: 'Utilisateurs actifs', icon: Users },
  { value: '5M+', label: 'Transactions traitées', icon: TrendingUp },
  { value: '99.9%', label: 'Disponibilité', icon: Zap },
  { value: '24/7', label: 'Support client', icon: Headphones },
]

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

  // Motion variants for enhanced animations
  const fadeInUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] }
  }

  const fadeInLeft = {
    initial: { opacity: 0, x: -24 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] }
  }

  const fadeInRight = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] }
  }

  const scaleIn = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] }
  }

  const hoverScale = {
    scale: 1.05
  }

  const pressScale = {
    scale: 0.95
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090b] relative overflow-hidden">
      {/* Subtle animated background pattern */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-[radial-gradient ellipse at top_left,rgba(13,92,99,0.03)_0%,transparent_50%]" />
        <div className="absolute inset-0 bg-[radial-gradient ellipse at bottom_right,rgba(20,136,143,0.02)_0%,transparent_50%]" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_1px,rgba(13,92,99,0.005)_1px,rgba(13,92,99,0.005)_2px)]" />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0D5C63] to-[#14888F] blur-3x" />
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0D5C63] to-[#14888F] flex items-center justify-center shadow-xl shadow-[0_4px_24px-_0D5C63/30]">
                <Image
                  src="/trait-logo.png"
                  alt="TRAIT"
                  width={20}
                  height={20}
                  className="object-contain"
                />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground letter-spacing-[-0.5px]">TRAIT</span>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button
              onClick={() => navigateTo('auth', { mode: 'login' })}
              variant="ghost"
              className="text-sm font-medium h-9 px-4 transition-all duration-200"
            >
              {t('welcome.login')}
            </Button>
            <Button
              onClick={() => navigateTo('auth', { mode: 'register' })}
              className="text-sm font-medium h-9 px-5 bg-[#0D5C63] hover:bg-[#0A4A50] text-white rounded-lg shadow-md shadow-[#0D5C63]/20 transition-all duration-200 hover:shadow-lg"
            >
              {t('welcome.signup')}
            </Button>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 p-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
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
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${language === lang ? 'text-[#0D5C63] bg-[#0D5C63]/5' : 'text-foreground hover:bg-muted/50'}`}
                      >
                        <span className="w-5 h-5 rounded-md bg-muted/60 flex items-center justify-center text-[9px] font-bold">{lang.toUpperCase()}</span>
                        {lang === 'fr' ? 'Français' : 'English'}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28">
        {/* ── Hero Section - Premium Fintech Experience ── */}
        <section className="mb-24 text-center">
          <div className="relative z-0">
            {/* Enhanced Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[radial-gradient ellipse at center,rgba(13,92,99,0.04)_0%,transparent_70%] blur-3xl" />
              <div className="absolute bottom-0 right-1/2 translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient ellipse at center,rgba(20,136,143,0.03)_0%,transparent_70%] blur-2xl" />
              <div className="absolute top-1/3 right-0 w-[350px] h-[350px] bg-[radial-gradient ellipse at center,rgba(13,92,99,0.02)_0%,transparent_70%] blur-xl" />
            </div>
          </div>

          <div className="relative z-10">
            {/* Premium Trust Badges with Subtle Animation */}
            <div className="flex flex-wrap justify-center gap-5 mb-8">
              {[{
                icon: Shield,
                label: 'Sécurité de niveau bancaire',
                variant: 'security'
              }, {
                icon: Award,
                label: 'Conforme aux normes internationales',
                variant: 'compliance'
              }, {
                icon: Sparkles,
                label: 'Communauté vérifiée & certifiée',
                variant: 'community'
              }, {
                icon: Settings,
                label: 'Technologie de pointe',
                variant: 'technology'
              }].map((badge, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                  className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <badge.icon className="w-5 h-5 text-[#0D5C63]" />
                  <span className="text-xs font-medium text-foreground">{badge.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Elevated Logo Presentation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="inline-block mb-10"
            >
              <div className="relative w-32 h-32 sm:w-36 sm:h-36">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#0D5C63]/20 to-[#14888F]/20 blur-3xl" />
                {/* Main logo container with depth */}
                <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-[#0D5C63] via-[#0A7B82] to-[#14888F] p-[4px] shadow-2xl shadow-[0_8px_32px-_0D5C63/40]">
                  <div className="w-full h-full rounded-[28px] bg-white dark:bg-zinc-950 flex items-center justify-center">
                    <Image
                      src="/trait-logo.png"
                      alt="TRAIT Logo"
                      width={64}
                      height={64}
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Refined Hero Typography */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-black text-foreground leading-[1.05] mb-5 tracking-tighter letter-spacing-[-0.75px]"
            >
              {t('welcome.hero')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              {t('welcome.hero_desc')}
            </motion.p>

            {/* Enhanced Stats with Better Visual Hierarchy */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.7 }}
              className="flex flex-wrap justify-center gap-8 mb-12"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.06 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="flex items-center gap-2 bg-[${stat.icon === Users ? '#0D5C63' : stat.icon === TrendingUp ? '#14888F' : stat.icon === Zap ? '#00D4AA' : '#6366F1'}]/10 rounded-xl p-3">
                    <stat.icon className="w-6 h-6 text-[${stat.icon === Users ? '#0D5C63' : stat.icon === TrendingUp ? '#14888F' : stat.icon === Zap ? '#00D4AA' : '#6366F1'}]" />
                  </div>
                  <p className="text-3xl font-black text-foreground tracking-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground tracking-wider uppercase letter-spacing-[0.5px]">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Premium Action Buttons with Enhanced Interactions */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6"
            >
              <Button
                onClick={() => navigateTo('auth', { mode: 'register' })}
                className="w-full sm:w-auto h-12 px-8 text-sm font-bold bg-[#0D5C63] hover:bg-[#0A4A50] text-white rounded-xl shadow-lg shadow-[#0D5C63]/25 transition-all duration-300 active:scale-[0.97] group hover:shadow-xl"
              >
                {t('welcome.signup')}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-300" />
              </Button>
              <Button
                onClick={() => navigateTo('auth', { mode: 'login' })}
                variant="outline"
                className="w-full sm:w-auto h-12 px-8 text-sm font-bold border-2 border-[#0D5C63]/15 text-[#0D5C63] rounded-xl hover:bg-[#0D5C63]/5 active:scale-[0.97]"
              >
                {t('welcome.login')}
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ── Refined Benefits Section ── */}
        <section className="mb-24">
          <div className="grid sm:grid-cols-3 lg:gap-8 gap-6">
            {[
              {
                icon: Send,
                label: 'welcome.benefit_transfer',
                color: '#0D5C63',
                bgColor: 'bg-[#0D5C63]/10',
                hoverBg: 'hover:bg-[#0D5C63]/15',
                textColor: 'text-[#0D5C63]'
              },
              {
                icon: QrCode,
                label: 'welcome.benefit_qr',
                color: '#14888F',
                bgColor: 'bg-[#14888F]/10',
                hoverBg: 'hover:bg-[#14888F]/15',
                textColor: 'text-[#14888F]'
              },
              {
                icon: Smartphone,
                label: 'welcome.benefit_offline',
                color: '#00D4AA',
                bgColor: 'bg-[#00D4AA]/10',
                hoverBg: 'hover:bg-[#00D4AA]/15',
                textColor: 'text-[#00D4AA]'
              },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="relative bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/5 p-8 text-center hover:shadow-xl hover:shadow-[0_20px_40px-_0D5C63/10] transition-all duration-400 group"
              >
                {/* Subtle animated background */}
                <div className="absolute inset-0 rounded-3xl bg-[${benefit.bgColor}] blur-[8px] -z-0" />
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl mb-5 flex items-center justify-center mx-auto ${benefit.bgColor} ${benefit.hoverBg} transition-all duration-300 group-hover:scale-105`}>
                    <benefit.icon className={`w-6 h-6 ${benefit.textColor} transition-colors duration-300 group-hover:text-white`} />
                  </div>
                  <p className="text-lg font-black text-foreground tracking-tight mb-3">{t(benefit.label).split('|')[0]}</p>
                  <p className="text-sm text-muted-foreground mt-0 leading-relaxed">{t(benefit.label).split('|')[1]}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Enhanced App Preview with Better Layout ── */}
        <section className="mb-24 grid lg:grid-cols-2 lg:gap-12 gap-8 items-start lg:items-center">
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0D5C63] letter-spacing-[1px] mb-2">{t('welcome.preview_label')}</p>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight mb-4">{t('welcome.preview_title')}</h2>
            <p className="text-base text-muted-foreground leading-relaxed">{t('welcome.preview_desc')}</p>
          </div>
          <div className="relative w-full max-w-sm">
            {/* Premium Card with Depth */}
            <div className="rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1A2744] p-8 shadow-2xl shadow-[0_20px_40px-_0D5C63/20]">
              {/* Subtle animated glow */}
              <div className="absolute inset-0 rounded-3xl bg-[radial-gradient ellipse at top_left,rgba(13,92,99,0.1)_0%,transparent_70%] blur-3xl -z-0" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm font-semibold text-white">{t('welcome.wallet')}</span>
                  <Wallet className="w-6 h-6 text-[#00D4AA]" />
                </div>
                <p className="text-xs text-slate-300 mb-2">{t('welcome.available')}</p>
                <p className="text-4xl font-bold text-white tracking-tight mb-6">$ 1 250,00</p>
                <div className="grid grid-cols-2 gap-5 mt-6">
                  <button
                    onClick={() => navigateTo('send')}
                    className="w-full rounded-xl bg-[#00D4AA] py-3.5 text-sm font-bold text-[#0F172A] shadow-md shadow-[#00D4AA]/20 hover:bg-[#00D4AA]/90 transition-all duration-300 active:scale-[0.97]"
                  >
                    {t('action.send')}
                  </button>
                  <button
                    onClick={() => navigateTo('my-qr-code')}
                    className="w-full rounded-xl bg-white/10 backdrop-blur-sm py-3.5 text-sm font-bold text-white hover:bg-white/20 transition-all duration-300 active:scale-[0.97]"
                  >
                    {t('welcome.qr')}
                  </button>
                </div>
                <div className="mt-6 rounded-xl bg-white/5 backdrop-blur-sm p-4 text-xs text-slate-300">
                  {t('welcome.currencies')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Elegant How It Works Section ── */}
        <section className="mb-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight mb-4">{t('welcome.how_title')}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">{t('welcome.how_desc')}</p>
          </div>
          <div className="grid sm:grid-cols-3 lg:gap-8 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                className="relative bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/5 p-8 min-h-[200px] flex flex-col justify-between hover:shadow-xl hover:shadow-[0_20px_40px-_0D5C63/10] transition-all duration-400 group"
              >
                {/* Step number with elegant design */}
                <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-[#0D5C63]/10 flex items-center justify-center text-[${step.num}] font-bold text-[${step.num}] text-[#0D5C63] transition-all duration-300 group-hover:bg-[${step.num}]/20">
                  <span className="text-sm font-bold">{step.num}</span>
                </div>

                {/* Step content */}
                <div className="relative z-10 space-y-4">
                  <div className="w-10 h-10 rounded-full bg-[#0D5C63] flex items-center justify-center mb-4 shadow-md shadow-[0_4px_12px-_0D5C63/20]">
                    <span className="text-white text-sm font-bold">{step.num}</span>
                  </div>
                  <h3 className="text-base font-black text-foreground tracking-tight mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Premium Security Section with Depth ── */}
        <section className="mb-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1A2744] to-[#0F172A] p-8 sm:p-12 overflow-hidden"
          >
            {/* Animated background patterns */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              <div className="absolute top-0 right-0 w-72 h-72 bg-[#0D5C63]/8 rounded-full blur-[100px]" />
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-500/8 rounded-full blur-[80px]" />
            </div>

            <div className="relative z-10 text-center max-w-lg mx-auto">
              {/* Enhanced Security Icon with Depth */}
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-[#00D4AA]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-4">{t('welcome.security_title')}</h2>
              <p className="text-sm text-blue-200/60 leading-relaxed mb-6 max-w-lg">
                {t('welcome.security_desc')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                {[
                  { icon: Lock, label: 'SSL/TLS', desc: 'Chiffrement de bout en bout', color: '#00D4AA' },
                  { icon: Shield, label: 'JWT', desc: 'Authentification sécurisée', color: '#00D4AA' },
                  { icon: CheckCircle, label: '2FA', desc: 'Authentification à deux facteurs', color: '#00D4AA' },
                  { icon: Banknote, label: 'Fonds sécurisés', desc: 'Protection des avoirs garantie', color: '#00D4AA' },
                ].map((sec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.04 }}
                    className="flex items-center gap-3 text-sm text-blue-200/50"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                      <sec.icon className="w-5 h-5 text-[#00D4AA]" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-medium">{sec.label}</span>
                      <p className="text-xs text-blue-200/40">{sec.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Refined Quick Links Section ── */}
        <section className="mb-24">
          <div className="space-y-5">
            <motion.button
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              onClick={() => navigateTo('auth', { mode: 'register', role: 'agent' })}
              className="w-full flex items-center justify-between p-7 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200/60 dark:border-amber-800/30 text-amber-800 dark:text-amber-300 font-semibold text-sm hover:shadow-xl hover:shadow-amber-500/15 transition-all duration-400 cursor-pointer group"
            >
              <span className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <Landmark className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold">{t('welcome.agent')}</p>
                  <p className="text-xs font-normal opacity-70">{t('welcome.agent_desc')}</p>
                </div>
              </span>
              <ChevronRight className="w-6 h-6 group-hover:translate-x-1.2 transition-transform duration-300" />
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              onClick={() => navigateTo('developer-register')}
              className="w-full flex items-center justify-between p-7 rounded-3xl bg-gradient-to-r from-slate-50 to-zinc-50 dark:from-zinc-800/50 dark:to-zinc-900/50 border border-slate-200/60 dark:border-zinc-700/40 text-foreground font-semibold text-sm hover:shadow-xl hover:shadow-slate-500/15 transition-all duration-400 cursor-pointer group"
            >
              <span className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <Code className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="text-left">
                  <p className="font-bold">{t('welcome.developer')}</p>
                  <p className="text-xs font-normal text-muted-foreground">{t('welcome.developer_desc')}</p>
                </div>
              </span>
              <ChevronRight className="w-6 h-6 group-hover:translate-x-1.2 transition-transform duration-300" />
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              onClick={() => navigateTo('support')}
              className="w-full flex items-center justify-between p-7 rounded-3xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 text-muted-foreground font-medium text-sm hover:text-foreground hover:shadow-xl transition-all duration-400 cursor-pointer group"
            >
              <span className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <Headphones className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-foreground">{t('welcome.support')}</p>
                  <p className="text-xs font-normal">{t('welcome.support_msg')}</p>
                </div>
              </span>
              <ChevronRight className="w-6 h-6 group-hover:translate-x-1.2 transition-transform duration-300" />
            </motion.button>
          </div>
        </section>

        {/* ── Enhanced FAQ Section ── */}
        <section className="mb-24">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight mb-3">{t('welcome.faq_title')}</h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {faq.map((f, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  {f.q}
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Premium Download Section ── */}
        {!isStandalone && !isInstalled && (
          <section className="mb-24">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/5 p-8 text-center"
            >
              <h2 className="text-2xl font-black text-foreground tracking-tight mb-4">{t('welcome.download_title')}</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">{t('welcome.download_desc')}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                <button
                  onClick={() => handleInstall('android')}
                  disabled={installing}
                  className="w-full sm:w-auto flex items-center justify-center gap-4 px-7 py-4 rounded-xl bg-[#0D5C63] hover:bg-[#0A4A50] text-white font-semibold text-sm shadow-lg shadow-[#0D5C63]/25 transition-all duration-300 cursor-pointer disabled:opacity-50 group hover:shadow-xl"
                >
                  <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                  <div className="text-left">
                    <p className="text-[10px] font-normal opacity-70">Télécharger sur</p>
                    <p className="text-sm font-bold">Android</p>
                  </div>
                </button>
                <button
                  onClick={() => handleInstall('ios')}
                  className="w-full sm:w-auto flex items-center justify-center gap-4 px-7 py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm shadow-lg transition-all duration-300 cursor-pointer group hover:shadow-xl"
                >
                  <Apple className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                  <div className="text-left">
                    <p className="text-[10px] font-normal opacity-70">Télécharger sur</p>
                    <p className="text-sm font-bold">iOS</p>
                  </div>
                </button>
              </div>
              <a href="/downloads/trait.apk" download="TRAIT.apk" className="inline-flex items-center gap-2 mt-6 text-xs text-[#0D5C63] hover:underline font-medium">
                <Download className="w-3 h-3" />
                Télécharger l'APK directement
              </a>
            </motion.div>
          </section>
        )}

        {/* ── Final CTA Section with Premium Feel ── */}
        <section className="mb-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl bg-gradient-to-br from-[#0D5C63] via-[#0A7B82] to-[#14888F] p-8 sm:p-12 text-center overflow-hidden"
          >
            <div className="absolute inset-0">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/4" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/4" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-104 h-104 bg-white/3 rounded-full blur-[90px]" />
            </div>
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-4">{t('welcome.final_title')}</h2>
              <p className="text-lg text-white/70 max-w-sm mx-auto mb-6 leading-relaxed">
                {t('welcome.final_desc')}
              </p>
              <Button
                onClick={() => navigateTo('auth', { mode: 'register' })}
                className="h-12 px-8 bg-white hover:bg-white/90 text-[#0D5C63] font-bold rounded-xl shadow-xl transition-all duration-300 active:scale-[0.98] group text-sm hover:shadow-2xl"
              >
                {t('welcome.cta_button')}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-300" />
              </Button>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Refined Footer ── */}
      <footer className="border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#0D5C63] to-[#14888F] blur-2x" />
                <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-[#0D5C63] to-[#14888F] flex items-center justify-center">
                  <span className="text-white text-[10px] font-black">T</span>
                </div>
              </div>
              <span className="text-lg font-bold text-foreground">TRAIT</span>
              <span className="text-xs text-muted-foreground">&copy; 2026</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a href="/terms" className="hover:text-foreground transition-colors">Conditions</a>
              <span className="w-px h-3 bg-border" />
              <span>Produit en RDC</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Enhanced Install Modal ── */}
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
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${installPlatform === 'android' ? 'bg-[#0D5C63]' : 'bg-zinc-800'}`}>
                    {installPlatform === 'android' ? <Smartphone className="w-5 h-5 text-white" /> : <Apple className="w-5 h-5 text-white" />}
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    {installPlatform === 'android' ? 'Installer sur Android' : 'Installer sur iOS'}
                  </h3>
                </div>
                <button onClick={() => setShowInstallModal(false)} className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-5">
                {installPlatform === 'android' ? (
                  <>
                    {['Ouvrez Chrome et allez sur trait-rho.vercel.app', 'Appuyez sur le menu ⋮ puis "Ajouter à l\'écran d\'accueil"', 'Confirmez en appuyant sur "Ajouter"', 'TRAIT est maintenant installé !'].map((step, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-full bg-[#0D5C63]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-[#0D5C63]">{index + 1}</span>
                        </div>
                        <p className="text-sm text-foreground">{step}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {['Ouvrez Safari sur votre iPhone', 'Allez sur trait-rho.vercel.app', 'Appuyez sur le bouton Partager puis "Sur l\'écran d\'accueil"', 'TRAIT est maintenant installé !'].map((step, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{index + 1}</span>
                        </div>
                        <p className="text-sm text-foreground">{step}</p>
                      </div>
                    ))}
                  </>
                )}

                <a href="/downloads/trait.apk" download="TRAIT.apk" className="flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-[#0D5C63] hover:bg-[#0A4A50] text-white text-sm font-semibold transition-colors">
                  <Download className="w-4 h-4" />Télécharger l'APK
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}