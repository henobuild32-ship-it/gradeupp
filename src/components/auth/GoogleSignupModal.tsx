'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Globe, X, Loader2, Check, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { routeAfterAuth } from '@/lib/route-after-auth';
import { markFreshAuth } from '@/lib/session-flag';
import { toast } from 'sonner';
import { CountrySelect } from '@/components/shared/CountrySelect';
import { normalizeInternationalPhone } from '@/lib/countries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const sellerBusinessTypes = [
  ['vetements', 'Vêtements & mode'], ['electronique', 'Électronique'],
  ['alimentation', 'Alimentation & épicerie'], ['services', 'Services'],
  ['artisanat', 'Artisanat & création'], ['agriculture', 'Agriculture'],
  ['immobilier', 'Immobilier'], ['transport', 'Transport & livraison'],
  ['sante', 'Santé & bien-être'], ['education', 'Éducation & formation'],
  ['restauration', 'Restauration'], ['technologie', 'Technologie & IT'], ['autre', 'Autre'],
] as const;

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
  const [phoneCountryCode, setPhoneCountryCode] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [fullName, setFullName] = useState(googleData.displayName || '');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setFullName(googleData.displayName?.trim() || '');
  }, [open, googleData.displayName]);

  const isValidPhone = normalizeInternationalPhone(phone, phoneCountryCode) !== null;
  const isSeller = selectedRole === 'seller';
  const canSubmit = Boolean(
    isValidPhone && country && fullName.trim() && acceptedTerms &&
    (!isSeller || (city.trim() && businessName.trim() && businessType && location.trim()))
  );

  async function handleSubmit() {
    if (!canSubmit || loading) return;

    const fullPhone = normalizeInternationalPhone(phone, phoneCountryCode);
    if (!fullPhone) return;
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
          name: fullName.trim(),
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          businessName: businessName.trim() || undefined,
          businessType: businessType || undefined,
          location: location.trim() || undefined,
          acceptedTerms,
          referralCode: referralCode.trim() || undefined,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('invalid-response');
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || 'Erreur lors de la création du compte');
        return;
      }

      if (data.token) setToken(data.token);
      if (data.user) setUser(data.user);

      toast.success(isSeller ? 'Demande commerçant envoyée pour validation.' : 'Compte créé avec Google !');

      const u = data.user;
      if (u) {
        // Procédure normale : PIN → onboarding → écran selon le rôle
        markFreshAuth();
        routeAfterAuth(navigateTo, u);
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
              <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    Nom complet <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    maxLength={100}
                    autoComplete="name"
                    placeholder="Prénom et nom"
                    className="h-11"
                  />
                </div>

              {/* Phone — required, NOT from Google */}
              <div className="space-y-1.5">
                <Label htmlFor="g-phone" className="text-xs font-medium text-foreground">
                  Téléphone <span className="text-red-500">*</span>
                </Label>
                <div className="space-y-2">
                  <CountrySelect value={phoneCountryCode} onValueChange={setPhoneCountryCode} />
                  <Input
                    id="g-phone"
                    type="tel"
                    placeholder="000 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Google ne fournit pas votre numéro de téléphone
                </p>
              </div>

              {isSeller && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-foreground">Informations du commerce</p>
                  <Input value={businessName} onChange={(event) => setBusinessName(event.target.value)} maxLength={120} placeholder="Nom du commerce *" autoComplete="organization" className="h-11" />
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Type de commerce *" /></SelectTrigger>
                    <SelectContent>{sellerBusinessTypes.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} placeholder="Ville *" autoComplete="address-level2" className="h-11" />
                  <Input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={200} placeholder="Marché, quartier ou localisation *" className="h-11" />
                  <Input value={address} onChange={(event) => setAddress(event.target.value)} maxLength={200} placeholder="Adresse complète (facultatif)" autoComplete="street-address" className="h-11" />
                </div>
              )}

              {/* Country — required, NOT from Google */}
              <div className="space-y-1.5">
                <Label htmlFor="g-country" className="text-xs font-medium text-foreground">
                  Pays <span className="text-red-500">*</span>
                </Label>
                <CountrySelect value={country} onValueChange={setCountry} placeholder="Sélectionnez votre pays" />
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

              <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-xs text-muted-foreground">
                <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0D5C63]" />
                <span>J’accepte les <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0D5C63] underline">conditions d’utilisation</a> et la politique de confidentialité.</span>
              </label>

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
