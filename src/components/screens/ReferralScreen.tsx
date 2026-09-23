'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Copy,
  Share2,
  Check,
  Gift,
  Users,
  DollarSign,
  Loader2,
  Star,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

interface ReferralReward {
  id: string;
  amount: number;
  currency: string;
  type: 'signup' | 'transaction';
  referredName: string;
  createdAt: string;
}

export default function ReferralScreen() {
  const { user, navigateTo } = useAppStore();
  const { t } = useTranslation();
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copying, setCopying] = useState(false);
  const [stats, setStats] = useState({ totalReferrals: 0, totalRewards: 0, pendingRewards: 0 });
  const [rewards, setRewards] = useState<ReferralReward[]>([]);

  useEffect(() => {
    if (user?.id) fetchReferralData();
    else setLoading(false);
  }, [user?.id]);

  async function fetchReferralData() {
    try {
      const res = await fetch(`/api/referral?userId=${user.id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setReferralCode(data.code || '');
        setStats(data.stats || { totalReferrals: 0, totalRewards: 0, pendingRewards: 0 });
        setRewards(data.rewards ?? []);
      }
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      const data = await res.json();
      if (data.success) {
        setReferralCode(data.code);
        toast.success('Code de parrainage généré !');
      } else toast.error(data.message || 'Erreur');
    } catch { toast.error('Erreur de connexion'); }
    finally { setGenerating(false); }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopying(true);
      toast.success('Code copié !');
      setTimeout(() => setCopying(false), 2000);
    } catch {}
  }

  function getReferralLink() {
    return `https://trait-rho.vercel.app?ref=${referralCode}`;
  }

  async function handleShare() {
    const text = `Rejoins TRAIT avec mon code: ${referralCode}. ${getReferralLink()}`;
    try {
      await navigator.share({ title: 'TRAIT - Parrainage', text, url: getReferralLink() });
    } catch {}
  }

  const steps = [
    { icon: Share2, title: 'Partagez votre code', desc: 'Envoyez votre code de parrainage à vos amis' },
    { icon: Users, title: 'Vos amis s\'inscrivent', desc: 'Ils créent un compte TRAIT avec votre code' },
    { icon: Gift, title: 'Gagnez des bonus', desc: 'Recevez des récompenses pour chaque filleul' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0D5C63]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Parrainage</h1>
      </div>

      <div className="px-4 space-y-6">
        {!referralCode ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Gift className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">Pas encore de code</p>
              <p className="text-sm text-muted-foreground text-center mb-6">Générez votre code de parrainage pour commencer !</p>
              <Button className="bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Gift className="h-4 w-4 mr-2" />}
                Générer mon code
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-gradient-to-br from-[#0D5C63] to-[#14888F] text-white border-0">
              <CardContent className="p-6 text-center">
                <p className="text-xs opacity-80 mb-2">Votre code de parrainage</p>
                <p className="text-3xl font-bold font-mono tracking-widest">{referralCode}</p>
                <div className="flex gap-2 mt-4 justify-center">
                  <Button size="sm" variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0 rounded-xl"
                    onClick={handleCopy}>
                    {copying ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copying ? 'Copié' : 'Copier'}
                  </Button>
                  <Button size="sm" variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0 rounded-xl"
                    onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-1" />
                    Partager
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              <Card className="border-border">
                <CardContent className="p-3 text-center">
                  <Users className="h-4 w-4 text-[#0D5C63] mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{stats.totalReferrals}</p>
                  <p className="text-[9px] text-muted-foreground">Filleuls</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-3 text-center">
                  <DollarSign className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">${stats.totalRewards.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground">Gagnés</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-3 text-center">
                  <Gift className="h-4 w-4 text-amber-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">${stats.pendingRewards.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground">En attente</p>
                </CardContent>
              </Card>
            </div>

            {rewards.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Historique des récompenses</h3>
                <div className="space-y-2">
                  {rewards.map((reward, idx) => (
                    <motion.div key={reward.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                      <Card className="border-border">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                            <Gift className="h-4 w-4 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground capitalize">{reward.type === 'signup' ? 'Inscription' : 'Transaction'} - {reward.referredName}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(reward.createdAt).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-600">
                            +{reward.currency === 'FC' ? '' : '$'}{reward.amount.toFixed(2)} {reward.currency === 'FC' ? 'FC' : ''}
                          </span>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">Comment ça marche</h3>
              <div className="space-y-3">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="w-10 h-10 rounded-xl bg-[#0D5C63]/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-[#0D5C63]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{idx + 1}. {step.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
