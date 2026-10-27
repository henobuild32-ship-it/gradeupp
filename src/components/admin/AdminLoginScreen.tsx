'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import Image from 'next/image';

export default function AdminLoginScreen() {
  const { setAdmin, navigateTo, goBack } = useAppStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Identifiants incorrects');
        setLoading(false);
        return;
      }

      if (data.success && data.admin) {
        setAdmin({ ...data.admin, token: data.token });
        toast.success(`Bienvenue, ${data.admin.name}`);
        navigateTo('admin-dashboard');
      } else {
        toast.error('Identifiants incorrects');
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#e5f3f1] via-background to-[#f5f7f7] flex flex-col">
      {/* Sticky Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' as const }}
        className="sticky top-0 z-10 border-b border-border/50 bg-white/70 backdrop-blur-xl dark:bg-background/80"
      >
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={goBack}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Retour</span>
          </Button>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border/60">
            <Image src="/trait-mark.png" alt="" width={42} height={30} className="h-8 w-9 object-contain" />
          </span>
          <div>
            <h1 className="text-base font-semibold text-foreground">Administration TRAIT</h1>
            <p className="text-xs text-muted-foreground">Accès sécurisé</p>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' as const }}
          className="w-full max-w-md"
        >
          {/* Shield Icon */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0D5C63]/10 text-[#0D5C63]">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              Accès Administration
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              Connectez-vous avec vos identifiants d&apos;administrateur
            </p>
          </div>

          {/* Login Form */}
          <Card className="rounded-3xl border-white/80 bg-white/90 shadow-xl shadow-[#073f45]/10 backdrop-blur-xl dark:border-border dark:bg-card">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">Nom d&apos;utilisateur</Label>
                  <Input
                    id="username"
                    type="text"
                    required
                    maxLength={80}
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="bg-muted/50"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      maxLength={128}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="bg-muted/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-[#0D5C63] font-semibold text-white hover:bg-[#083A3E]"
                  disabled={loading || !username.trim() || !password.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 text-center"
          >
            <p className="text-xs text-muted-foreground">
              🔒 Connexion sécurisée — Toutes les actions sont enregistrées
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
