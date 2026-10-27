'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, User, Building2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import Image from 'next/image';

export default function AuthRoleScreen() {
  const { navigateTo, setSelectedRole, selectedRole } = useAppStore();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center px-4 py-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateTo('welcome')}
          className="rounded-full hover:bg-blue-50 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Button>
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 flex flex-col px-6 pt-4 pb-8"
      >
        {/* TRAIT Logo - WhatsApp style */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, duration: 0.4 }}
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
          <h1 className="text-2xl font-bold text-foreground">{t('auth.welcome')}</h1>
          <p className="text-muted-foreground text-center">{t('auth.choose_role')}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Client option */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedRole === 'client'
                  ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-200'
                  : ' hover:border-blue-200'
              }`}
              onClick={() => setSelectedRole('client')}
            >
              <CardContent className="p-6 flex flex-col items-center gap-3">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  selectedRole === 'client'
                    ? 'bg-[#0D5C63] text-white'
                    : 'bg-blue-100 text-[#0D5C63]'
                }`}>
                  <User className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">{t('auth.client')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('auth.client_desc')}
                  </p>
                </div>
                {selectedRole === 'client' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 rounded-full bg-[#0D5C63] flex items-center justify-center"
                  >
                    <span className="text-white text-xs font-bold">✓</span>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Agent option */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedRole === 'agent'
                  ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-200'
                  : ' hover:border-amber-200'
              }`}
              onClick={() => setSelectedRole('agent')}
            >
              <CardContent className="p-6 flex flex-col items-center gap-3">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  selectedRole === 'agent'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-100 text-amber-600'
                }`}>
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">{t('auth.agent')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('auth.agent_desc')}
                  </p>
                </div>
                {selectedRole === 'agent' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center"
                  >
                    <span className="text-white text-xs font-bold">✓</span>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          {/* Seller option */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedRole === 'seller'
                  ? 'border-pink-500 bg-pink-50/50 shadow-md ring-2 ring-pink-200'
                  : 'hover:border-pink-200'
              }`}
              onClick={() => setSelectedRole('seller')}
            >
              <CardContent className="p-6 flex flex-col items-center gap-3">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  selectedRole === 'seller' ? 'bg-pink-500 text-white' : 'bg-pink-100 text-pink-600'
                }`}>
                  <Store className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">Commerçant</h3>
                  <p className="text-sm text-muted-foreground mt-1">Présentez votre boutique et suivez vos ventes après validation.</p>
                </div>
                {selectedRole === 'seller' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Button
            onClick={() => navigateTo('auth', { mode: 'register', role: selectedRole })}
            className="w-full h-13 text-base font-semibold bg-[#0D5C63] hover:bg-[#083A3E] text-white rounded-xl shadow-lg shadow-blue-900/10 cursor-pointer"
            size="lg"
          >
            {t('auth.continue')}
          </Button>
        </motion.div>

        {/* Login link */}
        <div className="mt-4 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {t('auth.already_account')}{' '}
            <button
              onClick={() => navigateTo('auth', { mode: 'login', role: selectedRole })}
              className="font-semibold text-[#0D5C63] hover:text-blue-900 underline underline-offset-2 cursor-pointer"
            >
              {t('auth.login_link')}
            </button>
          </p>
        </div>
      </motion.main>
    </div>
  );
}
