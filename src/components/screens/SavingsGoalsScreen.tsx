'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  PiggyBank,
  Target,
  Calendar,
  DollarSign,
  Loader2,
  Check,
  Trophy,
  Clock,
  Repeat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: string | null;
  status: 'active' | 'completed';
  autoTransfer: boolean;
  autoAmount: number;
  autoFrequency: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
}

export default function SavingsGoalsScreen() {
  const { user, navigateTo, setPendingPinAction } = useAppStore();
  const { t } = useTranslation();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formDeadline, setFormDeadline] = useState('');
  const [formAuto, setFormAuto] = useState(false);
  const [formAutoAmount, setFormAutoAmount] = useState('');
  const [formAutoFreq, setFormAutoFreq] = useState<'weekly' | 'monthly'>('weekly');
  const [creating, setCreating] = useState(false);

  const [contributing, setContributing] = useState<SavingsGoal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  useEffect(() => {
    if (user?.id) fetchGoals();
    else setLoading(false);
  }, [user?.id]);

  async function fetchGoals() {
    try {
      const res = await fetch(`/api/savings`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setGoals(data.goals ?? []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!formName.trim() || !formTarget || parseFloat(formTarget) <= 0) {
      toast.error('Veuillez remplir les champs requis'); return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          name: formName,
          targetAmount: parseFloat(formTarget),
          currency: formCurrency,
          deadline: formDeadline || null,
          autoTransfer: formAuto,
          autoAmount: formAuto ? parseFloat(formAutoAmount) : 0,
          autoFrequency: formAuto ? formAutoFreq : null,
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Objectif créé !'); setShowCreate(false); resetForm(); fetchGoals(); }
      else toast.error(data.message || 'Erreur');
    } catch { toast.error('Erreur de connexion'); }
    finally { setCreating(false); }
  }

  async function handleContribute() {
    if (!contributing || !contributeAmount || parseFloat(contributeAmount) <= 0) {
      toast.error('Montant invalide'); return;
    }
    setPendingPinAction(async () => {
      try {
        const res = await fetch('/api/savings/contribute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goalId: contributing.id,
            userId: user?.id,
            amount: parseFloat(contributeAmount),
          }),
        });
        const data = await res.json();
        if (data.success) { toast.success('Contribution ajoutée !'); setContributing(null); fetchGoals(); }
        else toast.error(data.message || 'Erreur');
      } catch { toast.error('Erreur de connexion'); }
    });
    navigateTo('pin-verify');
  }

  function resetForm() {
    setFormName(''); setFormTarget(''); setFormCurrency('USD');
    setFormDeadline(''); setFormAuto(false); setFormAutoAmount(''); setFormAutoFreq('weekly');
  }

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Objectifs d&apos;épargne</h1>
      </div>

      <div className="px-4 space-y-4">
        <Card className="bg-gradient-to-br from-[#0D5C63] to-[#14888F] text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] opacity-80">Total épargné</p>
              <p className="text-2xl font-bold">${totalSaved.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] opacity-80">Objectifs actifs</p>
              <p className="text-2xl font-bold">{activeGoals.length}</p>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : goals.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <PiggyBank className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">Aucun objectif</p>
              <p className="text-sm text-muted-foreground text-center mb-6">Épargnez pour vos projets ! Créez votre premier objectif.</p>
              <Button className="bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />Créer un objectif
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {activeGoals.map((goal, idx) => {
                const progress = goal.targetAmount > 0
                  ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
                return (
                  <motion.div key={goal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Card className="border-border">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#0D5C63]/10 flex items-center justify-center">
                              <Target className="h-5 w-5 text-[#0D5C63]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{goal.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {goal.currency === 'FC' ? '' : '$'}{goal.currentAmount.toFixed(2)} / {goal.currency === 'FC' ? '' : '$'}{goal.targetAmount.toFixed(2)} {goal.currency === 'FC' ? 'FC' : 'USD'}
                              </p>
                            </div>
                          </div>
                          {goal.autoTransfer && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                              <Repeat className="h-3 w-3 mr-1" />Auto
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Progression</span>
                            <span>{progress.toFixed(0)}%</span>
                          </div>
                          <Progress value={progress} className="h-2 [&>div]:bg-[#0D5C63]" />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {goal.deadline ? new Date(goal.deadline).toLocaleDateString('fr-FR') : 'Pas d\'échéance'}
                          </div>
                          <Button size="sm" className="h-8 text-xs rounded-xl bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white"
                            onClick={() => { setContributing(goal); setContributeAmount(''); }}>
                            Contribuer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {completedGoals.length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Objectifs atteints
                </h3>
                {completedGoals.map((goal) => (
                  <Card key={goal.id} className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                        <Check className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{goal.name}</p>
                        <p className="text-[10px] text-emerald-600">
                          {goal.currency === 'FC' ? '' : '$'}{goal.targetAmount.toFixed(2)} {goal.currency === 'FC' ? 'FC' : 'USD'} atteint
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <button onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#0D5C63] text-white shadow-lg shadow-[#0D5C63]/30 flex items-center justify-center hover:bg-[#0D5C63]/90 active:scale-95 transition-all z-40">
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader><DialogTitle>Nouvel objectif d&apos;épargne</DialogTitle>
            <DialogDescription>Définissez votre objectif financier</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nom de l&apos;objectif</Label>
              <Input placeholder="Ex: Voyage, Voiture..." value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Montant cible</Label>
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={formTarget}
                  onChange={e => setFormTarget(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Devise</Label>
                <Select value={formCurrency} onValueChange={setFormCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="FC">FC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date d&apos;échéance <span className="text-muted-foreground">(optionnelle)</span></Label>
              <Input type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div>
                <p className="text-sm font-medium text-foreground">Transfert automatique</p>
                <p className="text-[10px] text-muted-foreground">Épargnez régulièrement</p>
              </div>
              <Switch checked={formAuto} onCheckedChange={setFormAuto} />
            </div>
            {formAuto && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Montant</Label>
                  <Input type="number" step="0.01" min="0" placeholder="10.00" value={formAutoAmount}
                    onChange={e => setFormAutoAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fréquence</Label>
                  <Select value={formAutoFreq} onValueChange={(v: any) => setFormAutoFreq(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Hebdo</SelectItem>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => { setShowCreate(false); resetForm(); }}>Annuler</Button>
            <Button className="bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!contributing} onOpenChange={(o) => { if (!o) setContributing(null); }}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader><DialogTitle>Contribuer</DialogTitle>
            <DialogDescription>Ajoutez de l&apos;argent à votre objectif</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            {contributing && (
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Objectif</span>
                  <span className="font-medium">{contributing.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-medium">
                    {contributing.currency === 'FC' ? '' : '$'}{contributing.currentAmount.toFixed(2)} / {contributing.targetAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Montant à contribuer</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={contributeAmount}
                onChange={e => setContributeAmount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setContributing(null)}>Annuler</Button>
            <Button className="bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl" onClick={handleContribute}>
              Contribuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
