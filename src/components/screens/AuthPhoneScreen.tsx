'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

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
  { code: '+44', label: '+44', country: 'UK' },
];

export default function AuthPhoneScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setPhoneNumber = useAppStore((s) => s.setPhoneNumber);
  const setRegistrationPassword = useAppStore((s) => s.setRegistrationPassword);
  const selectedRole = useAppStore((s) => s.selectedRole);
  const { t } = useTranslation();

  const [countryCode, setCountryCode] = useState('+228');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const roleLabel = selectedRole === 'client' ? t('auth.registration_client') : t('auth.registration_agent');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedPhone = phone.replace(/\s/g, '');
    if (!cleanedPhone || cleanedPhone.length < 6) {
      toast.error(t('validation.phone_required'));
      return;
    }

    if (!password.trim() || password.trim().length < 4) {
      toast.error(t('validation.password_min'));
      return;
    }

    if (password.trim() !== confirmPassword.trim()) {
      toast.error(t('validation.password_mismatch'));
      return;
    }

    const fullPhone = `${countryCode}${cleanedPhone}`;
    setLoading(true);

    try {
      // Check if phone is already registered
      const checkRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, password: password.trim() }),
      });

      const checkData = await checkRes.json();

      if (checkData.success) {
        toast.error(t('validation.already_registered'));
        setLoading(false);
        return;
      }

      // Phone not registered — proceed to profile setup
      setPhoneNumber(fullPhone);
      setRegistrationPassword(password.trim());
      navigateTo('auth-profile');
    } catch {
      // If check fails, proceed anyway (network issue, etc.)
      setPhoneNumber(fullPhone);
      setRegistrationPassword(password.trim());
      navigateTo('auth-profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
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
          className="rounded-full hover:bg-blue-50 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Button>
      </motion.header>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 flex flex-col px-6 pt-4 pb-8"
      >
        {/* Role badge */}
        <div className="flex justify-center mb-6">
          <Badge
            variant="outline"
            className={selectedRole === 'agent'
              ? 'px-4 py-1.5 text-sm font-semibold border-amber-200 bg-amber-50 text-amber-700 cursor-pointer'
              : 'px-4 py-1.5 text-sm font-semibold border-blue-200 bg-blue-50 text-[#0D5C63] cursor-pointer'
            }
            onClick={() => navigateTo('auth-role')}
          >
            {roleLabel}
            <span className="ml-1.5 text-xs opacity-60">✏️</span>
          </Badge>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('auth.create_account')}</h1>
          <p className="text-muted-foreground">{t('auth.enter_info')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Un code OTP de 6 chiffres sera envoyé à votre adresse email pour vérifier votre compte.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Phone */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="reg-phone" className="text-foreground font-medium">
              {t('auth.phone')}
            </Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-[100px] shrink-0 ">
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1  focus-visible:border-blue-500 focus-visible:ring-blue-500/20 h-12 text-base"
                autoComplete="tel"
                disabled={loading}
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
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.password_min')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12  focus-visible:border-blue-500 focus-visible:ring-blue-500/20 text-base pr-12"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="reg-confirm-password" className="text-foreground font-medium">
              {t('auth.confirm_password')}
            </Label>
            <Input
              id="reg-confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.confirm_placeholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-12  focus-visible:border-blue-500 focus-visible:ring-blue-500/20 text-base"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading || !phone.trim() || !password.trim() || !confirmPassword.trim()}
            className="w-full h-12 text-base font-semibold bg-[#0D5C63] hover:bg-[#083A3E] text-white rounded-xl shadow-lg shadow-blue-900/10 disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('auth.verifying')}
              </>
            ) : (
              t('auth.continue')
            )}
          </Button>
        </form>

        {/* Login link */}
        <div className="mt-6 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {t('auth.already_account')}{' '}
            <button
              onClick={() => navigateTo('auth-login')}
              className="font-semibold text-[#0D5C63] hover:text-blue-900 underline underline-offset-2 cursor-pointer"
            >
              {t('auth.login_link')}
            </button>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center">
            {t('auth.terms')}
          </p>
        </div>
      </motion.main>
    </div>
  );
}
