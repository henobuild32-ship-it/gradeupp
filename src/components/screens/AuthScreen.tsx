'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Building2, Store, ArrowLeft, Eye, EyeOff, Loader2,
  Shield, Check, LockKeyhole, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import type { User as AppUser } from '@/lib/store';
import { routeAfterAuth } from '@/lib/route-after-auth';
import { markFreshAuth } from '@/lib/session-flag';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import Image from 'next/image';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import GoogleSignupModal from '@/components/auth/GoogleSignupModal';
import { CountrySelect } from '@/components/shared/CountrySelect';
import { getCountry, normalizeInternationalPhone } from '@/lib/countries';

type AuthMode = 'login' | 'register';
type Role = 'client' | 'agent' | 'seller';

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

export default function AuthScreen() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const goBack = useAppStore((s) => s.goBack);
  const setUser = useAppStore((s) => s.setUser);
  const setToken = useAppStore((s) => s.setToken);
  const setPhoneNumber = useAppStore((s) => s.setPhoneNumber);
  const setRegistrationPassword = useAppStore((s) => s.setRegistrationPassword);
  const user = useAppStore((s) => s.user);
  const pageParams = useAppStore((s) => s.pageParams) as { mode?: string; role?: string };
  const { t } = useTranslation();

  const [mode, setMode] = useState<AuthMode>(pageParams?.mode === 'register' ? 'register' : 'login');
  const [selectedRole, setSelectedRole] = useState<Role>(
    pageParams?.role === 'agent' || pageParams?.role === 'seller' || pageParams?.role === 'client'
      ? (pageParams.role as Role)
      : 'client'
  );

  useEffect(() => {
    if (pageParams?.mode === 'register' || pageParams?.mode === 'login') {
      setMode(pageParams.mode);
    }
    if (pageParams?.role === 'agent' || pageParams?.role === 'seller' || pageParams?.role === 'client') {
      setSelectedRole(pageParams.role as Role);
      if (!pageParams?.mode) setMode('register');
    }
  }, [pageParams?.mode, pageParams?.role]);

  // Login fields
  const [loginCountryCode, setLoginCountryCode] = useState('CD');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCountryCode, setRegCountryCode] = useState('CD');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regReferralCode, setRegReferralCode] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Google Auth modal state
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleData, setGoogleData] = useState<any>(null);
  const [googleIdToken, setGoogleIdToken] = useState('');

  // Biometric functionality removed

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = normalizeInternationalPhone(loginPhone, loginCountryCode);
    if (!fullPhone) {
      toast.error(t('validation.phone_required'));
      return;
    }
    if (!loginPassword.trim()) {
      toast.error(t('validation.password_required'));
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, password: loginPassword, role: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.verificationRequired && data.email) {
          setPhoneNumber(fullPhone);
          toast.info('Vérifiez votre adresse email pour terminer la connexion.');
          navigateTo('auth-otp', { email: data.email, mode: 'verify' });
          return;
        }
        if (data.validationStatus === 'pending') {
          toast.error(data.message || 'Compte en attente de validation');
          return;
        }
        if (data.validationStatus === 'rejected') {
          toast.error(data.message || 'Demande refusée');
          return;
        }
        if (data.validationStatus === 'suspended') {
          toast.error(data.message || 'Compte suspendu');
          return;
        }
        toast.error(data.message || t('validation.login_error'));
        return;
      }
      if (data.requiresTwoFactor) {
        if (!data.challengeToken) {
          toast.error('Impossible de lancer la vérification. Recommencez la connexion.');
          return;
        }
        setChallengeToken(data.challengeToken);
        setTwoFactorCode('');
        setLoginPassword('');
        return;
      }
      const loggedInUser = data.user as AppUser;
      if (loggedInUser.role !== selectedRole) {
        const roleLabel = loggedInUser.role === 'agent' ? 'Agent' : loggedInUser.role === 'seller' ? 'Commerçant' : 'Client';
        toast.error(`Ce compte est un compte ${roleLabel}. Veuillez sélectionner le bon rôle.`);
        return;
      }
      setUser(loggedInUser);
      if (data.token) setToken(data.token);
      // Procédure normale : PIN → onboarding → écran selon le rôle
      markFreshAuth();
      routeAfterAuth(navigateTo, loggedInUser);
    } catch {
      toast.error(t('validation.connection_error'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeToken || !/^(?:\d{6}|[A-F0-9]{24})$/i.test(twoFactorCode)) {
      toast.error('Saisissez le code de votre application ou un code de secours.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, code: twoFactorCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.user) {
        toast.error(data.message || 'Code invalide. Réessayez.');
        return;
      }

      const loggedInUser = data.user as AppUser;
      if (loggedInUser.role !== selectedRole) {
        setChallengeToken(null);
        toast.error('Ce compte ne correspond pas au profil sélectionné. Recommencez la connexion.');
        return;
      }
      setUser(loggedInUser);
      if (data.token) setToken(data.token);
      setChallengeToken(null);
      markFreshAuth();
      routeAfterAuth(navigateTo, loggedInUser);
    } catch {
      toast.error(t('validation.connection_error'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === 'seller') {
      navigateTo('seller-register');
      return;
    }
    const fullPhone = normalizeInternationalPhone(regPhone, regCountryCode);
    if (!regName.trim()) {
      toast.error(t('validation.name_required'));
      return;
    }
    if (!regEmail.trim()) {
      toast.error(t('validation.email_required'));
      return;
    }
    if (!fullPhone) {
      toast.error(t('validation.phone_required'));
      return;
    }
    if (!regPassword.trim() || regPassword.length < 8) {
      toast.error(t('validation.password_min'));
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toast.error(t('validation.password_mismatch'));
      return;
    }
    if (!acceptTerms) {
      toast.error('Veuillez accepter les conditions d\'utilisation');
      return;
    }

    const country = regCountryCode;
    setRegisterLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: fullPhone,
          password: regPassword,
          role: selectedRole,
          name: regName.trim(),
          email: regEmail.trim(),
          pseudo: regName.trim().split(' ')[0] || regName.trim(),
          country,
          referralCode: regReferralCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || t('validation.create_error'));
        return;
      }
      setPhoneNumber(fullPhone);
      setRegistrationPassword(regPassword);
      toast.success(selectedRole === 'agent'
        ? 'Compte créé. Vérifiez votre adresse email pour envoyer votre dossier à validation.'
        : 'Compte créé. Vérifiez votre adresse email pour continuer.');
      navigateTo('auth-otp', { email: regEmail.trim(), mode: 'verify' });
    } catch {
      toast.error(t('validation.connection_error'));
    } finally {
      setRegisterLoading(false);
    }
  };


  const strength = getPasswordStrength(regPassword);

  const roleColors = {
    client: { active: 'bg-[#0D5C63] text-white shadow-sm', inactive: 'text-muted-foreground hover:text-foreground' },
    agent: { active: 'bg-amber-500 text-white shadow-sm', inactive: 'text-muted-foreground hover:text-foreground' },
    seller: { active: 'bg-pink-500 text-white shadow-sm', inactive: 'text-muted-foreground hover:text-foreground' },
  } as const;

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#e5f3f1] via-background to-[#f5f7f7]">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center w-full max-w-7xl mx-auto px-4 sm:px-6 py-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateTo('welcome')}
          className="rounded-full hover:bg-blue-50 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Button>
        <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigateTo('admin-login')}
          aria-label="Accès réservé à l’administration"
          title="Accès réservé à l’administration"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-white/70 text-muted-foreground shadow-sm transition hover:bg-white hover:text-[#0D5C63] cursor-pointer"
        >
          <Shield className="h-4 w-4" />
        </button>
        </div>
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] items-center gap-8 lg:gap-14 px-4 sm:px-6 pt-2 pb-8"
      >
        <aside className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden rounded-[2rem] bg-[#073f45] p-10 text-white shadow-2xl shadow-[#073f45]/15 lg:flex">
          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#16878b]/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#d2a65a]/20 blur-3xl" />
          <div className="relative z-10">
            <div className="mb-14 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg">
                <Image src="/trait-mark.png" alt="" width={48} height={34} className="h-9 w-10 object-contain" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-[0.18em]">TRAIT</p>
                <p className="text-xs text-white/65">Votre quotidien, simplifié</p>
              </div>
            </div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85">
              <Sparkles className="h-3.5 w-3.5 text-[#e9c779]" />
              {mode === 'login' ? 'Heureux de vous retrouver' : 'Rejoignez la communauté TRAIT'}
            </div>
            <h2 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight">
              {mode === 'login' ? 'Tout votre quotidien, au même endroit.' : 'Un compte. De nouvelles possibilités.'}
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-white/70">
              {selectedRole === 'agent'
                ? 'Accédez à votre espace agent et accompagnez votre communauté en toute simplicité.'
                : selectedRole === 'seller'
                  ? 'Retrouvez votre espace commerçant pour présenter vos produits et suivre votre activité.'
                  : 'Payez, transférez et retrouvez vos services essentiels dans un espace conçu pour vous.'}
            </p>
          </div>
          <div className="relative z-10 space-y-4 rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm">
            {[
              'Un espace adapté à votre profil',
              'Une vérification supplémentaire si elle est activée',
              'Un accompagnement à chaque étape',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6bc4ae]/15 text-[#8de0c8]"><Check className="h-3.5 w-3.5" /></span>
                {item}
              </div>
            ))}
          </div>
        </aside>

        <section className="w-full max-w-xl mx-auto rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-[#073f45]/10 backdrop-blur-xl dark:border-border dark:bg-card sm:p-8">
        {/* TRAIT Logo */}
        <div className="flex flex-col items-center gap-2 mb-5">
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
                    width={76}
                    height={76}
                    className="h-[68px] w-[68px] object-contain"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-muted rounded-xl">
          <button
            type="button"
            onClick={() => setMode('login')}
            aria-pressed={mode === 'login'}
            disabled={Boolean(challengeToken)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              mode === 'login'
                ? 'bg-[#0D5C63] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('auth.tab_login')}
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            aria-pressed={mode === 'register'}
            disabled={Boolean(challengeToken)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              mode === 'register'
                ? 'bg-[#0D5C63] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('auth.tab_register')}
          </button>
        </div>

        {/* Role Toggle */}
        <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl">
          {(['client', 'agent', 'seller'] as const).map((role) => {
            const Icon = role === 'client' ? User : role === 'agent' ? Building2 : Store;
            const label = role === 'client' ? t('auth.client') : role === 'agent' ? t('auth.agent') : 'Commerçant';
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                aria-pressed={selectedRole === role}
                disabled={Boolean(challengeToken)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 sm:px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                  selectedRole === role ? roleColors[role].active : roleColors[role].inactive
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>
        <p className="-mt-4 mb-6 text-center text-xs text-muted-foreground">
          {selectedRole === 'agent'
            ? 'Espace partenaire · accès après validation de votre dossier'
            : selectedRole === 'seller'
              ? 'Espace commerçant · votre boutique sera vérifiée avant activation'
              : 'Espace personnel · retrouvez vos services TRAIT'}
        </p>

        <AnimatePresence mode="wait">
          {mode === 'login' ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              {challengeToken ? (
                <form onSubmit={handleTwoFactorSubmit} className="flex flex-col gap-5">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0D5C63]/10 text-[#0D5C63]"><LockKeyhole className="h-5 w-5" /></span>
                    <div>
                      <h1 className="text-xl font-bold text-foreground">Vérification en deux étapes</h1>
                      <p className="mt-1 text-sm text-muted-foreground">Saisissez le code de l’application ou l’un de vos codes de secours.</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="login-2fa-code" className="font-medium">Code de vérification</Label>
                    <Input
                      id="login-2fa-code"
                      type="text"
                      inputMode="text"
                      autoComplete="one-time-code"
                      pattern="(?:[0-9]{6}|[A-Fa-f0-9]{24})"
                      maxLength={24}
                      value={twoFactorCode}
                      onChange={(event) => setTwoFactorCode(event.target.value.replace(/[^A-Fa-f0-9]/g, '').slice(0, 24).toUpperCase())}
                      className="h-14 text-center text-2xl tracking-[0.5em]"
                      aria-describedby="login-2fa-help"
                      disabled={loginLoading}
                      autoFocus
                    />
                    <p id="login-2fa-help" className="text-xs text-muted-foreground">Un code de secours ne peut être utilisé qu’une fois.</p>
                  </div>
                  <Button type="submit" disabled={loginLoading || !/^(?:\d{6}|[A-F0-9]{24})$/i.test(twoFactorCode)} className="h-12 w-full rounded-xl bg-[#0D5C63] text-base font-semibold text-white hover:bg-[#083A3E]">
                    {loginLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Vérification…</> : 'Vérifier et continuer'}
                  </Button>
                  <button type="button" onClick={() => { setChallengeToken(null); setTwoFactorCode(''); }} className="self-center text-sm font-semibold text-[#0D5C63] hover:underline">
                    Revenir à la connexion
                  </button>
                </form>
              ) : (
                <>
              <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('auth.welcome_back')}</h1>
                <p className="text-muted-foreground">{t('auth.login_subtitle')}</p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-phone" className="text-foreground font-medium">
                    {t('auth.phone')}
                  </Label>
                  <div className="flex gap-2">
                    <CountrySelect value={loginCountryCode} onValueChange={setLoginCountryCode} className="w-[46%] shrink-0" />
                    <Input
                      id="login-phone"
                      type="tel"
                      placeholder={t('common.phone_placeholder')}
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="flex-1 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 h-12 text-base"
                      autoComplete="tel-national"
                      disabled={loginLoading}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-password" className="text-foreground font-medium">
                    {t('auth.password')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder={t('auth.password_placeholder')}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full h-12 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 text-base pr-12"
                      autoComplete="current-password"
                      disabled={loginLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigateTo('forgot-password')}
                  className="self-end text-xs font-medium text-[#0D5C63] hover:underline cursor-pointer -mt-2"
                >
                  {t('auth.forgot_password')}
                </button>

                <Button
                  type="submit"
                  disabled={loginLoading || !loginPhone.trim() || !loginPassword.trim()}
                  className="w-full h-12 text-base font-semibold bg-[#0D5C63] hover:bg-[#083A3E] text-white rounded-xl shadow-lg shadow-blue-900/10 disabled:opacity-50 cursor-pointer mt-1"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('auth.connecting')}
                    </>
                  ) : (
                    t('auth.login')
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">{t('auth.or')}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Google Login */}
              <GoogleAuthButton
                mode="login"
                selectedRole={selectedRole}
                  onNeedsProfile={(data, idToken) => {
                    if (selectedRole === 'seller') {
                      toast.info('Créez votre espace commerçant avec le formulaire complet.');
                      navigateTo('seller-register');
                      return;
                    }
                    setGoogleData(data);
                    setGoogleIdToken(idToken);
                    setGoogleModalOpen(true);
                  }}
              />
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-2xl font-bold text-foreground">{t('auth.create_account')}</h1>
                <p className="text-muted-foreground">{t('auth.enter_info')}</p>
              </div>

              {/* Agent Info Card */}
              {selectedRole === 'agent' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-amber-800 font-semibold">{t('auth.agent_validation_title')}</p>
                    <ul className="text-xs text-amber-700 space-y-0.5">
                      <li>• {t('auth.agent_validation_1')}</li>
                      <li>• {t('auth.agent_validation_2')}</li>
                      <li>• {t('auth.agent_validation_3')}</li>
                      <li>• {t('auth.agent_validation_4')}</li>
                    </ul>
                  </div>
                </motion.div>
              )}

              {/* Seller → CTA vers l'unique formulaire vendeur */}
              {selectedRole === 'seller' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 bg-gradient-to-r from-pink-50 to-pink-100/50 border border-pink-200 rounded-xl px-4 py-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Store className="w-5 h-5 text-pink-600" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-pink-800 font-semibold">Validation requise</p>
                      <ul className="text-xs text-pink-700 space-y-0.5">
                        <li>• Les comptes commerçant doivent être validés manuellement par les administrateurs.</li>
                        <li>• Après validation, vous pourrez gérer vos produits et recevoir des paiements.</li>
                        <li>• Un seul formulaire complet : identité, commerce, localisation et sécurité.</li>
                      </ul>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => navigateTo('seller-register')}
                    className="mt-4 w-full h-12 text-base font-semibold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl shadow-lg shadow-pink-500/20 cursor-pointer"
                  >
                    Ouvrir le formulaire fournisseur
                  </Button>
                </motion.div>
              )}

              {selectedRole !== 'seller' && (
              <form onSubmit={handleRegister} className="flex flex-col gap-5">
                {/* Name */}
                <div className="flex flex-col gap-2">
                    <Label htmlFor="reg-name" className="text-foreground font-medium">
                    {t('auth.full_name')}
                  </Label>
                  <Input
                    id="reg-name"
                    type="text"
                    required
                    placeholder="Ex: Kofi Amegah"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="h-12 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 text-base"
                    autoComplete="name"
                    disabled={registerLoading}
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reg-email" className="text-foreground font-medium">
                    Adresse email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="Ex: user@email.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="h-12 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 text-base"
                    autoComplete="email"
                    disabled={registerLoading}
                  />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reg-phone" className="text-foreground font-medium">
                    {t('auth.phone')}
                  </Label>
                  <div className="flex gap-2">
                    <CountrySelect value={regCountryCode} onValueChange={setRegCountryCode} className="w-[46%] shrink-0" />
                    <Input
                      id="reg-phone"
                      type="tel"
                      required
                      placeholder={t('common.phone_placeholder')}
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="flex-1 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 h-12 text-base"
                      autoComplete="tel-national"
                      disabled={registerLoading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reg-password" className="text-foreground font-medium">
                    {t('auth.password')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder={t('auth.password_min')}
                      minLength={8}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full h-12 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 text-base pr-12"
                      autoComplete="new-password"
                      disabled={registerLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      aria-label={showRegPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password Strength Indicator */}
                  {regPassword && (
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

                {/* Confirm Password */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reg-confirm-password" className="text-foreground font-medium">
                    {t('auth.confirm_password')}
                  </Label>
                  <Input
                    id="reg-confirm-password"
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder={t('auth.confirm_placeholder')}
                    minLength={8}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full h-12 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 text-base"
                    autoComplete="new-password"
                    disabled={registerLoading}
                  />
                </div>

                {/* Referral Code (Optional) */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reg-referral-code" className="text-foreground font-medium">
                    Code de parrainage (Optionnel)
                  </Label>
                  <Input
                    id="reg-referral-code"
                    type="text"
                    placeholder="Entrez le code de votre parrain"
                    value={regReferralCode}
                    onChange={(e) => setRegReferralCode(e.target.value.toUpperCase())}
                    className="w-full h-12 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 text-base font-mono uppercase"
                    disabled={registerLoading}
                  />
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start gap-3 mt-1 p-3 bg-[#eff7f5] dark:bg-[#0D5C63]/10 border border-[#0D5C63]/15 rounded-xl">
                  <input
                    id="accept-terms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#0D5C63]"
                  />
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-foreground font-medium">
                      <label htmlFor="accept-terms" className="cursor-pointer">J&apos;accepte les </label>
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#0D5C63] hover:underline font-semibold">Conditions Générales d&apos;Utilisation</a>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      En cochant cette case, vous reconnaissez avoir lu et accepté nos conditions.
                    </p>
                  </div>
                </div>

                {/* Register Button */}
                <Button
                  type="submit"
                  disabled={
                    registerLoading ||
                    !regName.trim() ||
                    !regEmail.trim() ||
                    !regPhone.trim() ||
                    regPassword.length < 8 ||
                    !regConfirmPassword.trim() ||
                    !acceptTerms
                  }
                  className="w-full h-12 text-base font-semibold bg-[#0D5C63] hover:bg-[#083A3E] text-white rounded-xl shadow-lg shadow-blue-900/10 disabled:opacity-50 cursor-pointer mt-2"
                >
                  {registerLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('auth.creating')}
                    </>
                  ) : (
                    t('auth.create_my_account')
                  )}
                </Button>
              </form>
              )}

              {/* Divider */}
              {selectedRole !== 'seller' && <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">{t('auth.or')}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Google Register */}
              <GoogleAuthButton
                mode="register"
                selectedRole={selectedRole}
                onNeedsProfile={(data, idToken) => {
                  setGoogleData(data);
                  setGoogleIdToken(idToken);
                  setGoogleModalOpen(true);
                }}
              />
              </>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Links */}
        <div className="mt-auto pt-6 flex flex-col items-center gap-2">
          {mode === 'login' && (
            <p className="text-sm text-muted-foreground">
              {t('auth.no_account')}{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-semibold text-[#0D5C63] hover:underline underline-offset-2 cursor-pointer"
              >
                {t('auth.create_account')}
              </button>
            </p>
          )}
          <p className="text-xs text-muted-foreground text-center max-w-xs">{t('common.terms')}</p>
        </div>
        </section>
      </motion.main>

      {/* Biometric scanner dialog removed */}

      {/* Google Signup Completion Modal */}
      <GoogleSignupModal
        open={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        googleData={googleData || {}}
        idToken={googleIdToken}
        selectedRole={selectedRole}
      />
    </div>
  );
}
