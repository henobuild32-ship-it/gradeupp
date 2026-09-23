'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  UserPlus, 
  CreditCard, 
  TrendingUp, 
  History, 
  Lock, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  TrendingDown,
  DollarSign,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import TraitCard from '@/components/trait/TraitCard';

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
  sender?: {
    name: string;
    phone: string;
  };
}

export default function ChildSponsorshipScreen() {
  const { user, navigateTo, goBack } = useAppStore();
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'recharge'>('create');
  
  // Create Child form states
  const [childName, setChildName] = useState('');
  const [createCardType, setCreateCardType] = useState<'USD' | 'FC'>('USD');
  const [childPin, setChildPin] = useState('');
  
  // Recharge form states
  const [selectedChildId, setSelectedChildId] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeCurrency, setRechargeCurrency] = useState<'USD' | 'FC'>('USD');
  const [parentConfirmCode, setParentConfirmCode] = useState('');
  
  // Data states
  const [children, setChildren] = useState<ChildUser[]>([]);
  const [rechargeHistory, setRechargeHistory] = useState<TransactionHistory[]>([]);
  const [expenseHistory, setExpenseHistory] = useState<TransactionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch children and history
  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/cards/child/list?parentId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setChildren(data.children || []);
        setRechargeHistory(data.recharges || []);
        setExpenseHistory(data.expenses || []);
        
        // Auto-select first child if not selected
        if (data.children && data.children.length > 0) {
          setSelectedChildId(data.children[0].id);
          // If child exists, switch to the list tab default
          setActiveTab('list');
        } else {
          setActiveTab('create');
        }
      }
    } catch (err) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = childName.trim();
    if (!trimmedName) {
      toast.error("Veuillez entrer le nom de l'enfant");
      return;
    }
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmedName)) {
      toast.error("Le nom de l'enfant ne doit contenir que des lettres");
      return;
    }
    if (!childPin || childPin.length !== 4) {
      toast.error("Le PIN de l'enfant est obligatoire et doit contenir 4 chiffres");
      return;
    }

    setProcessing(true);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/cards/child/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: user?.id,
          childName: childName.trim(),
          cardType: createCardType,
          pin: childPin || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message);
        toast.success("Compte enfant créé !");
        setChildName('');
        setChildPin('');
        await fetchData(); // Refresh data
      } else {
        toast.error(data.message || "Erreur de création");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setProcessing(false);
    }
  };

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
        await fetchData(); // Refresh
      } else {
        toast.error(data.message || "Erreur lors de la recharge");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
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
        return { label: status, color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800' };
    }
  };

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={goBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Parrainage Enfant</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center pt-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#0D5C63]" />
          <p className="text-xs text-muted-foreground mt-2">Chargement du module de parrainage...</p>
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {/* Navigation Onglets */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 text-center transition-all ${
                activeTab === 'create'
                  ? 'border-[#0D5C63] text-[#0D5C63]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <UserPlus className="size-4" />
                Créer Profil
              </span>
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 text-center transition-all ${
                activeTab === 'list'
                  ? 'border-[#0D5C63] text-[#0D5C63]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <CreditCard className="size-4" />
                Mes Enfants ({children.length})
              </span>
            </button>
            {children.length > 0 && (
              <button
                onClick={() => setActiveTab('recharge')}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 text-center transition-all ${
                  activeTab === 'recharge'
                    ? 'border-[#0D5C63] text-[#0D5C63]'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <TrendingUp className="size-4" />
                  Recharger
                </span>
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {/* === TAB CREATION === */}
            {activeTab === 'create' && (
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                {successMessage ? (
                  <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/10">
                    <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                        <CheckCircle className="size-8" />
                      </div>
                      <h3 className="font-bold text-foreground text-base">Carte créee avec succès !</h3>
                      <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed max-w-sm">
                        {successMessage}
                      </p>
                      <Button 
                        onClick={() => {
                          setSuccessMessage(null);
                          setActiveTab('list');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl mt-2"
                      >
                        Voir la carte de mon enfant
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold">Nouveau Compte Enfant</CardTitle>
                      <CardDescription className="text-xs">
                        Créez un compte pour votre enfant et recevez sa carte TRAIT associée. Le solde de départ sera de 0.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleCreateChild} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-foreground">Nom de l&apos;enfant</label>
                          <Input
                            placeholder="Ex: David Mukendi"
                            value={childName}
                            onChange={(e) => setChildName(e.target.value)}
                            disabled={processing}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-foreground">Type de carte</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setCreateCardType('USD')}
                              className={`py-3.5 rounded-xl border text-center font-semibold text-sm transition-all flex flex-col items-center justify-center gap-1 ${
                                createCardType === 'USD'
                                  ? 'border-[#0D5C63] bg-[#0D5C63]/5 text-[#0D5C63] dark:bg-blue-950/20'
                                  : 'border-border text-muted-foreground hover:bg-muted/50'
                              }`}
                            >
                              <DollarSign className="size-4" />
                              Compte USD ($)
                            </button>
                            <button
                              type="button"
                              onClick={() => setCreateCardType('FC')}
                              className={`py-3.5 rounded-xl border text-center font-semibold text-sm transition-all flex flex-col items-center justify-center gap-1 ${
                                createCardType === 'FC'
                                  ? 'border-[#EF4444] bg-[#EF4444]/5 text-[#EF4444] dark:bg-red-950/20'
                                  : 'border-border text-muted-foreground hover:bg-muted/50'
                              }`}
                            >
                              <Smartphone className="size-4" />
                              Compte CDF (FC)
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-foreground flex justify-between">
                            PIN de l&apos;enfant (Obligatoire)
                            <span className="text-[10px] font-normal text-muted-foreground">(4 chiffres)</span>
                          </label>
                          <Input
                            type="password"
                            placeholder="Code PIN à 4 chiffres (ex: 1234)"
                            maxLength={4}
                            value={childPin}
                            onChange={(e) => setChildPin(e.target.value.replace(/\D/g, ''))}
                            disabled={processing}
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
                              Création en cours...
                            </>
                          ) : (
                            'Créer le profil et générer la carte'
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {/* === TAB LIST (MES ENFANTS) === */}
            {activeTab === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-5"
              >
                {children.length === 0 ? (
                  <Card className="border-dashed border-2 py-10 flex flex-col items-center text-center px-4">
                    <UserPlus className="size-10 text-muted-foreground mb-3 opacity-60" />
                    <p className="text-sm font-semibold text-foreground">Aucun profil enfant</p>
                    <p className="text-xs text-muted-foreground max-w-xs mt-1">
                      Vous n&apos;avez pas encore créé de compte enfant. Cliquez sur l&apos;onglet &quot;Créer Profil&quot; pour commencer.
                    </p>
                  </Card>
                ) : (
                  children.map((child) => (
                    <div key={child.id} className="space-y-3 p-4 rounded-2xl border bg-card/60 shadow-sm relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-base text-foreground">{child.name}</h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Tél virtuel: {child.phone}</p>
                        </div>
                        {child.suspended && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-800 font-semibold dark:bg-red-950/40 dark:text-red-400">
                            Compte Suspendu
                          </span>
                        )}
                      </div>

                      {child.cards.length > 0 ? (
                        child.cards.map((card) => {
                          const statusConfig = getStatusBadge(card.status);
                          return (
                            <div key={card.id} className="space-y-3">
                              {/* Renders TraitCard */}
                              <TraitCard
                                cardType={card.cardType}
                                cardNumber={card.cardNumber}
                                cardHolder={child.name}
                                expiryDate={card.expiryDate}
                                cvv={card.cvv}
                                qrCode={card.qrCode}
                                balance={card.cardType === 'USD' ? child.realBalance : child.realBalanceFC}
                                status={card.status === 'pending_retrieval' || card.status === 'delivered' ? 'active' : card.status} // Render as normal visual card style
                              />
                              
                              {/* Card Status Indicator */}
                              <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-xl border border-border/60">
                                <span className="text-[11px] font-medium text-muted-foreground">Statut de la carte physique :</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-red-500">Aucune carte associée à ce compte.</p>
                      )}

                      <div className="flex gap-2 mt-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedChildId(child.id);
                            setActiveTab('recharge');
                          }}
                          className="flex-1 rounded-xl text-xs h-9"
                        >
                          Recharger
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* === TAB RECHARGE === */}
            {activeTab === 'recharge' && (
              <motion.div
                key="recharge"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold">Recharger Carte Enfant</CardTitle>
                    <CardDescription className="text-xs">
                      Transférez instantanément des fonds de votre solde vers la carte de votre enfant.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRecharge} className="space-y-4">
                      {/* Sélection de l'enfant */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground">Sélectionner l&apos;enfant</label>
                        <select
                          className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C63] focus-visible:ring-offset-2"
                          value={selectedChildId}
                          onChange={(e) => setSelectedChildId(e.target.value)}
                        >
                          <option value="">Sélectionnez un enfant...</option>
                          {children.map((child) => (
                            <option key={child.id} value={child.id}>
                              {child.name} ({child.phone})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Solde actuel de l'enfant sélectionné */}
                      {selectedChild && (
                        <div className="p-3 bg-muted/60 rounded-xl border flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Solde actuel de l&apos;enfant :</span>
                          <span className="text-sm font-bold text-foreground">
                            {selectedChild.realBalance.toFixed(2)} USD / {selectedChild.realBalanceFC.toFixed(0)} CDF
                          </span>
                        </div>
                      )}

                      {/* Montant de recharge */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground">Montant à transférer</label>
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
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Votre solde dispo : {rechargeCurrency === 'USD' ? `$${(user?.realBalance ?? 0).toFixed(2)} USD` : `${(user?.realBalanceFC ?? 0).toLocaleString('fr-FR')} CDF`}
                        </p>
                      </div>

                      {/* PIN parent */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Lock className="size-3.5 text-muted-foreground" />
                          Confirmation par PIN ou Mot de passe parent
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
                            Transfert en cours...
                          </>
                        ) : (
                          'Confirmer et recharger'
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

              {/* === HISTORIQUE RECHARGES === */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <History className="size-4 text-[#0D5C63]" />
                  Historique des Recharges parentales
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
                            <p className="text-xs font-semibold text-foreground">Recharge pour {item.receiver?.name || 'Enfant'}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
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

              {/* === HISTORIQUE DEPENSES ENFANT === */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <TrendingDown className="size-4 text-red-500" />
                  Dépenses des enfants en temps réel
                </h3>

                {expenseHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4 bg-muted/20 border rounded-xl">
                    Aucune dépense enregistrée sur les cartes enfants.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {expenseHistory.map((item) => (
                      <div key={item.id} className="p-3 bg-card border rounded-xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center">
                            <TrendingDown className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{item.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Par : {item.sender?.name || 'Enfant'} • {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-red-600 dark:text-red-400">
                            -{item.currency === 'FC' ? '' : '$'}{(item.amount + item.fee).toFixed(item.currency === 'FC' ? 0 : 2)} {item.currency}
                          </span>
                          {item.fee > 0 && (
                            <p className="text-[9px] text-muted-foreground mt-0.5">Dont commission : {item.fee.toFixed(2)} {item.currency}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
