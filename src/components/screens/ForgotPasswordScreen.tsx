'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import Image from 'next/image';

type Step = 'email' | 'otp' | 'password';

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: '', color: 'bg-gray-200', width: 0 };
  let score = 0;
  if (password.length >= 8) score += 40;
  else if (password.length >= 6) score += 25;
  else score += password.length * 3;
  if (/\d/.test(password)) score += 25;
  if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/\\]/.test(password)) score += 35;
  score = Math.min(100, score);
  if (score < 40) return { score, label: 'Faible', color: 'bg-red-500', width: Math.max(4, score) };
  if (score < 70) return { score, label: 'Moyen', color: 'bg-yellow-500', width: score };
  return { score, label: 'Fort', color: 'bg-green-500', width: score };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export default function ForgotPasswordScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const pageParams = useAppStore((s) => s.pageParams) as { email?: string; code?: string };

  const [step, setStep] = useState<Step>('email');

  // Step 1 state
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Step 2 state
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Step 3 state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (pageParams?.email && pageParams?.code) {
      setEmail(pageParams.email);
      setOtp(pageParams.code);
      setStep('password');
    }
  }, [pageParams]);

  // Countdown timer for resend
  useEffect(() => {
    if (step !== 'otp' || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, step]);

  // Auto-submit OTP
  useEffect(() => {
    if (step === 'otp' && otp.length === 6 && !otpLoading) {
      handleVerifyOtp(otp);
    }
  }, [otp, otpLoading, step]);

  // Step 1 — Send email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Veuillez entrer une adresse email valide');
      return;
    }
    setEmailLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Erreur lors de la demande');
        return;
      }
      setStep('otp');
      setCountdown(60);
      toast.success('Code envoyé à votre adresse email');
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setEmailLoading(false);
    }
  };

  // Step 2 — Verify OTP
  const handleVerifyOtp = async (code: string) => {
    if (code.length < 6) return;
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code, mode: 'forgot' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Code invalide');
        return;
      }
      setStep('password');
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (countdown > 0) return;
    setCountdown(60);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Code renvoyé avec succès');
      } else {
        toast.error(data.message || 'Erreur lors du renvoi');
      }
    } catch {
      toast.error('Erreur de connexion');
    }
  }, [countdown, email]);

  // Step 3 — Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || password.trim().length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères');
      return;
    }
    if (password.trim() !== confirmPassword.trim()) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: otp, newPassword: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Erreur lors de la réinitialisation');
        return;
      }
      toast.success('Mot de passe réinitialisé avec succès');
      navigateTo('auth-login');
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setResetLoading(false);
    }
  };

  const strength = getPasswordStrength(password);

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
          onClick={step === 'email' ? goBack : () => setStep('email')}
          className="rounded-full hover:bg-emerald-50 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Button>
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 flex flex-col px-6 pt-2 pb-8"
      >
        {/* TRAIT Logo */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, duration: 0.4 }}
          >
            <div className="relative">
              <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-[#0D5C63]/20 via-blue-400/10 to-[#14888F]/15 blur-lg pointer-events-none" />
              <div className="relative rounded-xl bg-gradient-to-br from-[#0D5C63] to-[#14888F] p-1 shadow-xl shadow-blue-500/25 dark:shadow-blue-900/40">
                <div className="rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden p-1.5">
                  <Image
                    src="/trait-logo.png"
                    alt="TRAIT"
                    width={80}
                    height={80}
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-6 text-center">
          Mot de passe oublié
        </h1>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['email', 'otp', 'password'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step === s
                    ? 'bg-[#0D5C63] text-white'
                    : ['email', 'otp', 'password'].indexOf(step) > i
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {['email', 'otp', 'password'].indexOf(step) > i ? (
                  <Check className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div
                  className={`w-8 h-0.5 rounded ${
                    ['email', 'otp', 'password'].indexOf(step) > i
                      ? 'bg-emerald-500'
                      : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-muted-foreground mb-6">
                Entrez votre adresse email pour recevoir un code de réinitialisation.
              </p>

              <form onSubmit={handleSendEmail} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="forgot-email" className="text-foreground font-medium">
                    Adresse email
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="Ex: user@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-base"
                    autoComplete="email"
                    disabled={emailLoading}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={emailLoading || !email.trim()}
                  className="w-full h-12 text-base font-semibold bg-[#0D5C63] hover:bg-[#083A3E] text-white rounded-xl shadow-lg shadow-blue-900/10 disabled:opacity-50 cursor-pointer"
                >
                  {emailLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer le code'
                  )}
                </Button>
              </form>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex flex-col gap-2 mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Code de vérification
                </h2>
                <p className="text-muted-foreground">
                  Un code a été envoyé à{' '}
                  <span className="font-medium text-foreground">{maskEmail(email)}</span>
                </p>
              </div>

              <div className="flex flex-col items-center gap-6">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                  disabled={otpLoading}
                  className="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-14 w-12 text-xl rounded-lg data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/20" />
                    <InputOTPSlot index={1} className="h-14 w-12 text-xl rounded-lg data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/20" />
                    <InputOTPSlot index={2} className="h-14 w-12 text-xl rounded-lg data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/20" />
                  </InputOTPGroup>
                  <InputOTPSeparator className="mx-2 text-muted-foreground" />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="h-14 w-12 text-xl rounded-lg data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/20" />
                    <InputOTPSlot index={4} className="h-14 w-12 text-xl rounded-lg data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/20" />
                    <InputOTPSlot index={5} className="h-14 w-12 text-xl rounded-lg data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/20" />
                  </InputOTPGroup>
                </InputOTP>

                {otpLoading && (
                  <div className="flex items-center justify-center gap-2 text-emerald-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Vérification...</span>
                  </div>
                )}
              </div>

              <div className="mt-8 flex items-center justify-center">
                {countdown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Renvoyer le code dans{' '}
                    <span className="font-medium text-emerald-600">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={otpLoading}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 underline underline-offset-2 cursor-pointer disabled:opacity-50"
                  >
                    Renvoyer le code
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {step === 'password' && (
            <motion.div
              key="password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex flex-col gap-2 mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Nouveau mot de passe
                </h2>
                <p className="text-muted-foreground">
                  Choisissez un nouveau mot de passe sécurisé.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-password" className="text-foreground font-medium">
                    Mot de passe
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 4 caractères"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-base pr-12"
                      autoComplete="new-password"
                      disabled={resetLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-1.5 space-y-1">
                      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${strength.width}%` }}
                          transition={{ duration: 0.3 }}
                          className={`h-full rounded-full ${strength.color}`}
                        />
                      </div>
                      <p className={`text-[10px] font-medium ${strength.color.replace('bg-', 'text-')}`}>
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-new-password" className="text-foreground font-medium">
                    Confirmer le mot de passe
                  </Label>
                  <Input
                    id="confirm-new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Retapez votre mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-12 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-base"
                    autoComplete="new-password"
                    disabled={resetLoading}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={resetLoading || !password.trim() || !confirmPassword.trim()}
                  className="w-full h-12 text-base font-semibold bg-[#0D5C63] hover:bg-[#083A3E] text-white rounded-xl shadow-lg shadow-blue-900/10 disabled:opacity-50 cursor-pointer mt-2"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Réinitialisation...
                    </>
                  ) : (
                    'Réinitialiser'
                  )}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
}
