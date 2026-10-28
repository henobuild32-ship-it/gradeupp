'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, CreditCard, Globe, ImagePlus, Zap, Shield, CheckCircle2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import TraitCard from '@/components/trait/TraitCard';

interface CardOption {
  type: 'USD' | 'FC';
  name: string;
  currency: string;
  description: string;
  gradient: string;
  accent: string;
  icon: React.ElementType;
  features: string[];
}

const cardOptions: CardOption[] = [
  {
    type: 'USD',
    name: 'Carte TRAIT USD',
    currency: 'Dollar Américain',
    description: 'Carte d’identité TRAIT avec portefeuille USD intégré à l’application.',
    gradient: 'linear-gradient(135deg, #0A1628 0%, #1E3A5F 40%, #0D2847 100%)',
    accent: '#14888F',
    icon: Globe,
    features: ['Aperçu recto-verso', 'Paiements dans TRAIT', 'Retrait après validation'],
  },
  {
    type: 'FC',
    name: 'Carte Trait CDF',
    currency: 'CDF',
    description: 'Carte d’identité TRAIT avec portefeuille en francs congolais intégré à l’application.',
    gradient: 'linear-gradient(135deg, #1A0A0A 0%, #5F1E1E 40%, #470D0D 100%)',
    accent: '#EF4444',
    icon: Zap,
    features: ['Aperçu recto-verso', 'Paiements dans TRAIT', 'Retrait après validation'],
  },
];

export default function CardRequestScreen() {
  const { user, navigateTo } = useAppStore();
  const [selectedType, setSelectedType] = useState<'USD' | 'FC' | null>(null);
  const [loading, setLoading] = useState(false);
  const [holderName, setHolderName] = useState(user?.name || '');
  const [jobTitle, setJobTitle] = useState('Membre TRAIT');
  const [birthDate, setBirthDate] = useState('');
  const [photoData, setPhotoData] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function selectPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Choisissez une image'); return; }
    if (file.size > 12 * 1024 * 1024) { toast.error('La photo doit faire moins de 12 Mo'); return; }
    try {
      const image = await createImageBitmap(file);
      const scale = Math.min(1, 720 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      const compressed = canvas.toDataURL('image/jpeg', 0.78);
      if (compressed.length > 1_400_000) { toast.error('Photo trop volumineuse après compression'); return; }
      setPhotoData(compressed);
      setPhotoPreview(compressed);
    } catch { toast.error('Impossible de lire cette photo'); }
  }

  async function handleSubmit() {
    if (!user?.id || !selectedType) return;
    if (!holderName.trim() || !jobTitle.trim() || !birthDate || !photoData) {
      toast.error('Complétez le nom, le poste, la date de naissance et la photo');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/cards/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, cardType: selectedType, holderName, jobTitle, birthDate, photoData }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Demande envoyée à l’administration');
        navigateTo('card');
      } else {
        toast.error(data.message || 'Erreur lors de la demande');
      }
    } catch {
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => navigateTo('home')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Demander une carte</h1>
      </div>

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="px-4 mb-6"
      >
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <Shield className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Demande de carte</p>
              <p className="text-xs text-amber-700 mt-1">
                L’aperçu ci-dessous n’est pas une carte bancaire émise. Après validation, présentez-vous à l’administration pour le retrait; la carte sera activée à la remise.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="space-y-4 px-4 pb-6">
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-bold">Identité du titulaire</h2>
          <p className="mb-4 text-xs text-muted-foreground">Votre date complète et votre photo sont visibles par l’administration chargée de la demande. L’année restera masquée sur la carte.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-medium">Nom et prénom<Input value={holderName} onChange={e => setHolderName(e.target.value)} maxLength={100} autoComplete="name" placeholder="Nom Prénom" /></label>
            <label className="space-y-1.5 text-xs font-medium">Poste ou rôle<Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} maxLength={60} placeholder="Membre TRAIT" /></label>
            <label className="space-y-1.5 text-xs font-medium sm:col-span-2">Date de naissance<Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} /></label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="grid h-20 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted">
              {photoPreview ? <img src={photoPreview} alt="Aperçu du portrait" className="h-full w-full object-cover" /> : <UserRound className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={importRef} type="file" accept="image/*" className="hidden" onChange={e => { void selectPhoto(e.target.files?.[0]); e.currentTarget.value = ''; }} />
              <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => { void selectPhoto(e.target.files?.[0]); e.currentTarget.value = ''; }} />
              <Button type="button" variant="outline" size="sm" onClick={() => importRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />Importer une photo</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}><Camera className="mr-2 h-4 w-4" />Prendre une photo</Button>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold">Aperçu de la carte</h2>
          <TraitCard cardType={selectedType || 'USD'} cardHolder={holderName || 'NOM PRÉNOM'} jobTitle={jobTitle} birthDate={birthDate ? `${birthDate.slice(8, 10)}/${birthDate.slice(5, 7)}/XXXX` : '••/••/XXXX'} holderPhoto={photoPreview} status="preview" />
        </section>
      </div>

      {/* Card Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
        className="px-4 mb-6"
      >
        <p className="text-sm font-medium text-foreground mb-3">Choisissez votre carte</p>
        <div className="space-y-4">
          {cardOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedType === option.type;

            return (
              <motion.button
                key={option.type}
                onClick={() => setSelectedType(option.type)}
                whileTap={{ scale: 0.98 }}
                className={`w-full text-left rounded-2xl overflow-hidden border-2 transition-all ${
                  isSelected
                    ? 'ring-2 ring-offset-2'
                    : 'border-border'
                }`}
                style={{
                  borderColor: isSelected ? option.accent : undefined,
                  ...(isSelected ? { '--tw-ring-color': option.accent } as React.CSSProperties : {}),
                }}
              >
                {/* Card visual header */}
                <div
                  className="relative p-5 pb-4"
                  style={{
                    background: option.gradient,
                    minHeight: '120px',
                  }}
                >
                  {/* World map dots */}
                  <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                      backgroundImage: `radial-gradient(circle, ${option.accent} 1px, transparent 1px)`,
                      backgroundSize: '20px 20px',
                    }}
                  />

                  {/* Light streak */}
                  <div
                    className="absolute top-0 right-0 w-32 h-32 opacity-20"
                    style={{
                      background: `radial-gradient(ellipse at top right, ${option.accent}, transparent 70%)`,
                    }}
                  />

                  <div className="relative z-10 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${option.accent}20` }}
                        >
                          <CreditCard className="w-4 h-4" style={{ color: option.accent }} />
                        </div>
                        <span className="text-white text-sm font-black tracking-wider">
                          TRAIT
                        </span>
                      </div>
                      <h3 className="text-white text-lg font-bold">{option.name}</h3>
                      <p className="text-white/50 text-xs mt-0.5">{option.currency}</p>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <CheckCircle2 className="w-6 h-6" style={{ color: option.accent }} />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Card details */}
                <div className="p-4 bg-card">
                  <p className="text-sm text-muted-foreground mb-3">
                    {option.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {option.features.map((feature) => (
                      <span
                        key={feature}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor: `${option.accent}15`,
                          color: option.accent,
                        }}
                      >
                        <Icon className="w-3 h-3" />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
        className="px-4 pb-6"
      >
        <Button
          className="w-full h-12 font-semibold rounded-xl text-base"
          style={{
            backgroundColor: selectedType
              ? cardOptions.find((o) => o.type === selectedType)?.accent
              : undefined,
          }}
          onClick={handleSubmit}
          disabled={!selectedType || loading || !holderName.trim() || !jobTitle.trim() || !birthDate || !photoData}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Traitement...
            </span>
          ) : (
            'Confirmer la demande'
          )}
        </Button>
      </motion.div>
    </div>
  );
}
