'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Users,
  Ban,
  Clock,
  Loader2,
  Phone,
  Calendar,
  Wallet,
  X,
  Check,
  CreditCard,
  History,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface ParentData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface ChildCard {
  id: string;
  cardType: 'USD' | 'FC';
  cardNumber: string;
  cvv: string;
  qrCode: string;
  expiryDate: string;
  status: string;
  createdAt: string;
}

interface ChildUser {
  id: string;
  name: string;
  pseudo: string;
  phone: string;
  realBalance: number;
  realBalanceFC: number;
  suspended: boolean;
  createdAt: string;
  parent: ParentData;
  cards: ChildCard[];
}

export default function AdminChildrenScreen() {
  const { admin, goBack } = useAppStore();
  const [children, setChildren] = useState<ChildUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // History states
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<ChildUser | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const query = searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery.trim())}` : '';
      const res = await fetch(`/api/admin/children${query}`);
      const data = await res.json();
      if (data.success) {
        setChildren(data.children || []);
      }
    } catch {
      toast.error('Erreur lors du chargement des comptes enfants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, [searchQuery]);

  const handleAction = async (
    action: 'confirm-delivery' | 'block-card' | 'unblock-card' | 'suspend-card' | 'unsuspend-card' | 'suspend-child' | 'unsuspend-child',
    params: { cardId?: string; childId?: string; reason?: string }
  ) => {
    if (!admin?.id) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: admin.id,
          action,
          ...params,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        await fetchChildren(); // refresh
      } else {
        toast.error(data.message || 'Action échouée');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchChildHistory = async (child: ChildUser) => {
    setHistoryTarget(child);
    setHistoryOpen(true);
    setLoadingHistory(true);
    try {
      // Query transaction logs directly or via child details
      const res = await fetch(`/api/cards/child/list?parentId=${child.parent.id}`);
      const data = await res.json();
      if (data.success) {
        // filter transactions where this child is sender or receiver
        const allTx = [
          ...(data.recharges || []).filter((tx: any) => tx.receiverId === child.id),
          ...(data.expenses || []).filter((tx: any) => tx.senderId === child.id)
        ];
        // Sort by date desc
        allTx.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setHistoryList(allTx);
      }
    } catch {
      toast.error('Erreur chargement historique');
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending_retrieval':
        return { label: 'En attente de retrait', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200' };
      case 'delivered':
        return { label: 'Remise au parent', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200' };
      case 'active':
        return { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 border-green-200' };
      case 'suspended':
        return { label: 'Suspendue', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200' };
      case 'blocked':
        return { label: 'Bloquée', color: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border-red-200' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-400' };
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Gestion Parrainage</h1>
            <p className="text-xs text-muted-foreground">Comptes & Cartes Enfants</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un enfant par nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-10 bg-muted/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Separator />

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D5C63]" />
          </div>
        ) : children.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-foreground">Aucun compte enfant trouvé</p>
          </div>
        ) : (
          <div className="space-y-4">
            {children.map((child) => (
              <Card key={child.id} className={`border-border hover:shadow-sm transition-all ${child.suspended ? 'border-red-200 dark:border-red-950/40 bg-red-50/10' : ''}`}>
                <CardContent className="p-4 space-y-4">
                  {/* Title Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        {child.name}
                        {child.suspended && <Badge variant="destructive" className="text-[9px] h-4">Compte Suspendu</Badge>}
                      </h3>
                      <p className="text-[10px] text-muted-foreground">Enregistré le {new Date(child.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>

                    <div className="flex gap-1">
                      {/* Suspend child account toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        onClick={() => handleAction(child.suspended ? 'unsuspend-child' : 'suspend-child', { childId: child.id })}
                        title={child.suspended ? 'Réactiver le compte' : 'Suspendre le compte'}
                      >
                        {child.suspended ? <UserCheck className="size-4 text-emerald-600" /> : <Ban className="size-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => fetchChildHistory(child)}
                        title="Voir l'historique"
                      >
                        <History className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Parent & Balances */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-xl border border-border/60">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Parent Associé</span>
                      <p className="font-semibold text-foreground truncate">{child.parent.name}</p>
                      <p className="text-[10px] text-muted-foreground">{child.parent.phone}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Soldes de l&apos;enfant</span>
                      <p className="font-bold text-foreground">{child.realBalance.toFixed(2)} USD</p>
                      <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">{child.realBalanceFC.toFixed(0)} FC</p>
                    </div>
                  </div>

                  {/* Child Cards list */}
                  {child.cards.map((card) => {
                    const disp = getStatusDisplay(card.status);
                    return (
                      <div key={card.id} className="p-3 border rounded-xl bg-card space-y-3 shadow-sm relative">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-[#0D5C63] dark:text-blue-400 flex items-center gap-1">
                            <CreditCard className="size-3.5" />
                            Carte {card.cardType}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${disp.color}`}>
                            {disp.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                          <div>Numéro: <span className="font-mono font-bold text-foreground">{card.cardNumber}</span></div>
                          <div>CVV: <span className="font-mono text-foreground">{card.cvv}</span></div>
                        </div>

                        {/* Actions on Card */}
                        <div className="flex gap-2 pt-2 border-t flex-wrap justify-end">
                          {card.status === 'pending_retrieval' && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] h-7 px-3 rounded-lg"
                              onClick={() => handleAction('confirm-delivery', { cardId: card.id })}
                            >
                              <Check className="size-3 mr-1" />
                              Confirmer la remise
                            </Button>
                          )}
                          
                          {card.status === 'active' || card.status === 'delivered' || card.status === 'pending_retrieval' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-purple-200 text-purple-600 hover:bg-purple-50 text-[10px] h-7 px-3 rounded-lg"
                              onClick={() => handleAction('suspend-card', { cardId: card.id })}
                            >
                              Suspendre Carte
                            </Button>
                          ) : card.status === 'suspended' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-[10px] h-7 px-3 rounded-lg"
                              onClick={() => handleAction('unblock-card', { cardId: card.id })}
                            >
                              Réactiver Carte
                            </Button>
                          ) : null}

                          {card.status !== 'blocked' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 text-[10px] h-7 px-3 rounded-lg"
                              onClick={() => handleAction('block-card', { cardId: card.id, reason: 'Bloquée par l\'administrateur' })}
                            >
                              Bloquer Carte
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Transaction History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-[#0D5C63]" />
              Historique : {historyTarget?.name}
            </DialogTitle>
            <DialogDescription>
              Retrouvez les flux de recharges et dépenses de cet enfant.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[300px]">
            {loadingHistory ? (
              <div className="flex justify-center pt-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#0D5C63]" />
              </div>
            ) : historyList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-10">
                Aucun historique de transaction trouvé pour cet enfant.
              </p>
            ) : (
              <div className="space-y-2">
                {historyList.map((tx) => {
                  const isRecharge = tx.type === 'child_recharge';
                  return (
                    <div key={tx.id} className="p-3 border rounded-xl flex items-center justify-between text-xs bg-muted/20">
                      <div>
                        <p className="font-semibold text-foreground">{tx.description || (isRecharge ? 'Recharge' : 'Paiement Marchand')}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {isRecharge ? `Reçu du parent` : `Débité`} • {new Date(tx.createdAt).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <span className={`font-bold ${isRecharge ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {isRecharge ? '+' : '-'}{tx.currency === 'FC' ? '' : '$'}{tx.amount.toFixed(tx.currency === 'FC' ? 0 : 2)} {tx.currency}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setHistoryOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
