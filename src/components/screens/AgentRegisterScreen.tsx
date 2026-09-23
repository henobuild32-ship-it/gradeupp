'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Globe,
  Camera,
  X,
  Shield,
  Check,
  Info,
  Upload,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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

const countries = [
  { value: 'CD', label: '🇨🇩 RD Congo' },
  { value: 'CG', label: '🇨🇬 Congo' },
  { value: 'CM', label: '🇨🇲 Cameroun' },
  { value: 'TG', label: '🇹🇬 Togo' },
  { value: 'BJ', label: '🇧🇯 Bénin' },
  { value: 'CI', label: "🇨🇮 Côte d'Ivoire" },
  { value: 'SN', label: '🇸🇳 Sénégal' },
  { value: 'ML', label: '🇲🇱 Mali' },
  { value: 'BF', label: '🇧🇫 Burkina Faso' },
  { value: 'GN', label: '🇬🇳 Guinée' },
  { value: 'NG', label: '🇳🇬 Nigeria' },
  { value: 'GA', label: '🇬🇦 Gabon' },
  { value: 'GH', label: '🇬🇭 Ghana' },
  { value: 'FR', label: '🇫🇷 France' },
  { value: 'US', label: '🇺🇸 États-Unis' },
  { value: 'CA', label: '🇨🇦 Canada' },
  { value: 'GB', label: '🇬🇧 Royaume-Uni' },
];

const cities = [
  'Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kananga', 'Kisangani',
  'Goma', 'Bukavu', 'Tshikapa', 'Matadi', 'Mbandaka',
  'Brazzaville', 'Pointe-Noire', 'Douala', 'Yaoundé',
  'Lomé', 'Cotonou', 'Abidjan', 'Dakar', 'Bamako',
  'Ouagadougou', 'Conakry', 'Lagos', 'Libreville', 'Accra',
];

// ─── Animation Variants ──────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

// ─── Component ──────────────────────────────────────────────────

export default function AgentRegisterScreen() {
  const { goBack, setUser, navigateTo } = useAppStore();
  const { t } = useTranslation();

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = info, 2 = password + photo

  // ─── Phone Formatting ────────────────────────────────────────

  const handlePhoneChange = (value: string) => {
    let cleaned = value.replace(/[^\d+]/g, '');
    // Auto-add +243 prefix if user types without it
    if (cleaned.length > 0 && !cleaned.startsWith('+')) {
      if (cleaned.startsWith('243')) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('0')) {
        cleaned = '+243' + cleaned.substring(1);
      } else if (!cleaned.startsWith('+')) {
        cleaned = '+243' + cleaned;
      }
    }
    setPhone(cleaned);
  };

  // ─── Photo Handling ──────────────────────────────────────────

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image valide');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ─── Photo Upload API ────────────────────────────────────────

  async function uploadPhoto(file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/auth/upload-photo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ─── Step 1 Validation ───────────────────────────────────────

  const isStep1Valid = () => {
    return (
      name.trim().length >= 2 &&
      phone.length >= 12 &&
      email.includes('@') && email.includes('.') &&
      gender !== '' &&
      country !== '' &&
      city.trim() !== '' &&
      address.trim() !== ''
    );
  };

  // ─── Step 2 Validation ───────────────────────────────────────

  const isStep2Valid = () => {
    return (
      password.length >= 6 &&
      confirmPassword === password
    );
  };

  // ─── Submit ──────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isStep1Valid() || !isStep2Valid()) {
      toast.error('Veuillez remplir tous les champs correctement');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      // Upload photo if present
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      }

      // Register agent
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          password: password,
          role: 'agent',
          name: name.trim(),
          pseudo: name.trim().toLowerCase().replace(/\s+/g, '_'),
          country,
          email: email.trim(),
          gender,
          city: city.trim(),
          address: address.trim(),
          photoId: photoUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || 'Erreur lors de l\'inscription');
        return;
      }

      const user = data.user;
      setUser(user);
      toast.success('Demande d\'inscription envoyée avec succès !');

      // Navigate to pending screen
      navigateTo('agent-pending', { user });
    } catch {
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border/50"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Retour</span>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground leading-tight">
              Inscription Agent
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Étape {step} sur 2
            </p>
          </div>
          <div className="flex items-center gap-1">
            <div className={`h-2 w-8 rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-[#0D5C63]' : 'bg-muted'}`} />
            <div className={`h-2 w-8 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-[#0D5C63]' : 'bg-muted'}`} />
          </div>
        </div>
      </motion.header>

      {/* ── Content ────────────────────────────────────────────── */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 px-4 pt-4 pb-8"
      >
        {/* Info Banner */}
        <motion.div variants={itemVariants} className="mb-5">
          <Card className="border-amber-200 dark:border-amber-800/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
            <CardContent className="p-3.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  Validation Administrative
                </p>
                <ul className="text-[11px] text-amber-700 dark:text-amber-400 space-y-0.5 leading-snug">
                  <li>• Votre demande sera examinée par l&apos;admin</li>
                  <li>• Un Code Agent vous sera attribué si validé</li>
                  <li>• Vous ne pourrez pas vous connecter avant la validation</li>
                  <li>• Un mot de passe système vous sera envoyé par email</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* ── Step 1: Informations Personnelles ─────────────── */}
          {step === 1 && (
            <>
              {/* Photo Upload */}
              <motion.div variants={itemVariants} className="flex flex-col gap-2">
                <Label className="text-foreground font-medium text-sm">
                  Photo de profil / Pièce d&apos;identité
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                {photoPreview ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-[#0D5C63]/30 mx-auto">
                    <Image
                      src={photoPreview}
                      alt="Photo"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-28 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 hover:bg-muted/50 hover:border-[#0D5C63]/40 transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted group-hover:bg-[#0D5C63]/10 flex items-center justify-center transition-colors">
                      <Camera className="w-5 h-5 text-muted-foreground group-hover:text-[#0D5C63] transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        Appuyez pour ajouter une photo
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        PNG, JPG — Max 5 Mo
                      </p>
                    </div>
                  </button>
                )}
              </motion.div>

              {/* Full Name */}
              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <Label htmlFor="agent-name" className="text-foreground font-medium text-sm">
                  Nom complet <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="agent-name"
                    type="text"
                    placeholder="Ex: Jean Mukendi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 pl-9 text-sm"
                    autoComplete="name"
                    disabled={loading}
                  />
                </div>
              </motion.div>

              {/* Phone */}
              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <Label htmlFor="agent-phone" className="text-foreground font-medium text-sm">
                  Numéro de téléphone <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="agent-phone"
                    type="tel"
                    placeholder="+243 812 345 678"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="h-11 pl-9 text-sm font-mono"
                    autoComplete="tel"
                    disabled={loading}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Format: +243 XXX XXX XXX
                </p>
              </motion.div>

              {/* Email */}
              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <Label htmlFor="agent-email" className="text-foreground font-medium text-sm">
                  Adresse email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="agent-email"
                    type="email"
                    placeholder="agent@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-9 text-sm"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </motion.div>

              {/* Gender */}
              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <Label className="text-foreground font-medium text-sm">
                  Sexe <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'male', label: 'Homme', emoji: '👨' },
                    { value: 'female', label: 'Femme', emoji: '👩' },
                    { value: 'other', label: 'Autre', emoji: '🧑' },
                  ].map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value)}
                      disabled={loading}
                      className={`h-11 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer ${
                        gender === g.value
                          ? 'border-[#0D5C63] bg-[#0D5C63]/10 text-[#0D5C63] dark:bg-[#0D5C63]/20 dark:text-blue-300 shadow-sm'
                          : 'border-border bg-card text-muted-foreground hover:border-[#0D5C63]/30 hover:text-foreground'
                      }`}
                    >
                      {g.emoji} {g.label}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Country */}
              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <Label className="text-foreground font-medium text-sm">
                  Pays <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Select value={country} onValueChange={setCountry} disabled={loading}>
                    <SelectTrigger className="h-11 pl-9 text-sm">
                      <SelectValue placeholder="Sélectionner le pays" />
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
              </motion.div>

              {/* City */}
              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <Label htmlFor="agent-city" className="text-foreground font-medium text-sm">
                  Ville <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Select value={city} onValueChange={setCity} disabled={loading}>
                    <SelectTrigger className="h-11 pl-9 text-sm">
                      <SelectValue placeholder="Sélectionner la ville" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>

              {/* Address */}
              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <Label htmlFor="agent-address" className="text-foreground font-medium text-sm">
                  Adresse <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea
                    id="agent-address"
                    placeholder="Ex: 14 Av. de la Paix, Gombe"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full h-auto min-h-[44px] rounded-lg border border-input bg-transparent pl-9 pr-3 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    disabled={loading}
                  />
                </div>
              </motion.div>

              {/* Next Button */}
              <motion.div variants={itemVariants} className="mt-2">
                <Button
                  type="button"
                  onClick={() => {
                    if (name.trim().length < 2) {
                      toast.error('Veuillez entrer votre nom complet');
                      return;
                    }
                    if (phone.length < 12) {
                      toast.error('Veuillez entrer un numéro de téléphone valide');
                      return;
                    }
                    if (!email.includes('@') || !email.includes('.')) {
                      toast.error('Veuillez entrer une adresse email valide');
                      return;
                    }
                    if (!gender) {
                      toast.error('Veuillez sélectionner votre sexe');
                      return;
                    }
                    if (!country) {
                      toast.error('Veuillez sélectionner votre pays');
                      return;
                    }
                    if (!city.trim()) {
                      toast.error('Veuillez sélectionner votre ville');
                      return;
                    }
                    if (!address.trim()) {
                      toast.error('Veuillez entrer votre adresse');
                      return;
                    }
                    setStep(2);
                  }}
                  disabled={loading}
                  className="w-full h-12 text-base font-semibold bg-[#0D5C63] hover:bg-[#083A3E] text-white rounded-xl shadow-lg shadow-blue-900/10 cursor-pointer"
                >
                  Suivant
                </Button>
              </motion.div>
            </>
          )}

          {/* ── Step 2: Mot de passe + Confirmation ─────────────── */}
          {step === 2 && (
            <>
              {/* Password */}
              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <Label htmlFor="agent-password" className="text-foreground font-medium text-sm">
                  Créer un mot de passe <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="agent-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-9 pr-10 text-sm"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map((level) => {
                      const strength =
                        (password.length >= 6 ? 1 : 0) +
                        (password.length >= 8 ? 1 : 0) +
                        (/[A-Z]/.test(password) ? 1 : 0) +
                        (/[0-9]/.test(password) ? 1 : 0) +
                        (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
                      const colors = ['bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-emerald-400'];
                      return (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            strength >= level ? colors[Math.min(strength - 1, 3)] : 'bg-muted'
                          }`}
                        />
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Confirm Password */}
              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <Label htmlFor="agent-confirm-password" className="text-foreground font-medium text-sm">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="agent-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirmer votre mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`h-11 pl-9 pr-10 text-sm ${
                      confirmPassword.length > 0 && confirmPassword !== password
                        ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20'
                        : confirmPassword.length > 0 && confirmPassword === password
                          ? 'border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20'
                          : ''
                    }`}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && confirmPassword === password && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Les mots de passe correspondent
                  </p>
                )}
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" /> Les mots de passe ne correspondent pas
                  </p>
                )}
              </motion.div>

              {/* Security Info */}
              <motion.div variants={itemVariants}>
                <Card className="border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="p-3 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-[#0D5C63] dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                      <p className="font-semibold mb-0.5">Sécurité de votre compte</p>
                      <ul className="space-y-0.5">
                        <li>• Ce mot de passe vous servira pour vous connecter après validation</li>
                        <li>• Un <strong>code agent unique</strong> vous sera envoyé par email après validation</li>
                        <li>• Connexion : votre numéro + ce mot de passe</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Summary */}
              <motion.div variants={itemVariants}>
                <Card className="border-border">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs font-bold text-foreground mb-1">Résumé de votre demande</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">Nom:</span>
                        <p className="font-medium text-foreground">{name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Téléphone:</span>
                        <p className="font-medium font-mono text-foreground">{phone}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <p className="font-medium text-foreground truncate">{email}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ville:</span>
                        <p className="font-medium text-foreground">{city}, {country}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Adresse:</span>
                        <p className="font-medium text-foreground">{address}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Buttons */}
              <motion.div variants={itemVariants} className="flex gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 h-12 text-sm font-medium rounded-xl cursor-pointer"
                >
                  Retour
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !isStep2Valid()}
                  className="flex-[2] h-12 text-base font-semibold bg-[#0D5C63] hover:bg-[#083A3E] text-white rounded-xl shadow-lg shadow-blue-900/10 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Soumettre la demande
                    </>
                  )}
                </Button>
              </motion.div>
            </>
          )}
        </form>
      </motion.main>
    </div>
  );
}
