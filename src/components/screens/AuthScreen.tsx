'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Building2, Store, ArrowLeft, Eye, EyeOff, Loader2,
  Shield, Check
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
import { useAppStore, type User } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import Image from 'next/image';

const countryCodes = [
  { code: '+228', label: '+228', country: 'Togo' },
  { code: '+229', label: '+229', country: 'Bénin' },
  { code: '+225', label: '+225', country: "Côte d'Ivoire" },
  { code: '+224', label: '+224', country: 'Guinée' },
  { code: '+237', label: '+237', country: 'Cameroun' },
  { code: '+243', label: '+243', country: 'RDC' },
  { code: '+221', label: '+221', country: 'Sénégal' },
  { code: '+223', label: '+223', country: 'Mali' },
  { code: '+226', label: '+226', country: 'Burkina Faso' },
  { code: '+234', label: '+234', country: 'Nigeria' },
  { code: '+233', label: '+233', country: 'Ghana' },
  { code: '+1', label: '+1', country: 'US/CA' },
  { code: '+33', label: '+33', country: 'France' },
];

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
  const { t } = useTranslation();

  const [mode, setMode] = useState<AuthMode>('login');
  const [selectedRole, setSelectedRole] = useState<Role>('client');

  // Login fields
  const [loginCountryCode, setLoginCountryCode] = useState('+228');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCountryCode, setRegCountryCode] = useState('+228');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regReferralCode, setRegReferralCode] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Biometric functionality removed

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPhone = loginPhone.replace(/\s/g, '');
    if (!cleanedPhone || cleanedPhone.length < 6) {
      toast.error(t('validation.phone_required'));
      return;
    }
    if (!loginPassword.trim()) {
      toast.error(t('validation.password_required'));
      return;
    }
    const fullPhone = `${loginCountryCode}${cleanedPhone}`;
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, password: loginPassword.trim(), role: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
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
      const loggedInUser = data.user as User;
      if (loggedInUser.role !== selectedRole) {
        const roleLabel = loggedInUser.role === 'agent' ? 'Agent' : loggedInUser.role === 'seller' ? 'Service' : 'Client';
        toast.error(`Ce compte est un compte ${roleLabel}. Veuillez sélectionner le bon rôle.`);
        return;
      }
      setUser(loggedInUser);
      if (data.token) setToken(data.token);
      if (!loggedInUser.hasCompletedOnboarding && loggedInUser.role !== 'seller') {
        navigateTo('onboarding');
      } else if (loggedInUser.role === 'agent') {
        navigateTo('agent-dashboard');
      } else if (loggedInUser.role === 'seller') {
        if (loggedInUser.validationStatus !== 'validated' || loggedInUser.suspended) {
          navigateTo('seller-pending');
        } else {
          navigateTo('seller-dashboard');
        }
      } else {
        navigateTo('home');
      }
    } catch {
      toast.error(t('validation.connection_error'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPhone = regPhone.replace(/\s/g, '');
    if (!regName.trim()) {
      toast.error(t('validation.name_required'));
      return;
    }
    if (!regEmail.trim()) {
      toast.error(t('validation.email_required'));
      return;
    }
    if (!cleanedPhone || cleanedPhone.length < 6) {
      toast.error(t('validation.phone_required'));
      return;
    }
    if (!regPassword.trim() || regPassword.trim().length < 4) {
      toast.error(t('validation.password_min'));
      return;
    }
    if (regPassword.trim() !== regConfirmPassword.trim()) {
      toast.error(t('validation.password_mismatch'));
      return;
    }
    if (!acceptTerms) {
      toast.error('Veuillez accepter les conditions d\'utilisation');
      return;
    }

    // Seller → redirect to dedicated form
    if (selectedRole === 'seller') {
      toast.success('Complétez le formulaire fournisseur ci-dessous.');
      navigateTo('seller-register');
      return;
    }

    const fullPhone = `${regCountryCode}${cleanedPhone}`;
    setRegisterLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: fullPhone,
          password: regPassword.trim(),
          role: selectedRole,
          name: regName.trim(),
          email: regEmail.trim(),
          pseudo: regName.trim().split(' ')[0] || regName.trim(),
          referralCode: regReferralCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || t('validation.create_error'));
        return;
      }
      setPhoneNumber(fullPhone);
      setRegistrationPassword(regPassword.trim());
      if (selectedRole === 'agent') {
        toast.success('Compte Agent créé avec succès ! En attente de validation par l\'administrateur.');
        navigateTo('agent-pending');
      } else {
        toast.success('Compte créé avec succès ! Vérifiez votre code OTP.');
        navigateTo('auth-otp');
      }
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
        <button
          type="button"
          onClick={() => navigateTo('admin-login')}
          className="ml-auto w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Administration"
        >
          <span className="text-xs font-bold text-muted-foreground/60">$</span>
        </button>
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 flex flex-col px-6 pt-2 pb-8 overflow-y-auto"
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
                    width={100}
                    height={100}
                    className="object-contain"
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
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              mode === 'login'
                ? 'bg-[#0D5C63] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              mode === 'register'
                ? 'bg-[#0D5C63] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Inscription
          </button>
        </div>

        {/* Role Toggle */}
        <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl">
          {(['client', 'agent', 'seller'] as const).map((role) => {
            const Icon = role === 'client' ? User : role === 'agent' ? Building2 : Store;
            const label = role === 'client' ? t('auth.client') : role === 'agent' ? t('auth.agent') : 'Service';
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  selectedRole === role ? roleColors[role].active : roleColors[role].inactive
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {mode === 'login' ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-2xl font-bold text-foreground">Bon retour</h1>
                <p className="text-muted-foreground">{t('auth.login_subtitle')}</p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-phone" className="text-foreground font-medium">
                    {t('auth.phone')}
                  </Label>
                  <div className="flex gap-2">
                    <Select value={loginCountryCode} onValueChange={setLoginCountryCode}>
                      <SelectTrigger className="w-[100px] shrink-0">
                        <SelectValue placeholder={t('common.code')} />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map((item) => (
                          <SelectItem key={item.code + item.country} value={item.code}>
                            <span className="text-xs">{item.code} {item.country}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="login-phone"
                      type="tel"
                      placeholder={t('common.phone_placeholder')}
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="flex-1 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 h-12 text-base"
                      autoComplete="tel"
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
                  Mot de passe oublié ?
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
                    'Se connecter'
                  )}
                </Button>
              </form>
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
                <h1 className="text-2xl font-bold text-foreground">Créer un compte</h1>
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

              {/* Seller Info Card */}
              {selectedRole === 'seller' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 bg-gradient-to-r from-pink-50 to-pink-100/50 border border-pink-200 rounded-xl px-4 py-3.5 flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Store className="w-5 h-5 text-pink-600" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-pink-800 font-semibold">Validation requise</p>
                    <ul className="text-xs text-pink-700 space-y-0.5">
                      <li>• Les comptes Service doivent être validés manuellement par les administrateurs.</li>
                      <li>• Après validation, vous pourrez gérer vos produits et recevoir des paiements.</li>
                    </ul>
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleRegister} className="flex flex-col gap-5">
                {/* Name */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reg-name" className="text-foreground font-medium">
                    {t('auth.full_name')}
                  </Label>
                  <Input
                    id="reg-name"
                    type="text"
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
                    <Select value={regCountryCode} onValueChange={setRegCountryCode}>
                      <SelectTrigger className="w-[100px] shrink-0">
                        <SelectValue placeholder={t('common.code')} />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map((item) => (
                          <SelectItem key={item.code + item.country} value={item.code}>
                            <span className="text-xs">{item.code} {item.country}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="reg-phone"
                      type="tel"
                      placeholder={t('common.phone_placeholder')}
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="flex-1 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 h-12 text-base"
                      autoComplete="tel"
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
                <div className="flex items-start gap-3 mt-1 p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/30 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAcceptTerms(!acceptTerms)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                      acceptTerms
                        ? 'bg-[#0D5C63] border-[#0D5C63]'
                        : 'border-gray-300 hover:border-[#0D5C63]/50'
                    }`}
                    aria-label="Accepter les conditions d'utilisation"
                  >
                    {acceptTerms && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-foreground font-medium">
                      J&apos;accepte les{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          window.open('/terms', '_blank')
                        }}
                        className="text-[#0D5C63] hover:underline font-semibold cursor-pointer"
                      >
                        Conditions Générales d&apos;Utilisation
                      </button>
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
                    !regPassword.trim() ||
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
                    'Créer mon compte'
                  )}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Links */}
        <div className="mt-auto pt-6 flex flex-col items-center gap-2">
          {mode === 'login' && (
            <p className="text-sm text-muted-foreground">
              Pas de compte ?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-semibold text-[#0D5C63] hover:underline underline-offset-2 cursor-pointer"
              >
                Créer un compte
              </button>
            </p>
          )}
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Conditions d'utilisation
          </p>
        </div>
      </motion.main>

      {/* Biometric scanner dialog removed */}
    </div>
  );
}
