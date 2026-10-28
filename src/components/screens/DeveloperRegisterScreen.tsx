'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Terminal, Loader2, Code2, BookOpen, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { CountrySelect } from '@/components/shared/CountrySelect';
import { normalizePhoneForCountry } from '@/lib/countries';

// ─── Constants ────────────────────────────────────────────────────────

const projectTypes = [
  { value: 'Android', label: 'Android' },
  { value: 'iOS', label: 'iOS' },
  { value: 'Web', label: 'Web' },
  { value: 'Flutter', label: 'Flutter' },
  { value: 'React Native', label: 'React Native' },
  { value: 'Python', label: 'Python' },
  { value: 'PHP', label: 'PHP' },
  { value: 'JavaScript', label: 'JavaScript' },
];

const userEstimates = [
  { value: '50', label: '< 100' },
  { value: '500', label: '100 - 1 000' },
  { value: '5000', label: '1 000 - 10 000' },
  { value: '10000', label: '10 000+' },
];

// ─── Component ────────────────────────────────────────────────────────

export default function DeveloperRegisterScreen() {
  const { navigateTo } = useAppStore();

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [appName, setAppName] = useState('');
  const [projectType, setProjectType] = useState('');
  const [description, setDescription] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [userEstimate, setUserEstimate] = useState('');
  const [loading, setLoading] = useState(false);
  const normalizedPhone = normalizePhoneForCountry(phone, country);

  const canSubmit =
    fullName.trim() &&
    email.trim() &&
    phone.trim() &&
    country &&
    appName.trim() &&
    projectType &&
    userEstimate;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Veuillez entrer votre nom complet');
      return;
    }
    if (!email.trim()) {
      toast.error("Veuillez entrer votre email professionnel");
      return;
    }
    if (!phone.trim()) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return;
    }
    if (!normalizedPhone) {
      toast.error('Le numéro ne correspond pas au pays sélectionné');
      return;
    }
    if (!country) {
      toast.error('Veuillez sélectionner votre pays');
      return;
    }
    if (!appName.trim()) {
      toast.error("Veuillez entrer le nom de l'application");
      return;
    }
    if (!projectType) {
      toast.error('Veuillez sélectionner le type de projet');
      return;
    }
    if (!userEstimate) {
      toast.error("Veuillez sélectionner le nombre estimé d'utilisateurs");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/developers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          company: companyName.trim() || undefined,
          email: email.trim(),
          phone: normalizedPhone,
          country,
          appName: appName.trim(),
          projectType,
          description: description.trim() || undefined,
          siteUrl: appUrl.trim() || undefined,
          estimatedUsers: userEstimate,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Erreur lors de l'envoi de la demande");
        return;
      }

      toast.success('Demande envoyée ! Accédez à votre espace développeur.');
      navigateTo('developer-dashboard');
    } catch {
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Sticky Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigateTo('welcome')}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Retour</span>
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Terminal className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-lg font-semibold text-foreground">Espace Développeur</h1>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 flex flex-col px-4 pt-6 pb-8 max-w-lg mx-auto w-full"
      >
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-6"
        >
          <Card className="border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 to-slate-50 dark:from-emerald-950/30 dark:to-slate-900/50">
            <CardContent className="p-5 flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-200 dark:shadow-emerald-900/30">
                <Code2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-sm font-semibold text-foreground">
                  Inscrivez-vous comme développeur
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Intégrez les APIs Trait dans vos applications et accédez à un écosystème de paiement complet.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-6 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3.5 flex items-start gap-3"
        >
          <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
            <Terminal className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Après validation de votre demande
            </p>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
              <li>• Vous recevrez vos clés API (public &amp; secret)</li>
              <li>• Accès complet à la documentation technique</li>
              <li>• URL de webhook pour les notifications en temps réel</li>
            </ul>
          </div>
        </motion.div>

        {/* Guide d'intégration button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Button
            onClick={() => navigateTo('integration-guide')}
            variant="outline"
            className="w-full h-12 border-2 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 font-semibold rounded-xl gap-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all"
          >
            <BookOpen className="h-5 w-5" />
            Guide d&apos;intégration complet
            <ExternalLink className="h-4 w-4 ml-auto opacity-50" />
          </Button>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Full Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName" className="text-foreground font-medium text-sm">
              Nom complet <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Ex: Kofi Amegah"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-11 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-sm"
              autoComplete="name"
              disabled={loading}
            />
          </div>

          {/* Company Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="companyName" className="text-foreground font-medium text-sm">
              Nom de l&apos;entreprise
            </Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Ex: Trait Technologies"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="h-11 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-sm"
              autoComplete="organization"
              disabled={loading}
            />
          </div>

          {/* Professional Email */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="devEmail" className="text-foreground font-medium text-sm">
              Email professionnel <span className="text-red-500">*</span>
            </Label>
            <Input
              id="devEmail"
              type="email"
              placeholder="Ex: dev@votreentreprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-sm"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="devPhone" className="text-foreground font-medium text-sm">
              Téléphone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="devPhone"
              type="tel"
              inputMode="tel"
              placeholder="Numéro national"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-sm"
              autoComplete="tel-national"
              aria-invalid={phone.length > 0 && !normalizedPhone}
              disabled={loading}
            />
          </div>

          {/* Country */}
          <div className="flex flex-col gap-2">
            <Label className="text-foreground font-medium text-sm">
              Pays <span className="text-red-500">*</span>
            </Label>
            <CountrySelect value={country} onValueChange={setCountry} placeholder="Sélectionnez votre pays" disabled={loading} />
            {phone.length > 0 && !normalizedPhone && <p className="text-xs text-destructive">Vérifiez l’indicatif et le format du numéro.</p>}
          </div>

          {/* App Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="appName" className="text-foreground font-medium text-sm">
              Nom de l&apos;application <span className="text-red-500">*</span>
            </Label>
            <Input
              id="appName"
              type="text"
              placeholder="Ex: MonApp Payment"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="h-11 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-sm"
              disabled={loading}
            />
          </div>

          {/* Project Type */}
          <div className="flex flex-col gap-2">
            <Label className="text-foreground font-medium text-sm">
              Type de projet <span className="text-red-500">*</span>
            </Label>
            <Select value={projectType} onValueChange={setProjectType} disabled={loading}>
              <SelectTrigger className="h-11 focus:ring-emerald-500/20 text-sm">
                <SelectValue placeholder="Sélectionnez le type" />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>
                    {pt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="description" className="text-foreground font-medium text-sm">
              Description du projet
            </Label>
            <Textarea
              id="description"
              placeholder="Décrivez brièvement votre projet et votre besoin d'intégration..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-sm"
              disabled={loading}
            />
          </div>

          {/* App URL */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="appUrl" className="text-foreground font-medium text-sm">
              URL du site ou application
            </Label>
            <Input
              id="appUrl"
              type="url"
              placeholder="https://www.monapp.com"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              className="h-11 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 text-sm"
              disabled={loading}
            />
          </div>

          {/* User Estimate */}
          <div className="flex flex-col gap-2">
            <Label className="text-foreground font-medium text-sm">
              Nombre estimé d&apos;utilisateurs <span className="text-red-500">*</span>
            </Label>
            <Select value={userEstimate} onValueChange={setUserEstimate} disabled={loading}>
              <SelectTrigger className="h-11 focus:ring-emerald-500/20 text-sm">
                <SelectValue placeholder="Sélectionnez une estimation" />
              </SelectTrigger>
              <SelectContent>
                {userEstimates.map((ue) => (
                  <SelectItem key={ue.value} value={ue.value}>
                    {ue.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Envoi en cours...
              </>
            ) : (
              'Envoyer la demande'
            )}
          </Button>

          {/* Footer note */}
          <p className="text-[11px] text-muted-foreground text-center mt-1">
            En soumettant ce formulaire, vous acceptez les conditions d&apos;utilisation de l&apos;API Trait.
          </p>
        </form>
      </motion.main>
    </div>
  );
}
