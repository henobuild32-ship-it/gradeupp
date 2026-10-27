'use client';

import { motion } from 'framer-motion';
import {
  Clock,
  ArrowLeft,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';

export default function AgentPendingScreen() {
  const { navigateTo } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border/50"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('welcome')}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Accueil</span>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground leading-tight">
              Inscription Agent
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Demande envoyée
            </p>
          </div>
        </div>
      </motion.header>

      {/* ── Content ────────────────────────────────────────────── */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex-1 flex flex-col items-center justify-center px-6 py-12"
      >
        {/* Status Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3, type: 'spring', stiffness: 200 }}
          className="mb-6"
        >
          <div className="w-24 h-24 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="w-12 h-12 text-amber-500 dark:text-amber-400" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="text-center mb-8"
        >
          <h2 className="text-xl font-bold text-foreground mb-2">
            Demande en cours de validation
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Votre demande de compte Agent TRAIT a été envoyée avec succès. 
            L&apos;administrateur va examiner votre dossier.
          </p>
        </motion.div>

        {/* Steps Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          className="w-full max-w-sm"
        >
          <Card className="border-border">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">
                Processus de validation
              </p>

              <div className="space-y-4">
                {/* Step 1: Done */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Demande envoyée</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Vos informations ont été enregistrées
                    </p>
                  </div>
                </div>

                {/* Step 2: Pending */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Validation admin</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      L&apos;admin examine votre photo, pièces et informations
                    </p>
                  </div>
                </div>

                {/* Step 3: Future */}
                <div className="flex items-start gap-3 opacity-50">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Réception par email</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Code Agent + Mot de passe système envoyés à votre email
                    </p>
                  </div>
                </div>

                {/* Step 4: Future */}
                <div className="flex items-start gap-3 opacity-50">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Compte activé</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Vous pouvez vous connecter et utiliser les services Agent
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="w-full max-w-sm mt-4"
        >
          <Card className="border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1.5">
                ⚠️ Restrictions temporaires
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                Tant que votre compte n&apos;est pas validé par l&apos;administrateur TRAIT :
              </p>
              <ul className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 space-y-1">
                <li>• Impossible de se connecter au tableau de bord Agent</li>
                <li>• Impossible d&apos;effectuer des transactions</li>
                <li>• Impossible d&apos;utiliser les services Agent</li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="w-full max-w-sm mt-6 space-y-3"
        >
          <Button
            onClick={() => navigateTo('auth', { mode: 'login', role: 'agent' })}
            className="w-full h-11 text-sm font-semibold bg-[#0D5C63] hover:bg-[#083A3E] text-white rounded-xl cursor-pointer"
          >
            Se connecter
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigateTo('welcome')}
            className="w-full h-11 text-sm text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
          >
            Retour à l&apos;accueil
          </Button>
        </motion.div>

        {/* TRAIT Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 mb-4"
        >
          <div className="relative">
            <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-[#0D5C63]/20 via-blue-400/10 to-[#14888F]/15 blur-lg pointer-events-none" style={{ animation: 'traitGlow 3s ease-in-out infinite' }} />
            <div className="relative rounded-xl bg-gradient-to-br from-[#0D5C63] to-[#14888F] p-1 shadow-xl shadow-blue-500/25 dark:shadow-blue-900/40">
              <div className="rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden p-1.5">
                <Image
                  src="/trait-logo.png"
                  alt="TRAIT"
                  width={120}
                  height={120}
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.main>
    </div>
  );
}
