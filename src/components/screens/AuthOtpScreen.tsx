'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import { useAppStore, type User } from '@/lib/store';
import { toast } from 'sonner';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length < 5) return cleaned;
  const prefix = cleaned.slice(0, cleaned.length - 2);
  const suffix = cleaned.slice(-2);
  const maskedBody = prefix.slice(3).replace(/\d/g, '*');
  return cleaned.slice(0, 3) + maskedBody + suffix;
}

export default function AuthOtpScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setUser = useAppStore((s) => s.setUser);
  const setToken = useAppStore((s) => s.setToken);
  const setOtpCode = useAppStore((s) => s.setOtpCode);
  const setOtpVerified = useAppStore((s) => s.setOtpVerified);
  const phoneNumber = useAppStore((s) => s.phoneNumber);
  const user = useAppStore((s) => s.user);
  const pageParams = useAppStore((s) => s.pageParams) as { email?: string; mode?: 'verify' | 'forgot' };

  const email = pageParams?.email || user?.email || '';
  const mode = pageParams?.mode || 'verify';
  const hasEmail = !!email;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [countdown, setCountdown] = useState(60);

  // Send OTP on mount
  useEffect(() => {
    const sendOtp = async () => {
      setSendLoading(true);
      try {
        const body = hasEmail ? { email } : { phone: phoneNumber };
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.demoOtp) {
          setDemoOtp(data.demoOtp);
        }
        if (!data.success) {
          toast.error(data.message || "Erreur d'envoi du code");
        }
      } catch {
        toast.error('Erreur de connexion');
      } finally {
        setSendLoading(false);
      }
    };
    sendOtp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = useCallback(async () => {
    if (countdown > 0) return;
    setCountdown(60);
    try {
      const body = hasEmail ? { email } : { phone: phoneNumber };
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
  }, [countdown, email, hasEmail, phoneNumber]);

  const handleVerify = useCallback(async (code: string) => {
    if (code.length < 6) return;
    setLoading(true);
    try {
      const body = hasEmail
        ? { email, code }
        : { phone: phoneNumber, code };
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Code invalide');
        return;
      }
      setOtpCode(code);

      if (mode === 'forgot') {
        setOtpVerified(true);
        navigateTo('reset-password', { email, code });
        return;
      }

      setOtpVerified(true);

      if (!data.user) {
        navigateTo('auth-profile');
        return;
      }
      const loggedInUser = data.user as User;
      setUser(loggedInUser);
      if (data.token) setToken(data.token);

      // New users go through pin-setup → onboarding → home
      if (!loggedInUser.hasCompletedOnboarding) {
        navigateTo('pin-setup');
      } else {
        navigateTo('home');
      }
    } catch {
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, [email, hasEmail, mode, navigateTo, phoneNumber, setOtpCode, setOtpVerified, setUser]);

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleVerify(otp);
    }
  }, [otp, loading, handleVerify]);

  const displayInfo = hasEmail
    ? maskEmail(email)
    : maskPhone(phoneNumber || '*** ******');

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
          onClick={goBack}
          className="rounded-full hover:bg-emerald-50 cursor-pointer"
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
        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              {hasEmail ? <Mail className="w-5 h-5 text-emerald-600" /> : <Phone className="w-5 h-5 text-emerald-600" />}
            </div>
            <h1 className="text-2xl font-bold text-foreground">Vérification</h1>
          </div>
          <p className="text-muted-foreground">
            {sendLoading ? (
              "Envoi du code en cours..."
            ) : (
              <>
                Entrez le code envoyé à{' '}
                <span className="font-medium text-foreground">{displayInfo}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-6">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => setOtp(value)}
              disabled={loading || sendLoading}
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
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Vérification...</span>
            </div>
          )}

          {demoOtp && !loading && otp.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 text-center">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">
                Code de test (non envoyé par email)
              </p>
              <p className="text-2xl font-mono font-bold text-amber-800 dark:text-amber-300 tracking-widest">
                {demoOtp}
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1">
                Ce code s&apos;affiche car l&apos;envoi par email a échoué. Utilisez-le pour continuer.
              </p>
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
              disabled={loading}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 underline underline-offset-2 cursor-pointer disabled:opacity-50"
            >
              Renvoyer le code
            </button>
          )}
        </div>
      </motion.main>
    </div>
  );
}
