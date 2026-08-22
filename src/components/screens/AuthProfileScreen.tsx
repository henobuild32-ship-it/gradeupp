'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Gift, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const countries = [
  { value: 'Togo', label: '🇹🇬 Togo' },
  { value: 'Bénin', label: '🇧🇯 Bénin' },
  { value: "Côte d'Ivoire", label: "🇨🇮 Côte d'Ivoire" },
  { value: 'Sénégal', label: '🇸🇳 Sénégal' },
  { value: 'Mali', label: '🇲🇱 Mali' },
  { value: 'Burkina Faso', label: '🇧🇫 Burkina Faso' },
  { value: 'Niger', label: '🇳🇪 Niger' },
  { value: 'Guinée', label: '🇬🇳 Guinée' },
  { value: 'Cameroun', label: '🇨🇲 Cameroun' },
  { value: 'RDC', label: '🇨🇩 RDC' },
  { value: 'Congo', label: '🇨🇬 Congo' },
  { value: 'Gabon', label: '🇬🇦 Gabon' },
  { value: 'Nigeria', label: '🇳🇬 Nigeria' },
  { value: 'Ghana', label: '🇬🇭 Ghana' },
  { value: 'France', label: '🇫🇷 France' },
  { value: 'US', label: '🇺🇸 États-Unis' },
  { value: 'Canada', label: '🇨🇦 Canada' },
  { value: 'UK', label: '🇬🇧 Royaume-Uni' },
];

export default function AuthProfileScreen() {
  const phoneNumber = useAppStore((s) => s.phoneNumber);
  const registrationPassword = useAppStore((s) => s.registrationPassword);
  const selectedRole = useAppStore((s) => s.selectedRole);
  const setUser = useAppStore((s) => s.setUser);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);

  const isAgent = selectedRole === 'agent';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t('validation.name_required'));
      return;
    }

    if (!pseudo.trim()) {
      toast.error(t('validation.pseudo_required'));
      return;
    }

    if (!country) {
      toast.error(t('validation.country_required'));
      return;
    }

    if (isAgent && !email.trim()) {
      toast.error(t('validation.email_required'));
      return;
    }

    if (!isAgent && !email.trim()) {
      toast.error('Email requis — un code OTP de 6 chiffres sera envoyé pour vérification');
      return;
    }

    if (email.trim() && !email.includes('@')) {
      toast.error('Adresse email invalide — un code OTP de 6 chiffres sera envoyé');
      return;
    }

    if (isAgent && !gender) {
      toast.error(t('validation.gender_required'));
      return;
    }

    if (isAgent && !city.trim()) {
      toast.error(t('validation.city_required'));
      return;
    }

    if (!phoneNumber) {
      toast.error(t('validation.phone_not_found'));
      navigateTo('auth-role');
      return;
    }

    if (!registrationPassword) {
      toast.error(t('validation.password_not_found'));
      navigateTo('auth-phone');
      return;
    }

    setLoading(true);

    try {
      // Create the full account via register API
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          password: registrationPassword,
          role: selectedRole,
          name: name.trim(),
          pseudo: pseudo.trim(),
          country,
          pin: '', // PIN will be set in next step
          email: email.trim() || undefined,
          ...(isAgent && { gender, city: city.trim() }),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || t('validation.create_error'));
        return;
      }

      const user = data.user as User;
      setUser(user);

      // Send OTP via email
      try {
        await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
      } catch {
        // OTP send failed but account is created - continue anyway
      }

      toast.success('Compte créé ! Un code OTP de 6 chiffres a été envoyé à votre email.');
      navigateTo('auth-otp', { email: email.trim(), mode: 'verify' });
    } catch {
      toast.error(t('validation.connection_error'));
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
        <h1 className="text-lg font-bold text-foreground">{t('auth.create_profile')}</h1>
      </motion.header>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 flex flex-col px-6 pt-2 pb-8"
      >
        {/* Info card - different for agents vs clients */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className={isAgent
            ? 'mb-6 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start gap-3'
            : 'mb-6 bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl px-4 py-3.5 flex items-center gap-3'
          }
        >
          <div className={isAgent
            ? 'w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5'
            : 'w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0'
          }>
            {isAgent
              ? <Info className="w-5 h-5 text-amber-600" />
              : <Gift className="w-5 h-5 text-[#0D5C63]" />
            }
          </div>
          {isAgent ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-amber-800 font-semibold">{t('auth.agent_validation_title')}</p>
              <ul className="text-xs text-amber-700 space-y-0.5">
                <li>• {t('auth.agent_validation_1')}</li>
                <li>• {t('auth.agent_validation_2')}</li>
                <li>• {t('auth.agent_validation_3')}</li>
                <li>• {t('auth.agent_validation_4')}</li>
              </ul>
            </div>
          ) : (
            <p className="text-sm text-blue-900 font-medium">
              🎁 <span className="font-bold">10 USD</span> {t('auth.bonus_info')}
            </p>
          )}
        </motion.div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Full Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-foreground font-medium">
              {t('auth.full_name')}
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Ex: Kofi Amegah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12  focus-visible:border-blue-500 focus-visible:ring-blue-500/20 text-base"
              autoComplete="name"
              disabled={loading}
            />
          </div>

          {/* Pseudo */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="pseudo" className="text-foreground font-medium">
              {t('auth.pseudo')}
            </Label>
            <Input
              id="pseudo"
              type="text"
              placeholder="Ex: @kofi_trader"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="h-12  focus-visible:border-blue-500 focus-visible:ring-blue-500/20 text-base"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          {/* Country */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="country" className="text-foreground font-medium">
              {t('auth.country')}
            </Label>
            <Select value={country} onValueChange={setCountry} disabled={loading}>
              <SelectTrigger className="w-full h-12  focus:ring-blue-500/20 text-base">
                <SelectValue placeholder={t('auth.select_country')} />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agent-specific fields */}
          {isAgent && (
            <>
              {/* Email */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  {t('auth.email')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ex: agent@trait.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 text-base"
                  autoComplete="email"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Un code OTP de 6 chiffres sera envoyé à cette adresse</p>
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="gender" className="text-foreground font-medium">
                  {t('auth.gender')}
                </Label>
                <Select value={gender} onValueChange={setGender} disabled={loading}>
                  <SelectTrigger className="w-full h-12 focus:ring-blue-500/20 text-base">
                    <SelectValue placeholder={t('auth.select_gender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('auth.male')}</SelectItem>
                    <SelectItem value="female">{t('auth.female')}</SelectItem>
                    <SelectItem value="other">{t('auth.other_gender')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ville */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="city" className="text-foreground font-medium">
                  {t('auth.city')}
                </Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Ex: Lomé"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-12 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 text-base"
                  autoComplete="address-level2"
                  disabled={loading}
                />
              </div>
            </>
          )}

          {/* Email - mandatory for all users */}
          {!isAgent && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="email-client" className="text-foreground font-medium">
                {t('auth.email')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email-client"
                type="email"
                placeholder="Ex: jean@trait.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 text-base"
                autoComplete="email"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Un code OTP de 6 chiffres sera envoyé à cette adresse pour vérifier votre compte</p>
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            disabled={loading || !name.trim() || !pseudo.trim() || !country || !email.trim() || (isAgent && (!gender || !city.trim()))}
            className="w-full h-12 text-base font-semibold bg-[#0D5C63] hover:bg-[#083A3E] text-white rounded-xl shadow-lg shadow-blue-900/10 disabled:opacity-50 cursor-pointer mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('auth.creating')}
              </>
            ) : (
              t('auth.create_my_account')
            )}
          </Button>
        </form>
      </motion.main>
    </div>
  );
}
