'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Globe, X, Loader2, Check, Shield } from 'lucide-react';
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
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

const countryCodes = [
  { code: '+228', country: 'Togo' },
  { code: '+229', country: 'Bénin' },
  { code: '+225', country: "Côte d'Ivoire" },
  { code: '+224', country: 'Guinée' },
  { code: '+237', country: 'Cameroun' },
  { code: '+243', country: 'RDC' },
  { code: '+221', country: 'Sénégal' },
  { code: '+223', country: 'Mali' },
  { code: '+226', country: 'Burkina Faso' },
  { code: '+234', country: 'Nigeria' },
  { code: '+233', country: 'Ghana' },
  { code: '+1', country: 'US/CA' },
  { code: '+33', country: 'France' },
];

const countries = [
  'Togo', 'Bénin', "Côte d'Ivoire", 'Sénégal', 'Mali', 'Burkina Faso',
  'Niger', 'Guinée', 'Cameroun', 'RDC', 'Congo', 'Gabon', 'Nigeria',
  'Ghana', 'France', 'US', 'Canada', 'UK',
];

interface GoogleSignupModalProps {
  open: boolean;
  onClose: () => void;
  googleData: {
    email?: string;
    displayName?: string;
    photoURL?: string;
    emailVerified?: boolean;
  };
  idToken: string;
  selectedRole: string;
}

export default function GoogleSignupModal({
  open,
  onClose,
  googleData,
  idToken,
  selectedRole,
}: GoogleSignupModalProps) {
  const { setUser, setToken, navigateTo } = useAppStore();
  const [phoneCountryCode, setPhoneCountryCode] = useState('+243');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidPhone = phone.replace(/\s/g, '').length >= 6;
  const canSubmit = isValidPhone && country;

  async function handleSubmit() {
    if (!canSubmit || loading) return;

    const fullPhone = `${phoneCountryCode}${phone.replace(/\s/g, '')}`;
    setLoading(true);

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          mode: 'register',
          phone: fullPhone,
          country,
          role: selectedRole,
          referralCode: referralCode.trim() || undefined,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('invalid-response');
      }

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || 'Erreur lors de la création du compte');
        return;
      }

      if (data.token) setToken(data.token);
      if (data.user) setUser(data.user);

      toast.success('Compte créé avec Google !');

      const u = data.user;
      if (u) {
        if (!u.hasCompletedOnboarding && u.role !== 'seller') {
          navigateTo('onboarding');
        } else if (u.role === 'agent') {
          navigateTo('agent-pending');
        } else {
          navigateTo('home');
        }
      }
    } catch {
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-background rounded-3xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#0D5C63] to-[#14888F] px-6 pt-7 pb-12 text-center">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/25 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 border border-white/20 overflow-hidden">
                {googleData.photoURL ? (
                  <img
                    src={googleData.photoURL}
                    alt="Google"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>
              <h2 className="text-white text-lg font-bold">
                {googleData.displayName
                  ? `Bonjour ${googleData.displayName.split(' ')[0]} !`
                  : 'Complétez votre profil'}
              </h2>
              <p className="text-white/70 text-xs mt-1">
                Quelques informations pour finaliser votre compte TRAIT
              </p>
            </div>

            {/* Form */}
            <div className="px-6 -mt-6 relative z-10 pb-6 space-y-4">
              {/* Email — prefilled, readonly */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-green-500" />
                  Email (prérempli via Google)
                </Label>
                <Input
                  value={googleData.email || ''}
                  readOnly
                  className="h-11 bg-muted/50 text-muted-foreground border-border/50 cursor-not-allowed"
                />
              </div>

              {/* Name — prefilled if available, readonly */}
              {googleData.displayName && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-green-500" />
                    Nom complet (prérempli via Google)
                  </Label>
                  <Input
                    value={googleData.displayName}
                    readOnly
                    className="h-11 bg-muted/50 text-muted-foreground border-border/50 cursor-not-allowed"
                  />
                </div>
              )}

              {/* Phone — required, NOT from Google */}
              <div className="space-y-1.5">
                <Label htmlFor="g-phone" className="text-xs font-medium text-foreground">
                  Téléphone <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
                    <SelectTrigger className="w-[110px] h-11 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} {c.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="g-phone"
                    type="tel"
                    placeholder="000 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 flex-1"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Google ne fournit pas votre numéro de téléphone
                </p>
              </div>

              {/* Country — required, NOT from Google */}
              <div className="space-y-1.5">
                <Label htmlFor="g-country" className="text-xs font-medium text-foreground">
                  Pays <span className="text-red-500">*</span>
                </Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="g-country" className="h-11">
                    <SelectValue placeholder="Sélectionnez votre pays" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Referral code — optional */}
              <div className="space-y-1.5">
                <Label htmlFor="g-referral" className="text-xs font-medium text-muted-foreground">
                  Code de parrainage (optionnel)
                </Label>
                <Input
                  id="g-referral"
                  placeholder="Entrez le code de votre parrain"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="h-11 font-mono uppercase"
                />
              </div>

              {/* Role badge */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0D5C63]/5 border border-[#0D5C63]/15">
                <Shield className="w-4 h-4 text-[#0D5C63] shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Votre rôle : <span className="font-semibold text-foreground capitalize">{selectedRole}</span>
                  {' '}— votre profil sera lié à votre compte Firebase.
                </p>
              </div>

              {/* No password needed */}
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40">
                <p className="text-xs text-green-700 dark:text-green-400">
                  ✓ Aucun mot de passe requis — vous vous connectez uniquement via Google.
                </p>
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="w-full h-12 bg-[#0D5C63] hover:bg-[#0A4A50] text-white font-bold rounded-xl shadow-lg shadow-[#0D5C63]/25 transition-all active:scale-[0.98] text-sm"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création du compte...
                  </span>
                ) : (
                  'Créer mon compte'
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
