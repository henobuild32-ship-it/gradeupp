'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Send,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Phone,
  Store,
  BadgeCheck,
  Activity,
  UserPlus,
  ShieldCheck,
  Wallet,
  Globe,
  MessageSquare,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Clock,
  ChevronRight,
  QrCode,
  MessageCircle,
  Link,
  Handshake,
  Repeat,
  Radio,
  FileText,
  PiggyBank,
  Target,
  BarChart3,
  Contact,
  Gift,
  Search,
  X,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useTranslation, languages, languageNames, languageFlags, type Language } from '@/lib/i18n';
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

const clientPrimaryActions = [
  { labelKey: 'action.send', icon: Send, page: 'send' as const, color: '#0D5C63' },
  { labelKey: 'action.withdraw', icon: ArrowDownToLine, page: 'withdraw' as const, color: '#DC2626' },
  { labelKey: 'action.deposit', icon: ArrowUpFromLine, page: 'deposit' as const, color: '#059669' },
];

const clientSecondaryActions = [
  { labelKey: 'action.intl_transfer', icon: Globe, page: 'international-transfer' as const, color: '#7C3AED' },
  { labelKey: 'action.history', icon: History, page: 'history' as const, color: '#D97706' },
  { labelKey: 'action.marketplace', icon: Store, page: 'marketplace' as const, color: '#0891B2' },
  { labelKey: 'Mon QR Code', icon: QrCode, page: 'my-qr-code' as const, color: '#4F46E5' },
  { labelKey: 'Support', icon: MessageCircle, page: 'support' as const, color: '#0D9488' },
  { labelKey: 'Espace Service', icon: Store, page: 'seller-dashboard' as const, color: '#DB2777' },
  { labelKey: 'Liens de paie.', icon: Link, page: 'payment-links' as const, color: '#0D9488' },
  { labelKey: 'Demander', icon: Handshake, page: 'payment-requests' as const, color: '#EA580C' },
  { labelKey: 'Récurrent', icon: Repeat, page: 'recurring-payments' as const, color: '#7C3AED' },
  { labelKey: 'Recharge', icon: Radio, page: 'bundle-catalog' as const, color: '#E11D48' },
  { labelKey: 'Factures', icon: FileText, page: 'bills' as const, color: '#CA8A04' },
  { labelKey: 'Micro-crédit', icon: PiggyBank, page: 'micro-credit' as const, color: '#059669' },
  { labelKey: 'Épargne', icon: Target, page: 'savings-goals' as const, color: '#0284C7' },
  { labelKey: 'Parrainage', icon: Gift, page: 'referral' as const, color: '#C026D3' },
  { labelKey: 'Analytics', icon: BarChart3, page: 'analytics' as const, color: '#0891B2' },
  { labelKey: 'Contacts', icon: Contact, page: 'contact-pay' as const, color: '#65A30D' },
  { labelKey: 'USSD', icon: Phone, page: 'ussd' as const, color: '#7C3AED' },
];

const agentQuickActions = [
  { labelKey: 'action.agent_deposit', icon: UserPlus, page: 'agent-deposit' as const, color: '#0D5C63' },
  { labelKey: 'action.agent_validate', icon: ShieldCheck, page: 'agent-withdraw-validate' as const, color: '#059669' },
  { labelKey: 'action.agent_activity', icon: Activity, page: 'agent-activity' as const, color: '#D97706' },
  { labelKey: 'action.ussd', icon: Phone, page: 'ussd' as const, color: '#7C3AED' },
  { labelKey: 'action.marketplace', icon: Store, page: 'marketplace' as const, color: '#0891B2' },
  { labelKey: 'action.messages', icon: MessageSquare, page: 'agent-messages' as const, color: '#DC2626' },
  { labelKey: 'Mon QR Code', icon: QrCode, page: 'my-qr-code' as const, color: '#4F46E5' },
  { labelKey: 'Support', icon: MessageCircle, page: 'support' as const, color: '#0D9488' },
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
  if (diff < 60) return "il y a l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
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
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const languageSheetRef = useRef<HTMLDivElement>(null);

  const isAgent = user?.role === 'agent';
  const realBalanceUSD = user?.realBalance ?? 0;
  const bonusBalanceUSD = user?.bonusBalance ?? 0;
  const totalUSD = realBalanceUSD + bonusBalanceUSD;
  const realBalanceFC = user?.realBalanceFC ?? 0;
  const bonusBalanceFC = user?.bonusBalanceFC ?? 0;
  const totalFC = realBalanceFC + bonusBalanceFC;

  const agentCode = user?.agentNumber || user?.agentCode;
  const { subscribe } = usePushSubscription();

  useEffect(() => {
    fetchRecentTransactions();
    refreshUserBalance();
    fetchUserCards();
    if ('serviceWorker' in navigator && 'PushManager' in window && Notification.permission === 'granted') {
      subscribe().catch(() => {});
    }
    const balanceInterval = setInterval(() => refreshUserBalance(), 30000);
    return () => clearInterval(balanceInterval);
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
    if (!agentCode) return;
    navigator.clipboard?.writeText(agentCode);
    setCodeCopied(true);
    toast.success(t('home.copied'));
    setTimeout(() => setCodeCopied(false), 2000);
  }

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang);
    setShowLanguageSheet(false);
  }, [setLanguage]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#111827] pb-24">
      {/* ─── Premium Header ──────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-gradient-to-br from-[#0D5C63] to-[#14888F] flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20">
              <div className="rounded-[8px] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden w-[32px] h-[32px]">
                <Image src="/trait-logo.png" alt="TRAIT" width={28} height={28} className="object-contain" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium tracking-wide uppercase">{t('home.welcome')}</p>
              <h1 className="text-[15px] font-bold text-gray-900 dark:text-white truncate tracking-tight">{user?.name || user?.pseudo || 'User'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowLanguageSheet(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Globe className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
            </button>
            <NotificationBadge onClick={() => navigateTo('notifications')} />
            <button onClick={() => navigateTo('profile')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0D5C63] to-[#14888F] flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="px-5 pt-6 space-y-8">
        {/* ─── Agent Code ───────────────────────────────────── */}
        {isAgent && agentCode && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0D5C63]/10 flex items-center justify-center shrink-0">
                <BadgeCheck className="size-5 text-[#0D5C63]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-widest">{t('home.agent_code')}</p>
                <p className="text-lg font-bold font-mono text-[#0D5C63] tracking-wider dark:text-teal-400">{agentCode}</p>
              </div>
              <button onClick={handleCopyCode} className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                {codeCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Balance Cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl p-5 text-white bg-gradient-to-br from-[#0D5C63] to-[#14888F] relative overflow-hidden shadow-xl shadow-teal-900/20">
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-4">
                <Wallet className="size-3.5 opacity-80" />
                <p className="text-[10px] font-semibold opacity-80 uppercase tracking-wider">{isAgent ? t('home.wallet_usd') : t('home.balance_usd')}</p>
              </div>
              <p className="text-2xl font-bold tracking-tight">
                $ {totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {bonusBalanceUSD > 0 && (
                <div className="mt-2 flex items-center gap-2 text-[9px] opacity-70 font-medium">
                  <span>{t('home.real')}: ${realBalanceUSD.toFixed(2)}</span>
                  <span className="w-px h-2.5 bg-white/40" />
                  <span>+{t('home.bonus')}: ${bonusBalanceUSD.toFixed(2)}</span>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl p-5 text-white bg-gradient-to-br from-[#DC2626] to-[#EF4444] relative overflow-hidden shadow-xl shadow-red-900/20">
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-4">
                <Wallet className="size-3.5 opacity-80" />
                <p className="text-[10px] font-semibold opacity-80 uppercase tracking-wider">{isAgent ? t('home.wallet_fc') : t('home.balance_fc')}</p>
              </div>
              <p className="text-2xl font-bold tracking-tight">
                {totalFC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs font-medium opacity-70 ml-1">FC</span>
              </p>
              {bonusBalanceFC > 0 && (
                <div className="mt-2 flex items-center gap-2 text-[9px] opacity-70 font-medium">
                  <span>{t('home.real')}: {realBalanceFC.toFixed(2)}</span>
                  <span className="w-px h-2.5 bg-white/40" />
                  <span>+{t('home.bonus')}: {bonusBalanceFC.toFixed(2)}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ─── Primary Actions ──────────────────────────────── */}
        {!isAgent && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="flex gap-3">
              {clientPrimaryActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <motion.button key={action.page} whileTap={{ scale: 0.96 }}
                    onClick={() => navigateTo(action.page)}
                    className="flex-1 flex flex-col items-center gap-2.5 py-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${action.color}10` }}>
                      <Icon className="size-5" style={{ color: action.color }} />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t(action.labelKey)}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─── Recommended (Client) ─────────────────────────── */}
        {!isAgent && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3 tracking-tight">{t('home.recommended')}</h2>
            <button onClick={() => navigateTo('child-sponsorship')}
              className="w-full rounded-2xl p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all text-left">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center shrink-0 text-amber-500 font-bold text-lg">⭐</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{t('home.recommended')}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">{t('home.recommended_desc')}</p>
                </div>
                <ChevronRight className="size-4 text-gray-300 dark:text-gray-600 shrink-0 self-center" />
              </div>
            </button>
          </motion.section>
        )}

        {/* ─── Cards Section (Client) ───────────────────────── */}
        {!isAgent && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                <CreditCard className="size-4 text-[#0D5C63]" />
                Mes Cartes TRAIT
              </h2>
              <button onClick={() => navigateTo('card')} className="text-[11px] font-semibold text-[#0D5C63] dark:text-teal-400 hover:opacity-80 transition-opacity">
                {t('home.see_all')}
              </button>
            </div>

            {hasCards && (
              <div className="space-y-3 mb-3">
                {userCards.map((card) => (
                  <TraitCard key={card.id} cardType={card.cardType} cardNumber={card.cardNumber} cardHolder={user?.name || user?.pseudo || 'TRAIT USER'} expiryDate={card.expiryDate} cvv={card.cvv} qrCode={card.qrCode} balance={card.cardType === 'USD' ? (user?.realBalance ?? 0) : (user?.realBalanceFC ?? 0)} status={card.status} />
                ))}
              </div>
            )}

            {hasPendingRequests && !hasCards && (
              <div className="rounded-2xl p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <Clock className="size-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('home.pending_request')}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{t('home.pending_request_desc')}</p>
                  </div>
                </div>
              </div>
            )}

            {showCardButton && (
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigateTo('card-request')}
                className="w-full rounded-2xl p-4 bg-gradient-to-r from-[#0A1628] via-[#1E3A5F] to-[#0D2847] hover:shadow-lg transition-all relative overflow-hidden">
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-blue-500/10" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                    <CreditCard className="size-5 text-blue-300" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">{t('home.card_request')}</p>
                    <p className="text-[10px] text-blue-200/70 mt-0.5">{t('home.card_request_desc')}</p>
                  </div>
                  <ChevronRight className="size-4 text-white/40 ml-auto" />
                </div>
              </motion.button>
            )}
          </motion.section>
        )}

        {/* ─── All Services ─────────────────────────────────── */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">{t('home.services')}</h2>
            {(isAgent ? agentQuickActions : clientSecondaryActions).length > 6 && (
              <button onClick={() => setShowAllActions(!showAllActions)} className="text-[11px] font-semibold text-[#0D5C63] dark:text-teal-400">
                {showAllActions ? t('home.see_all') : t('home.see_all')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(isAgent ? agentQuickActions : clientSecondaryActions).slice(0, showAllActions ? undefined : 8).map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.button key={action.page} whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (action.labelKey === 'Espace Service') navigateTo(user?.role === 'seller' ? 'seller-dashboard' : 'seller-register');
                    else navigateTo(action.page);
                  }}
                  className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${action.color}10` }}>
                    <Icon className="size-4.5" style={{ color: action.color }} />
                  </div>
                  <span className="text-[9px] font-semibold text-gray-600 dark:text-gray-400 text-center leading-tight px-1">
                    {action.labelKey === 'Espace Service'
                      ? (user?.role === 'seller' ? 'Espace Service' : 'Devenir fournisseur')
                      : t(action.labelKey)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        {/* ─── Recent Transactions ──────────────────────────── */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">{t('home.recent_transactions')}</h2>
            <button onClick={() => navigateTo('history')} className="text-[11px] font-semibold text-[#0D5C63] dark:text-teal-400">
              {t('home.view_all')}
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="rounded-2xl p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3">
                <History className="size-5 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">{t('home.no_transactions')}</p>
              <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">{isAgent ? t('home.no_transactions_agent') : t('home.no_transactions_client')}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentTransactions.map((tx, i) => {
                const TypeIcon = getTypeIcon(tx.type);
                const isReceive = tx.type === 'receive' || tx.type === 'deposit';
                return (
                  <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-sm transition-all">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${isReceive ? 'bg-green-50 dark:bg-green-950/50 text-green-500' : 'bg-red-50 dark:bg-red-950/50 text-red-500'}`}>
                      <TypeIcon className="size-[18px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(tx.createdAt)}</p>
                    </div>
                    <p className={`text-[13px] font-bold ${isReceive ? 'text-green-500' : 'text-red-500'}`}>
                      {isReceive ? '+' : '-'}{fmtCurrency(tx.amount, tx.currency)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>
      </main>

      {/* ─── Language Selector Bottom Sheet ─────────────────── */}
      <AnimatePresence>
        {showLanguageSheet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowLanguageSheet(false)} />
            <motion.div ref={languageSheetRef}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl">
              <div className="px-5 pt-5 pb-8">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{t('home.language_select')}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Choisissez votre langue</p>
                  </div>
                  <button onClick={() => setShowLanguageSheet(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div className="space-y-1">
                  {languages.map((lang) => (
                    <button key={lang} onClick={() => handleLanguageChange(lang)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                        language === lang
                          ? 'bg-[#0D5C63]/10 dark:bg-teal-500/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}>
                      <span className="text-xl">{languageFlags[lang]}</span>
                      <span className={`flex-1 text-left text-[14px] font-medium ${
                        language === lang ? 'text-[#0D5C63] dark:text-teal-400' : 'text-gray-700 dark:text-gray-300'
                      }`}>{languageNames[lang]}</span>
                      {language === lang && (
                        <div className="w-6 h-6 rounded-full bg-[#0D5C63] dark:bg-teal-500 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
