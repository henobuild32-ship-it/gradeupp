'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Send, ArrowDownToLine, ArrowUpFromLine, History, Phone, Store,
  BadgeCheck, Activity, UserPlus, ShieldCheck, Wallet, Globe, MessageSquare,
  Copy, Check, ArrowUpRight, ArrowDownLeft, CreditCard, Clock, ChevronRight,
  QrCode, MessageCircle, Link, Handshake, Repeat, Radio, FileText, PiggyBank,
  Target, BarChart3, Contact, Gift, Search, User, Zap, TrendingUp, Eye, EyeOff,
  ChevronDown, Sparkles, ArrowRight, Wifi, Lock, Star, BookOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import TraitCard from '@/components/trait/TraitCard';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { NotificationBadge } from '@/components/layout/NotificationBadge';

interface UserCard {
  id: string;
  cardType: 'USD' | 'FC';
  cardNumber: string;
  cvv: string;
  qrCode: string;
  expiryDate: string;
  status: string;
}

interface PendingRequest {
  id: string;
  cardType: string;
  status: string;
  createdAt: string;
}

interface HistoryItem {
  id: string;
  type: string;
  amount: number;
  fee: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
}

const primaryActions = [
  { label: 'Envoyer', icon: Send, page: 'send' as const, gradient: 'from-[#0D5C63] to-[#14888F]' },
  { label: 'Retirer', icon: ArrowDownToLine, page: 'withdraw' as const, gradient: 'from-[#DC2626] to-[#EF4444]' },
  { label: 'Déposer', icon: ArrowUpFromLine, page: 'deposit' as const, gradient: 'from-[#059669] to-[#10B981]' },
  { label: 'QR Code', icon: QrCode, page: 'my-qr-code' as const, gradient: 'from-[#7C3AED] to-[#A78BFA]' },
];

const serviceCategories = [
  {
    title: 'Finance',
    items: [
      { label: 'Transfert international', icon: Globe, page: 'international-transfer' as const, color: '#7C3AED' },
      { label: 'Factures', icon: FileText, page: 'bills' as const, color: '#CA8A04' },
      { label: 'Épargne', icon: Target, page: 'savings-goals' as const, color: '#0284C7' },
      { label: 'Microcrédits', icon: PiggyBank, page: 'micro-credit' as const, color: '#059669' },
    ],
  },
  {
    title: 'Services',
    items: [
      { label: 'Marché', icon: Store, page: 'marketplace' as const, color: '#0891B2' },
      { label: 'Paiements récurrents', icon: Repeat, page: 'recurring-payments' as const, color: '#7C3AED' },
      { label: 'Recharge', icon: Radio, page: 'bundle-catalog' as const, color: '#E11D48' },
      { label: 'Liens de paiement', icon: Link, page: 'payment-links' as const, color: '#0D9488' },
    ],
  },
  {
    title: 'Social',
    items: [
      { label: 'Parrainage', icon: Gift, page: 'referral' as const, color: '#C026D3' },
      { label: 'Contacts', icon: Contact, page: 'contact-pay' as const, color: '#65A30D' },
      { label: 'USSD', icon: Phone, page: 'ussd' as const, color: '#7C3AED' },
      { label: 'Analytics', icon: BarChart3, page: 'analytics' as const, color: '#0891B2' },
    ],
  },
];

const agentActions = [
  { label: 'Dépôt client', icon: UserPlus, page: 'agent-deposit' as const, color: '#0D5C63' },
  { label: 'Valider retrait', icon: ShieldCheck, page: 'agent-withdraw-validate' as const, color: '#059669' },
  { label: 'Activité', icon: Activity, page: 'agent-activity' as const, color: '#D97706' },
  { label: 'Messages', icon: MessageSquare, page: 'agent-messages' as const, color: '#DC2626' },
  { label: 'Marketplace', icon: Store, page: 'marketplace' as const, color: '#0891B2' },
  { label: 'USSD', icon: Phone, page: 'ussd' as const, color: '#7C3AED' },
  { label: 'QR Code', icon: QrCode, page: 'my-qr-code' as const, color: '#4F46E5' },
  { label: 'Support', icon: MessageCircle, page: 'support' as const, color: '#0D9488' },
];

function getTypeIcon(type: string) {
  switch (type) {
    case 'send': return ArrowUpRight;
    case 'receive': return ArrowDownLeft;
    case 'deposit': return ArrowDownLeft;
    case 'withdrawal': return ArrowUpRight;
    default: return History;
  }
}

function fmtCurrency(amount: number, currency: string) {
  const symbol = currency === 'FC' ? '' : '$';
  return `${symbol}${amount.toFixed(2)} ${currency === 'FC' ? 'FC' : 'USD'}`;
}

function formatDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function HomeScreen() {
  const { user, navigateTo, setUser, language, setLanguage } = useAppStore();
  const { t } = useTranslation();
  const [recentTransactions, setRecentTransactions] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [activeCategory, setActiveCategory] = useState(0);

  const isAgent = user?.role === 'agent';
  const realBalanceUSD = user?.realBalance ?? 0;
  const bonusBalanceUSD = user?.bonusBalance ?? 0;
  const totalUSD = realBalanceUSD + bonusBalanceUSD;
  const realBalanceFC = user?.realBalanceFC ?? 0;
  const bonusBalanceFC = user?.bonusBalanceFC ?? 0;
  const totalFC = realBalanceFC + bonusBalanceFC;

  const agentCode = user?.agentCode || user?.agentNumber;
  const displayAgentCode = agentCode ? (agentCode.startsWith('AGT-') ? agentCode : `AGT-${agentCode}`) : null;
  const { subscribe } = usePushSubscription();

  useEffect(() => {
    if (language !== 'fr') setLanguage('fr');
  }, [language, setLanguage]);

  useEffect(() => {
    fetchRecentTransactions();
    refreshUserBalance();
    fetchUserCards();
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const perm = Notification.permission;
      if (perm === 'granted') subscribe().catch(() => {});
      else if (perm !== 'denied') {
        Notification.requestPermission().then((r) => { if (r === 'granted') subscribe().catch(() => {}); });
      }
    }
    const interval = setInterval(() => refreshUserBalance(), 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  async function refreshUserBalance() {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/auth/profile?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser({ ...user, realBalance: data.user.realBalance, realBalanceFC: data.user.realBalanceFC, bonusBalance: data.user.bonusBalance, bonusBalanceFC: data.user.bonusBalanceFC } as any);
        }
      }
    } catch {}
  }

  async function fetchRecentTransactions() {
    if (!user?.id) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/transfer/history?userId=${user.id}`);
      const data = await res.json();
      if (data.success) setRecentTransactions((data.history ?? []).slice(0, 5));
    } catch {} finally { setLoading(false); }
  }

  async function fetchUserCards() {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/cards/my-cards?userId=${user.id}`);
      const data = await res.json();
      if (data.success) { setUserCards(data.cards || []); setPendingRequests(data.pendingRequests || []); }
    } catch {}
  }

  const hasCards = userCards.length > 0;
  const hasPendingRequests = pendingRequests.length > 0;
  const showCardButton = !isAgent && !hasCards && !hasPendingRequests;

  function handleCopyCode() {
    if (!displayAgentCode) return;
    navigator.clipboard?.writeText(displayAgentCode);
    setCodeCopied(true);
    toast.success('Code copié !');
    setTimeout(() => setCodeCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] pb-24">
      {/* ════════════ HEADER ════════════ */}
      <header className="sticky top-0 z-30 bg-[#0a0a1a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-gradient-to-br from-[#0D5C63] to-[#14888F] flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20">
              <Image src="/trait-logo.png" alt="TRAIT" width={28} height={28} className="object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">Bienvenue</p>
              <h1 className="text-[15px] font-bold text-white truncate">{user?.name || user?.pseudo || 'User'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBadge onClick={() => navigateTo('notifications')} />
            <button onClick={() => navigateTo('profile')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0D5C63] to-[#14888F] flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="px-5 pt-6 space-y-6">
        {/* ════════════ BALANCE HERO ════════════ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D5C63]/20 to-[#14888F]/20 rounded-3xl blur-xl" />
          <div className="relative rounded-3xl bg-gradient-to-br from-[#0f1729] to-[#0a1020] border border-white/10 p-6 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[#0D5C63]/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-[#14888F]/10 blur-2xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#00D4AA]" />
                  <p className="text-[11px] text-gray-400 font-semibold tracking-wider uppercase">Solde total</p>
                </div>
                <button onClick={() => setShowBalance(!showBalance)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  {showBalance ? <Eye className="w-3.5 h-3.5 text-gray-400" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              </div>

              <div className="flex items-baseline gap-3 mb-5">
                <p className="text-4xl font-black text-white tracking-tight">
                  {showBalance ? `$${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
                </p>
                <p className="text-lg font-bold text-gray-500">USD</p>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 rounded-xl bg-white/5 p-3">
                  <p className="text-[9px] text-gray-500 font-semibold tracking-wider uppercase mb-1">FC</p>
                  <p className="text-lg font-bold text-white">
                    {showBalance ? totalFC.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '••••'}
                  </p>
                </div>
                <div className="flex-1 rounded-xl bg-white/5 p-3">
                  <p className="text-[9px] text-gray-500 font-semibold tracking-wider uppercase mb-1">Bonus</p>
                  <p className="text-lg font-bold text-[#00D4AA]">
                    {showBalance ? `$${bonusBalanceUSD.toFixed(2)}` : '••••'}
                  </p>
                </div>
              </div>

              {/* Quick action row */}
              <div className="flex gap-2">
                {primaryActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <motion.button key={action.page} whileTap={{ scale: 0.95 }}
                      onClick={() => navigateTo(action.page)}
                      className="flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-300">{action.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ════════════ AGENT CODE ════════════ */}
        {isAgent && displayAgentCode && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 bg-[#0f1729] border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0D5C63]/20 flex items-center justify-center shrink-0">
                <BadgeCheck className="w-5 h-5 text-[#00D4AA]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">Code Agent</p>
                <p className="text-lg font-bold font-mono text-[#00D4AA] tracking-wider">{displayAgentCode}</p>
              </div>
              <button onClick={handleCopyCode} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                {codeCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-400" />}
              </button>
            </div>
          </motion.div>
        )}

        {/* ════════════ CARDS SECTION ════════════ */}
        {!isAgent && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#00D4AA]" />
                Mes Cartes
              </h2>
              <button onClick={() => navigateTo('card')} className="text-[11px] font-semibold text-[#00D4AA] hover:opacity-80">
                Voir tout
              </button>
            </div>

            {hasCards && (
              <div className="space-y-3">
                {userCards.map((card) => (
                  <TraitCard key={card.id} cardType={card.cardType} cardNumber={card.cardNumber}
                    cardHolder={user?.name || user?.pseudo || 'TRAIT USER'} expiryDate={card.expiryDate}
                    cvv={card.cvv} qrCode={card.qrCode}
                    balance={card.cardType === 'USD' ? (user?.realBalance ?? 0) : (user?.realBalanceFC ?? 0)}
                    status={card.status} />
                ))}
              </div>
            )}

            {hasPendingRequests && !hasCards && (
              <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">Carte en cours de traitement</p>
                    <p className="text-[11px] text-gray-400">Votre demande est en cours de validation.</p>
                  </div>
                </div>
              </div>
            )}

            {showCardButton && (
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigateTo('card-request')}
                className="w-full rounded-2xl p-4 bg-gradient-to-r from-[#0D5C63] to-[#14888F] hover:shadow-lg hover:shadow-teal-500/20 transition-all relative overflow-hidden">
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-bold text-white">Demander une carte</p>
                    <p className="text-[10px] text-white/60">Carte virtuelle sécurisée</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/60" />
                </div>
              </motion.button>
            )}
          </motion.section>
        )}

        {/* ════════════ SERVICES GRID ════════════ */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#00D4AA]" />
              Services
            </h2>
          </div>

          {!isAgent ? (
            <>
              {/* Category tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {serviceCategories.map((cat, i) => (
                  <button key={cat.title} onClick={() => setActiveCategory(i)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all ${
                      activeCategory === i
                        ? 'bg-[#0D5C63] text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}>
                    {cat.title}
                  </button>
                ))}
              </div>

              {/* Services grid */}
              <div className="grid grid-cols-4 gap-2">
                {serviceCategories[activeCategory].items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.button key={item.page} whileTap={{ scale: 0.95 }}
                      onClick={() => navigateTo(item.page)}
                      className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-[#0f1729] border border-white/5 hover:border-white/10 transition-all">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}20` }}>
                        <Icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <span className="text-[9px] font-semibold text-gray-400 text-center leading-tight px-1">
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Extra services */}
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  { label: 'Historique', icon: History, page: 'history' as const, color: '#D97706' },
                  { label: 'Demande', icon: Handshake, page: 'payment-requests' as const, color: '#EA580C' },
                  { label: 'Support', icon: MessageCircle, page: 'support' as const, color: '#0D9488' },
                  { label: 'Espace Vendeur', icon: Store, page: ('seller-dashboard' as const), color: '#DB2777' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.button key={item.page} whileTap={{ scale: 0.95 }}
                      onClick={() => navigateTo(item.page)}
                      className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-[#0f1729] border border-white/5 hover:border-white/10 transition-all">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}20` }}>
                        <Icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <span className="text-[9px] font-semibold text-gray-400 text-center leading-tight px-1">
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {agentActions.map((item) => {
                const Icon = item.icon;
                return (
                    <motion.button key={item.page} whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (item.label === 'Espace Vendeur') navigateTo(user?.role === 'seller' ? 'seller-dashboard' : 'seller-register');
                        else navigateTo(item.page);
                      }}
                    className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-[#0f1729] border border-white/5 hover:border-white/10 transition-all">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}20` }}>
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <span className="text-[9px] font-semibold text-gray-400 text-center leading-tight px-1">
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* ════════════ RECENT TRANSACTIONS ════════════ */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00D4AA]" />
              Transactions récentes
            </h2>
            <button onClick={() => navigateTo('history')} className="text-[11px] font-semibold text-[#00D4AA]">
              Tout voir
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-[#0f1729] border border-white/5">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0 bg-white/5" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-3/4 bg-white/5" /><Skeleton className="h-3 w-1/2 bg-white/5" /></div>
                  <Skeleton className="h-4 w-20 bg-white/5" />
                </div>
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="rounded-2xl p-8 bg-[#0f1729] border border-white/5 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                <History className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Aucune transaction</p>
              <p className="text-[11px] text-gray-600 mt-1">
                {isAgent ? 'Vos transactions apparaîtront ici' : 'Commencez par envoyer de l\'argent'}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentTransactions.map((tx, i) => {
                const TypeIcon = getTypeIcon(tx.type);
                const isReceive = tx.type === 'receive' || tx.type === 'deposit';
                return (
                  <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0f1729] border border-white/5 hover:border-white/10 transition-all">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${isReceive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      <TypeIcon className="w-[18px] h-[18px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">{tx.description}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{formatDate(tx.createdAt)}</p>
                    </div>
                    <p className={`text-[13px] font-bold ${isReceive ? 'text-green-400' : 'text-red-400'}`}>
                      {isReceive ? '+' : '-'}{fmtCurrency(tx.amount, tx.currency)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* ════════════ TRAIT IA ════════════ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <button onClick={() => navigateTo('trait-ai-welcome')}
            className="w-full bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border border-violet-500/20 rounded-2xl p-4 flex items-center gap-3 hover:from-violet-600/20 hover:to-indigo-600/20 hover:border-violet-500/30 transition-all">
            <div className="relative w-10 h-10 shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 blur-sm opacity-60" />
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-violet-400">Besoin d&apos;aide ?</p>
              <p className="text-xs text-gray-500">Parler à TRAIT IA</p>
            </div>
            <ArrowRight className="w-4 h-4 text-violet-400/60" />
          </button>
        </motion.div>
      </main>
    </div>
  );
}
