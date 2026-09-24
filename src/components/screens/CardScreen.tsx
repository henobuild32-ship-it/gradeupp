'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  CreditCard, 
  Loader2, 
  Clock, 
  XCircle, 
  Plus, 
  Wallet, 
  ChevronRight,
  UserPlus,
  TrendingUp,
  History,
  Lock,
  DollarSign,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import TraitCard from '@/components/trait/TraitCard';

interface CardData {
  id: string;
  cardType: 'USD' | 'FC';
  cardNumber: string;
  cvv: string;
  qrCode: string;
  expiryDate: string;
  status: string;
  createdAt: string;
}

interface PendingRequest {
  id: string;
  cardType: 'USD' | 'FC';
  status: string;
  rejectReason: string | null;
  createdAt: string;
}

interface ChildCardData {
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
  cards: ChildCardData[];
}

interface TransactionHistory {
  id: string;
  type: string;
  amount: number;
  fee: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
  receiver?: {
    name: string;
    phone: string;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: '#F59E0B', icon: Clock },
  approved: { label: 'Approuvée', color: '#10B981', icon: Plus },
  rejected: { label: 'Refusée', color: '#EF4444', icon: XCircle },
  suspended: { label: 'Suspendue', color: '#8B5CF6', icon: XCircle },
};

export default function CardScreen() {
  const { user, navigateTo } = useAppStore();
  
  // State for original card screen
  const [cards, setCards] = useState<CardData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // States for child sponsorship tabs
  const [childUsers, setChildUsers] = useState<ChildUser[]>([]);
  const [rechargeHistory, setRechargeHistory] = useState<TransactionHistory[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'my' | 'children' | 'recharge'>('my');

  // Recharge form states
  const [selectedChildId, setSelectedChildId] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeCurrency, setRechargeCurrency] = useState<'USD' | 'FC'>('USD');
  const [parentConfirmCode, setParentConfirmCode] = useState('');
  const [processing, setProcessing] = useState(false);

  // Fetch all cards and child profiles
  const fetchAllCardData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch parent's cards
      const res = await fetch(`/api/cards/my-cards?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setCards(data.cards || []);
        setPendingRequests(data.pendingRequests || []);
      }

      // 2. Fetch children cards
      const childRes = await fetch(`/api/cards/child/list?parentId=${user.id}`);
      const childData = await childRes.json();
      if (childData.success) {
        setChildUsers(childData.children || []);
        setRechargeHistory(childData.recharges || []);
        
        if (childData.children && childData.children.length > 0 && !selectedChildId) {
          setSelectedChildId(childData.children[0].id);
        }
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCardData();
  }, [user?.id]);

  function getCardBalance(cardType: 'USD' | 'FC'): number {
    return cardType === 'USD'
      ? (user?.realBalance ?? 0)
      : (user?.realBalanceFC ?? 0);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(rechargeAmount);
    if (!selectedChildId) {
      toast.error("Veuillez sélectionner un enfant");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Veuillez entrer un montant valide supérieur à 0");
      return;
    }
    if (!parentConfirmCode) {
      toast.error("Veuillez entrer votre PIN ou mot de passe de confirmation");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/cards/child/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: user?.id,
          childId: selectedChildId,
          amount: parsedAmount,
          currency: rechargeCurrency,
          pinOrPassword: parentConfirmCode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Recharge effectuée');
        setRechargeAmount('');
        setParentConfirmCode('');
        await fetchAllCardData(); // Refresh all
      } else {
        toast.error(data.message || "Erreur lors de la recharge");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setProcessing(false);
    }
  };

  const getChildStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_retrieval':
        return { label: 'En attente de retrait', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30' };
      case 'delivered':
        return { label: 'Carte remise', color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30' };
      case 'active':
        return { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/30' };
      case 'suspended':
        return { label: 'Suspendue', color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/30' };
      case 'blocked':
        return { label: 'Bloquée', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/30' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-400' };
    }
  };

  const selectedChild = childUsers.find(c => c.id === selectedChildId);

  // Loading state
  if (loading && cards.length === 0 && childUsers.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0D5C63] mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Chargement de vos cartes...</p>
        </div>
      </div>
    );
  }

  const hasContent = cards.length > 0 || pendingRequests.length > 0;
  const hasChildren = childUsers.length > 0;

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
        <h1 className="text-xl font-bold text-foreground">Mes Cartes</h1>
      </div>

      {/* Tabs list: ONLY shows if there is at least one child card created */}
      {hasChildren && (
        <div className="flex px-4 border-b border-border mb-6">
          <button
            onClick={() => setActiveSubTab('my')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 text-center transition-all ${
              activeSubTab === 'my'
                ? 'border-[#0D5C63] text-[#0D5C63]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Mes Cartes
          </button>
          <button
            onClick={() => setActiveSubTab('children')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 text-center transition-all ${
              activeSubTab === 'children'
                ? 'border-[#0D5C63] text-[#0D5C63]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Cartes Enfants ({childUsers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('recharge')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 text-center transition-all ${
              activeSubTab === 'recharge'
                ? 'border-[#0D5C63] text-[#0D5C63]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Recharger Enfant
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* === TAB 1: MES CARTES === */}
        {activeSubTab === 'my' && (
          <motion.div
            key="my"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-6 space-y-6"
          >
            {!hasContent ? (
              <div className="flex flex-col items-center justify-center pt-16">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center mb-5">
                  <CreditCard className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Aucune carte</h2>
                <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
                  Vous n&apos;avez pas encore de carte TRAIT. Demandez une carte numérique ou créez une carte pour quelqu&apos;un d&apos;autre.
                </p>
                <Button
                  className="w-full max-w-xs h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
                  onClick={() => navigateTo('card-request')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Demander une carte
                </Button>
                <Button
                  variant="outline"
                  className="w-full max-w-xs h-12 mt-3 font-semibold rounded-xl"
                  onClick={() => navigateTo('child-sponsorship')}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Créer une carte pour quelqu&apos;un
                </Button>
              </div>
            ) : (
              <>
                {/* Create card for someone else — always visible */}
                <div className="mb-4">
                  <Button
                    variant="outline"
                    className="w-full h-12 font-semibold rounded-xl border-dashed"
                    onClick={() => navigateTo('child-sponsorship')}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Créer une carte pour quelqu&apos;un
                  </Button>
                </div>

                {/* Active cards */}
                {cards.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        Cartes actives ({cards.length})
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-[#0D5C63] hover:text-[#0D5C63]/80 h-7 px-2"
                        onClick={() => navigateTo('card-request')}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Demander
                      </Button>
                    </div>

                    <div className="space-y-5">
                      {cards.map((card, index) => {
                        const balance = getCardBalance(card.cardType);
                        const isUSD = card.cardType === 'USD';
                        const accentColor = isUSD ? '#14888F' : '#EF4444';

                        return (
                          <div key={card.id}>
                            <TraitCard
                              cardType={card.cardType}
                              cardNumber={card.cardNumber}
                              cardHolder={user?.name || 'TITULAIRE'}
                              expiryDate={card.expiryDate}
                              cvv={card.cvv}
                              qrCode={card.qrCode}
                              balance={balance}
                              status={card.status}
                            />

                            <div className="mt-3 space-y-2">
                              <Button
                                className="w-full h-11 rounded-xl font-semibold text-sm bg-[#0f1b2d] hover:bg-[#0f1b2d]/90 text-white dark:bg-[#3ddc97] dark:text-[#0f1b2d] dark:hover:bg-[#3ddc97]/90"
                                onClick={() => navigateTo('virtual-card', { cardId: card.id })}
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Ma carte virtuelle
                                <ChevronRight className="w-4 h-4 ml-auto" />
                              </Button>
                              <Button
                                variant="outline"
                                className="w-full h-11 rounded-xl font-medium text-sm"
                                style={{
                                  borderColor: `${accentColor}40`,
                                  color: accentColor,
                                }}
                                onClick={() => navigateTo('card-payment')}
                              >
                                <Wallet className="w-4 h-4 mr-2" />
                                Paiement par carte {card.cardType}
                                <ChevronRight className="w-4 h-4 ml-auto" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pending requests */}
                {pendingRequests.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      Demandes en cours ({pendingRequests.length})
                    </p>

                    <div className="space-y-3">
                      {pendingRequests.map((request) => {
                        const config = statusConfig[request.status] || statusConfig.pending;
                        const StatusIcon = config.icon;
                        const isUSD = request.cardType === 'USD';
                        const accentColor = isUSD ? '#14888F' : '#EF4444';

                        return (
                          <Card key={request.id} className="border-border shadow-sm">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: `${accentColor}15` }}
                                >
                                  <CreditCard
                                    className="w-5 h-5"
                                    style={{ color: accentColor }}
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                      Carte TRAIT {request.cardType}
                                    </p>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] shrink-0 font-bold"
                                      style={{
                                        backgroundColor: `${config.color}15`,
                                        color: config.color,
                                      }}
                                    >
                                      <StatusIcon className="w-2.5 h-2.5 mr-1" />
                                      {config.label}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Demandée le {formatDate(request.createdAt)}
                                  </p>
                                  {request.rejectReason && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Raison : {request.rejectReason}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* === TAB 2: CARTES ENFANTS === */}
        {activeSubTab === 'children' && (
          <motion.div
            key="children"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-6 space-y-6"
          >
            {childUsers.map((child) => (
              <div key={child.id} className="p-4 border rounded-2xl bg-card/60 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-base text-foreground">{child.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Tél virtuel: {child.phone}</p>
                  </div>
                  {child.suspended && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-800 font-bold dark:bg-red-950/40 dark:text-red-400">
                      Suspendu
                    </span>
                  )}
                </div>

                {child.cards.map((card) => {
                  const statConfig = getChildStatusBadge(card.status);
                  return (
                    <div key={card.id} className="space-y-3">
                      <TraitCard
                        cardType={card.cardType}
                        cardNumber={card.cardNumber}
                        cardHolder={child.name}
                        expiryDate={card.expiryDate}
                        cvv={card.cvv}
                        qrCode={card.qrCode}
                        balance={card.cardType === 'USD' ? child.realBalance : child.realBalanceFC}
                        status={card.status === 'pending_retrieval' || card.status === 'delivered' ? 'active' : card.status}
                      />
                      
                      <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-xl border border-border/60">
                        <span className="text-[11px] font-medium text-muted-foreground">Statut de la carte physique :</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statConfig.color}`}>
                          {statConfig.label}
                        </span>
                      </div>
                    </div>
                  );
                })}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl text-xs h-9"
                    onClick={() => {
                      setSelectedChildId(child.id);
                      setActiveSubTab('recharge');
                    }}
                  >
                    Recharger la carte
                  </Button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* === TAB 3: RECHARGER ENFANT === */}
        {activeSubTab === 'recharge' && (
          <motion.div
            key="recharge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-6 space-y-6"
          >
            <Card className="border-border shadow-md">
              <CardContent className="p-5">
                <form onSubmit={handleRecharge} className="space-y-4">
                  {/* Select Child */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Enfant à recharger</label>
                    <select
                      className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C63]"
                      value={selectedChildId}
                      onChange={(e) => setSelectedChildId(e.target.value)}
                    >
                      <option value="">Sélectionnez un enfant...</option>
                      {childUsers.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.name} ({child.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Child Balance info */}
                  {selectedChild && (
                    <div className="p-3 bg-muted/60 rounded-xl border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Solde de l&apos;enfant :</span>
                      <span className="text-sm font-bold text-foreground">
                        {selectedChild.realBalance.toFixed(2)} USD / {selectedChild.realBalanceFC.toFixed(0)} CDF
                      </span>
                    </div>
                  )}

                  {/* Amount */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Montant de la recharge</label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={rechargeAmount}
                        onChange={(e) => setRechargeAmount(e.target.value)}
                        className="pr-16"
                        disabled={processing}
                        required
                      />
                      <div className="absolute right-1 top-1 bottom-1 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setRechargeCurrency('USD')}
                          className={`px-2.5 rounded-lg text-xs font-bold transition-all ${
                            rechargeCurrency === 'USD'
                              ? 'bg-[#0D5C63] text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          USD
                        </button>
                        <button
                          type="button"
                          onClick={() => setRechargeCurrency('FC')}
                          className={`px-2.5 rounded-lg text-xs font-bold transition-all ${
                            rechargeCurrency === 'FC'
                              ? 'bg-[#EF4444] text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          CDF
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Votre solde dispo : {rechargeCurrency === 'USD' ? `$${(user?.realBalance ?? 0).toFixed(2)} USD` : `${(user?.realBalanceFC ?? 0).toLocaleString('fr-FR')} CDF`}
                    </p>
                  </div>

                  {/* Password / PIN parent */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Lock className="size-3.5 text-muted-foreground" />
                      Confirmation (PIN ou MDP parent)
                    </label>
                    <Input
                      type="password"
                      placeholder="Entrez votre PIN ou mot de passe"
                      value={parentConfirmCode}
                      onChange={(e) => setParentConfirmCode(e.target.value)}
                      disabled={processing}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white font-semibold h-11 rounded-xl mt-4"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      'Confirmer le transfert'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* History */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <History className="size-4 text-[#0D5C63]" />
                Historique des Recharges
              </h3>

              {rechargeHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4 bg-muted/20 border rounded-xl">
                  Aucune recharge effectuée.
                </p>
              ) : (
                <div className="space-y-2">
                  {rechargeHistory.map((item) => (
                    <div key={item.id} className="p-3 bg-card border rounded-xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center">
                          <TrendingUp className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">Recharge Enfant</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(item.createdAt).toLocaleString('fr-FR')}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        +{item.currency === 'FC' ? '' : '$'}{item.amount.toFixed(item.currency === 'FC' ? 0 : 2)} {item.currency}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
