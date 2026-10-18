'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import ProductImagePicker from '@/components/marketplace/ProductImagePicker';

export default function BarterCreateScreen() {
  const { goBack, user } = useAppStore();
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    offerDescription: '',
    wantedItem: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim() || !form.category) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    setSubmitting(true);
    try {
      const fullDescription = form.offerDescription.trim()
        ? `${form.description.trim()}\n\nDétail: ${form.offerDescription.trim()}`
        : form.description.trim();
      const res = await fetch('/api/barter/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: fullDescription,
          category: form.category,
          offeredBy: user.id,
          wantedItem: form.wantedItem.trim() || undefined,
          images: photos.length > 0 ? photos : undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Offre publiée avec succès !');
        goBack();
      } else {
        toast.error(data.message || 'Erreur lors de la publication');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-lg font-semibold">Nouvelle offre de troc</h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-8">
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-5 max-w-lg mx-auto"
        >
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              placeholder="Ex: Création de logo professionnel"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Décrivez votre offre en détail..."
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={submitting}
              rows={4}
              className="min-h-[100px]"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Catégorie *</Label>
            <Select
              value={form.category}
              onValueChange={(val) => handleChange('category', val)}
              disabled={submitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service">Services</SelectItem>
                <SelectItem value="product">Produits</SelectItem>
                <SelectItem value="skill">Compétences</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* What you offer */}
          <div className="space-y-2">
            <Label htmlFor="offerDescription">Détail de l'offre</Label>
            <Input
              id="offerDescription"
              placeholder="Ex: Design de site web, cours de guitare..."
              value={form.offerDescription}
              onChange={(e) => handleChange('offerDescription', e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* What you want */}
          <div className="space-y-2">
            <Label htmlFor="wantedItem">Ce que vous recherchez</Label>
            <Input
              id="wantedItem"
              placeholder="Ex: Service de traduction, appareil photo..."
              value={form.wantedItem}
              onChange={(e) => handleChange('wantedItem', e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>Photos (optionnel)</Label>
            <ProductImagePicker images={photos} onChange={setPhotos} max={3} minSize={640} />
          </div>

          {/* Info card */}
          <Card className="bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="p-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Les offres de troc permettent d&apos;échanger des biens et services sans argent.
                Les discussions liées à une offre sont éphémères : elles expirent automatiquement après 48 h.
              </p>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Publication en cours...
              </>
            ) : (
              <>
                <Send className="size-5" />
                Publier l&apos;offre
              </>
            )}
          </Button>
        </motion.form>
      </div>
    </div>
  );
}
