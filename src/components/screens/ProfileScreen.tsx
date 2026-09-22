'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Loader2,
  Wallet,
  Gift,
  Lock,
  Phone,
  MapPin,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';

export default function ProfileScreen() {
  const { goBack, user, setUser } = useAppStore();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    pseudo: '',
    phone: '',
    country: '',
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        pseudo: user.pseudo || '',
        phone: user.phone || '',
        country: user.country || '',
      });
    }
  }, [user]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error(t('profile.name_required'));
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: form.name.trim(),
          pseudo: form.pseudo.trim(),
          country: form.country.trim() || 'US',
        }),
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        toast.success(t('profile.updated'));
      } else {
        toast.error(data.message || t('profile.update_error'));
      }
    } catch {
      toast.error(t('validation.connection_error'));
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.pseudo?.[0].toUpperCase() || '?';

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="size-5" />
            </Button>
            <h1 className="text-lg font-semibold">{t('profile.title')}</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t('profile.not_connected')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t('profile.title')}</h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-8 space-y-5 max-w-lg mx-auto w-full">
        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
            {initials}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {user.phone}
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('auth.full_name')}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder={t('profile.name_placeholder')}
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={saving}
                className="pl-9"
              />
            </div>
          </div>

          {/* Pseudo */}
          <div className="space-y-2">
            <Label htmlFor="pseudo">{t('auth.pseudo')}</Label>
            <Input
              id="pseudo"
              placeholder={t('profile.pseudo_placeholder')}
              value={form.pseudo}
              onChange={(e) => handleChange('pseudo', e.target.value)}
              disabled={saving}
            />
          </div>

          {/* Phone (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="phone">{t('auth.phone')}</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="phone"
                value={form.phone}
                disabled
                readOnly
                className="pl-9 bg-muted"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('profile.phone_readonly')}
            </p>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">{t('auth.country')}</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="country"
                placeholder={t('profile.country_placeholder')}
                value={form.country}
                onChange={(e) => handleChange('country', e.target.value)}
                disabled={saving}
                className="pl-9"
              />
            </div>
          </div>

          {/* Save button */}
          <Button
            type="submit"
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                {t('profile.saving')}
              </>
            ) : (
              <>
                <Save className="size-5" />
                {t('profile.save')}
              </>
            )}
          </Button>
        </motion.form>

        {/* Balance info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="size-4" />
                Informations de solde
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Wallet className="size-4 text-emerald-700" />
                  </div>
                  <span className="text-sm">Solde réel</span>
                </div>
                <span className="font-bold text-emerald-600">
                  ${(user.realBalance ?? 0).toFixed(2)}
                </span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Gift className="size-4 text-amber-700" />
                  </div>
                  <div>
                    <span className="text-sm block">Solde bonus</span>
                    <span className="text-xs text-muted-foreground">
                      Non retirable, non transférable
                    </span>
                  </div>
                </div>
                <span className="font-bold text-amber-600">
                  ${(user.bonusBalance ?? 0).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
