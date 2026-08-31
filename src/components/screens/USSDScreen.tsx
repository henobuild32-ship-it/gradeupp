'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Phone, Wallet, Send, ArrowDownToLine, ArrowUpFromLine,
  Loader2, CheckCircle2, ShieldCheck, CreditCard, FileText,
  Clock, Settings, Headphones, Star, Lock, Globe, Bell,
  XCircle, ChevronRight, Plus, Trash2, AlertTriangle,
  HelpCircle, MessageSquare, ShieldOff, Key, Package,
  PiggyBank, Link, Handshake, Repeat,
  BarChart3, Receipt, QrCode, Store, RefreshCw,
  Gift, Users, UserCheck, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  getCachedBalances, getCachedFavorites, getCachedHistory,
  getCachedSettings, getCachedAgentName,
  fetchAndCacheBalances, fetchAndCacheFavorites, fetchAndCacheSettings,
  resolveAgentName, queueOfflineTransaction,
} from '@/lib/ussd-store';

type UssdStep =
  | 'welcome' | 'main-menu' | 'quit'
  | 'balance-fc' | 'balance-usd' | 'balance'
  | 'transfer-currency' | 'transfer-phone' | 'transfer-amount' | 'transfer-confirm' | 'transfer-pin' | 'transfer-done'
  | 'withdraw-currency' | 'withdraw-agent' | 'withdraw-agent-name' | 'withdraw-amount' | 'withdraw-confirm' | 'withdraw-pin' | 'withdraw-done'
  | 'deposit-currency' | 'deposit-agent' | 'deposit-agent-name' | 'deposit-amount' | 'deposit-confirm' | 'deposit-done'
  | 'credit-currency' | 'credit-network' | 'credit-phone' | 'credit-amount' | 'credit-confirm' | 'credit-pin' | 'credit-done'
  | 'bill-currency' | 'bill-type' | 'bill-reference' | 'bill-amount' | 'bill-confirm' | 'bill-pin' | 'bill-done'
  | 'history' | 'favorites-list' | 'favorites-add' | 'quick-send' | 'quick-amount' | 'quick-confirm' | 'quick-pin' | 'quick-done'
  | 'account-info' | 'change-pin-current' | 'change-pin-new' | 'change-pin-confirm' | 'change-pin-done'
  | 'temp-block' | 'temp-block-done'
  | 'settings' | 'settings-language' | 'settings-notifications' | 'settings-security'
  | 'support' | 'support-report' | 'support-help'
  | 'bundles' | 'microcredit' | 'savings' | 'payment-link' | 'payment-request'
  | 'recurring' | 'international' | 'cards' | 'referral' | 'analytics'
  | 'receipts' | 'contact-pay' | 'qr-pay' | 'marketplace' | 'barter'
  | 'agent-info';

type UssdCurrency = 'USD' | 'FC';

interface HistoryItem {
  type: string; amount: number; currency: string; date: string; detail: string;
}

interface Favorite {
  id: string; label: string; phone: string; type: string;
}

interface TxContext {
  phone: string; amount: string; agentCode: string; agentName: string;
  network: string; billType: string; reference: string; newPin: string;
  reportMessage: string; favoriteLabel: string; favoritePhone: string;
  favoriteType: string; selectedFavorite: Favorite | null; currentPin: string;
}

const NETWORKS = ['Vodacom', 'Airtel', 'Orange', 'Africell'];

const BILL_TYPES = [
  { id: 'electricity', label: 'Électricité', icon: '⚡' },
  { id: 'water', label: 'Eau', icon: '💧' },
  { id: 'internet', label: 'Internet', icon: '🌐' },
  { id: 'subscription', label: 'Abonnement', icon: '📺' },
  { id: 'other', label: 'Autre', icon: '📋' },
];

const LANGUAGES = [
  { code: 'fr', label: 'Français' }, { code: 'en', label: 'English' },
  { code: 'ln', label: 'Lingála' }, { code: 'sw', label: 'Swahili' },
  { code: 'tl', label: 'Tshiluba' }, { code: 'kg', label: 'Kikongo' },
];

const MAIN_MENU = [
  { id: '1', label: 'Solde (USD/FC)', icon: Wallet, step: 'balance' as UssdStep },
  { id: '2', label: 'Transférer de l\'argent', icon: Send, step: 'transfer-currency' as UssdStep },
  { id: '3', label: 'Retrait via agent', icon: ArrowDownToLine, step: 'withdraw-currency' as UssdStep },
  { id: '4', label: 'Dépôt via agent', icon: ArrowUpFromLine, step: 'deposit-currency' as UssdStep },
  { id: '5', label: 'Achat de crédit', icon: CreditCard, step: 'credit-currency' as UssdStep },
  { id: '6', label: 'Paiement de factures', icon: FileText, step: 'bill-currency' as UssdStep },
  { id: '7', label: 'Achats Bundles', icon: Package, step: 'bundles' as UssdStep },
  { id: '8', label: 'Micro-Crédit', icon: PiggyBank, step: 'microcredit' as UssdStep },
  { id: '9', label: 'Épargne / Objectifs', icon: Target, step: 'savings' as UssdStep },
  { id: '10', label: 'Paiement par lien', icon: Link, step: 'payment-link' as UssdStep },
  { id: '11', label: 'Demandes de paiement', icon: Handshake, step: 'payment-request' as UssdStep },
  { id: '12', label: 'Paiements récurrents', icon: Repeat, step: 'recurring' as UssdStep },
  { id: '13', label: 'Transfert International', icon: Globe, step: 'international' as UssdStep },
  { id: '14', label: 'Cartes TRAIT', icon: CreditCard, step: 'cards' as UssdStep },
  { id: '15', label: 'Code de Parrainage', icon: Gift, step: 'referral' as UssdStep },
  { id: '16', label: 'Analytics / Stats', icon: BarChart3, step: 'analytics' as UssdStep },
  { id: '17', label: 'Reçus électroniques', icon: Receipt, step: 'receipts' as UssdStep },
  { id: '18', label: 'Paiement Contact', icon: Users, step: 'contact-pay' as UssdStep },
  { id: '19', label: 'Paiement QR', icon: QrCode, step: 'qr-pay' as UssdStep },
  { id: '21', label: 'Marketplace', icon: Store, step: 'marketplace' as UssdStep },
  { id: '22', label: 'Troc (Barter)', icon: RefreshCw, step: 'barter' as UssdStep },
  { id: '23', label: 'Info Agent', icon: UserCheck, step: 'agent-info' as UssdStep },
  { id: '24', label: 'Favoris', icon: Star, step: 'favorites-list' as UssdStep },
  { id: '25', label: 'Mon compte', icon: ShieldCheck, step: 'account-info' as UssdStep },
  { id: '26', label: 'Paramètres', icon: Settings, step: 'settings' as UssdStep },
  { id: '27', label: 'Historique rapide', icon: Clock, step: 'history' as UssdStep },
  { id: '28', label: 'Support client', icon: Headphones, step: 'support' as UssdStep },
  { id: '0', label: 'Quitter', icon: XCircle, step: 'quit' as UssdStep },
];

const emptyTx: TxContext = {
  phone: '', amount: '', agentCode: '', agentName: '', network: '', billType: '',
  reference: '', newPin: '', reportMessage: '', favoriteLabel: '',
  favoritePhone: '', favoriteType: 'transfer', selectedFavorite: null, currentPin: '',
};

export default function USSDScreen() {
  const { goBack, user } = useAppStore();
  const [step, setStep] = useState<UssdStep>('welcome');
  const [currency, setCurrency] = useState<UssdCurrency>('USD');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [tx, setTx] = useState<TxContext>({ ...emptyTx });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [ussdLang, setUssdLang] = useState('fr');
  const [smsNotif, setSmsNotif] = useState(false);
  const [cachedBalance, setCachedBalance] = useState({ usd: 0, fc: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const prevStepRef = useRef<UssdStep>('welcome');

  useEffect(() => {
    const needsInput: UssdStep[] = [
      'transfer-phone', 'transfer-amount',
      'withdraw-agent', 'withdraw-amount',
      'deposit-agent', 'deposit-amount',
      'credit-phone', 'credit-amount',
      'bill-reference', 'bill-amount',
      'favorites-add', 'quick-amount',
      'change-pin-current', 'change-pin-new', 'change-pin-confirm',
      'support-report',
    ];
    const needsPin: UssdStep[] = [
      'transfer-pin', 'withdraw-pin', 'credit-pin', 'bill-pin', 'quick-pin',
    ];
    if (needsInput.includes(step) || needsPin.includes(step)) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  useEffect(() => {
    setInputValue('');
    setPinInput('');
    setResultMessage('');
  }, [step]);

  useEffect(() => {
    if (step !== prevStepRef.current) {
      prevStepRef.current = step;
    }
  }, [step]);

  useEffect(() => {
    const bal = getCachedBalances();
    setCachedBalance({ usd: bal.usd, fc: bal.fc });
  }, []);

  const goMenu = useCallback(() => {
    setTx({ ...emptyTx });
    setStep('main-menu');
  }, []);

  const updateTx = useCallback((updates: Partial<TxContext>) => {
    setTx(prev => ({ ...prev, ...updates }));
  }, []);

  const fetchBalance = useCallback(async (cur: UssdCurrency) => {
    if (!user?.id) return;
    setLoading(true);
    const cached = getCachedBalances();
    setCachedBalance(cached);
    try {
      const res = await fetch(`/api/ussd/balance?userId=${user.id}&currency=${cur}`);
      const data = await res.json();
      if (data.success) {
        const bal = { usd: data.totalBalance ?? 0, fc: data.totalBalanceFC ?? data.totalBalance ?? 0 };
        setCachedBalance(bal);
        setResultMessage(`Solde disponible: ${bal[cur === 'USD' ? 'usd' : 'fc'].toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`);
      } else {
        setResultMessage(`Solde: ${cached[cur === 'USD' ? 'usd' : 'fc'].toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${cur} (hors ligne)`);
      }
    } catch {
      setResultMessage(`Solde: ${cached[cur === 'USD' ? 'usd' : 'fc'].toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${cur} (hors ligne)`);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const cached = getCachedHistory();
    setHistory(cached);
    try {
      const res = await fetch(`/api/ussd/mini-statement?userId=${user.id}`);
      const data = await res.json();
      if (data.success) setHistory(data.miniStatement);
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [user?.id]);

  const fetchFavorites = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const cached = getCachedFavorites();
    setFavorites(cached);
    try {
      const res = await fetch(`/api/ussd/favorites?userId=${user.id}`);
      const data = await res.json();
      if (data.success) setFavorites(data.favorites);
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [user?.id]);

  const fetchSettings = useCallback(async () => {
    if (!user?.id) return;
    const cached = getCachedSettings();
    setUssdLang(cached.language);
    setSmsNotif(cached.smsNotifications);
    try {
      const res = await fetch(`/api/ussd/settings?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setUssdLang(data.settings.ussdLanguage);
        setSmsNotif(data.settings.smsNotifications);
      }
    } catch { /* offline */ }
  }, [user?.id]);

  const addFavorite = useCallback(async () => {
    if (!user?.id || !tx.favoriteLabel.trim() || !tx.favoritePhone.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ussd/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, label: tx.favoriteLabel.trim(), phone: tx.favoritePhone.trim(), type: tx.favoriteType }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Favori ajouté');
        await fetchFavorites();
        goMenu();
      } else {
        queueOfflineTransaction('/api/ussd/favorites', 'POST', { userId: user.id, label: tx.favoriteLabel.trim(), phone: tx.favoritePhone.trim(), type: tx.favoriteType });
        toast.success('Favori enregistré hors ligne');
        goMenu();
      }
    } catch {
      queueOfflineTransaction('/api/ussd/favorites', 'POST', { userId: user.id, label: tx.favoriteLabel.trim(), phone: tx.favoritePhone.trim(), type: tx.favoriteType });
      toast.success('Favori enregistré hors ligne');
      goMenu();
    }
    finally { setLoading(false); }
  }, [user?.id, tx, fetchFavorites, goMenu]);

  const deleteFavorite = useCallback(async (id: string) => {
    try {
      await fetch(`/api/ussd/favorites?id=${id}`, { method: 'DELETE' });
      setFavorites(prev => prev.filter(f => f.id !== id));
      toast.success('Favori supprimé');
    } catch { toast.error('Erreur'); }
  }, []);

  const updateSetting = useCallback(async (updates: Record<string, any>) => {
    if (!user?.id) return;
    try {
      await fetch('/api/ussd/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...updates }),
      });
      if (updates.ussdLanguage !== undefined) setUssdLang(updates.ussdLanguage);
      if (updates.smsNotifications !== undefined) setSmsNotif(updates.smsNotifications);
      toast.success('Paramètre mis à jour');
    } catch { toast.error('Erreur'); }
  }, [user?.id]);

  const executeWithPin = useCallback(async (
    apiEndpoint: string,
    body: Record<string, any>,
    nextStep: UssdStep,
    successMsg: string,
  ) => {
    setLoading(true);
    try {
      const pinRes = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, pin: pinInput }),
      });
      const pinData = await pinRes.json();
      if (!pinData.success) {
        toast.error('Code PIN incorrect');
        setPinInput('');
        setLoading(false);
        return;
      }
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setResultMessage(successMsg);
        setStep(nextStep);
      } else {
        toast.error(data.message || "Erreur lors de l'opération");
        setPinInput('');
      }
    } catch {
      queueOfflineTransaction(apiEndpoint, 'POST', body);
      setResultMessage('Transaction enregistrée hors ligne. Elle sera traitée automatiquement.');
      setStep(nextStep);
    }
    finally { setLoading(false); }
  }, [pinInput, user?.id]);

  const handleAgentLookup = useCallback(async (code: string) => {
    const cachedName = getCachedAgentName(code);
    if (cachedName) {
      updateTx({ agentName: cachedName });
      return cachedName;
    }
    const name = await resolveAgentName(code);
    if (name) {
      updateTx({ agentName: name });
      return name;
    }
    return null;
  }, [updateTx]);

  function Header({ title, onBack }: { title: string; onBack: () => void }) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-5" />
        </Button>
        <h2 className="text-base font-semibold flex-1">{title}</h2>
        <Badge variant="outline" className="text-xs border-emerald-200 bg-emerald-50 text-emerald-700 font-mono">
          {currency}
        </Badge>
      </div>
    );
  }

  function InputStep({
    title, subtitle, placeholder, type = 'text', nextStep, backStep,
    submitLabel = 'Suivant', validate, onValueChange,
  }: {
    title: string; subtitle?: string; placeholder: string; type?: string;
    nextStep: UssdStep; backStep: UssdStep; submitLabel?: string;
    validate?: () => void; onValueChange?: (val: string) => void;
  }) {
    return (
      <div className="flex flex-col h-full">
        <Header title={title} onBack={() => setStep(backStep)} />
        <div className="flex-1 flex flex-col p-4 gap-4">
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          <Input
            ref={inputRef}
            type={type}
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); onValueChange?.(e.target.value); }}
            className="h-12 text-lg"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue.trim()) {
                if (validate) validate();
                setStep(nextStep);
              }
            }}
            autoFocus
          />
          <Button
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
            onClick={() => {
              if (validate) validate();
              setStep(nextStep);
            }}
            disabled={!inputValue.trim()}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    );
  }

  function PinStep({ nextStep, backStep, action }: {
    nextStep: UssdStep; backStep: UssdStep; action: () => void;
  }) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Code PIN" onBack={() => setStep(backStep)} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <Lock className="size-8 text-emerald-700" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold mb-1">Entrez votre code PIN</p>
            <p className="text-sm text-muted-foreground">Nécessaire pour confirmer cette opération</p>
          </div>
          <Input
            ref={inputRef}
            type="password"
            placeholder="••••"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            className="h-14 text-2xl text-center tracking-[0.5em] max-w-[200px]"
            maxLength={8}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && pinInput.length >= 4) action();
            }}
            autoFocus
          />
          <Button
            className="w-full max-w-[300px] h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
            onClick={action}
            disabled={loading || pinInput.length < 4}
          >
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Vérification...</span>
            ) : 'Confirmer'}
          </Button>
        </div>
      </div>
    );
  }

  function DoneStep({ msg }: { msg: string }) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="size-10 text-emerald-600" />
          </div>
        </motion.div>
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Opération réussie</p>
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded-xl leading-relaxed">
            {msg}
          </pre>
        </div>
        <div className="flex gap-3 w-full max-w-[300px]">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={goMenu}>Menu</Button>
          <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={goBack}>Quitter USSD</Button>
        </div>
      </div>
    );
  }

  function LoadingScreen({ text }: { text: string }) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center gap-3 flex flex-col">
          <Loader2 className="size-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
    );
  }

  function renderWelcome() {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Phone className="size-10 text-emerald-700" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Bienvenue Sur</h1>
          <h2 className="text-3xl font-black text-emerald-600 mb-1">TRAIT USSD</h2>
          <p className="text-sm text-muted-foreground font-mono mb-8">*1709#</p>
          <Button className="w-full max-w-[300px] h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-lg" onClick={() => setStep('main-menu')}>
            Accéder au menu
          </Button>
        </motion.div>
      </div>
    );
  }

  function renderMainMenu() {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 sticky top-0 z-10 bg-background">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Phone className="size-4 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-base font-bold text-emerald-700">TRAIT USSD</h2>
                <p className="text-[10px] text-muted-foreground font-mono">*1709# — 28 services</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <div className="space-y-0.5">
            {MAIN_MENU.map((item, i) => {
              const Icon = item.icon;
              const isQuit = item.id === '0';
              return (
                <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                  <button
                    onClick={() => {
                      if (item.step === 'balance') { fetchBalance(currency); setStep('balance'); }
                      else if (item.step === 'history') { fetchHistory(); setStep('history'); }
                      else if (item.step === 'favorites-list') { fetchFavorites(); setStep('favorites-list'); }
                      else if (item.step === 'settings') { fetchSettings(); setStep('settings'); }
                      else setStep(item.step);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] ${
                      isQuit ? 'hover:bg-red-50' : 'hover:bg-accent'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isQuit ? 'bg-red-100' : 'bg-emerald-100'
                    }`}>
                      <Icon className={`size-4 ${isQuit ? 'text-red-500' : 'text-emerald-700'}`} />
                    </div>
                    <span className={`flex-1 text-left text-sm font-medium ${isQuit ? 'text-red-600' : ''}`}>{item.label}</span>
                    <Badge variant="outline" className={`text-xs font-mono ${isQuit ? 'border-red-200 text-red-400' : 'text-muted-foreground'}`}>{item.id}</Badge>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderBalance() {
    if (loading) return <LoadingScreen text="Chargement du solde..." />;
    return (
      <div className="flex flex-col h-full">
        <Header title="Solde disponible" onBack={goMenu} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <Wallet className="size-8 text-emerald-700" />
          </div>
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 p-6 rounded-xl leading-loose w-full text-center">
            {resultMessage || `USD: ${cachedBalance.usd.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}\nFC: ${cachedBalance.fc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`}
          </pre>
          <Button className="w-full max-w-[300px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={goMenu}>Retour au menu</Button>
        </div>
      </div>
    );
  }

  function renderCurrencySelection(title: string, nextSteps: { fc: UssdStep; usd: UssdStep }) {
    return (
      <div className="flex flex-col h-full">
        <Header title={title} onBack={goMenu} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <p className="text-sm text-muted-foreground">Choisissez la devise :</p>
          <div className="space-y-3 w-full max-w-[280px]">
            <Button className="w-full h-14 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => { setCurrency('FC'); setStep(nextSteps.fc); }}>
              Franc Congolais (FC)
            </Button>
            <Button variant="outline" className="w-full h-14 rounded-xl font-semibold border-emerald-200 hover:bg-emerald-50"
              onClick={() => { setCurrency('USD'); setStep(nextSteps.usd); }}>
              Dollar Américain (USD)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function renderHistory() {
    if (loading) return <LoadingScreen text="Chargement de l'historique..." />;
    return (
      <div className="flex flex-col h-full">
        <Header title="Historique rapide" onBack={goMenu} />
        <div className="flex-1 overflow-y-auto p-4">
          {history.length === 0 ? (
            <div className="text-center py-10">
              <Clock className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune transaction récente</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">5 dernières opérations</p>
              {history.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 p-3 rounded-xl bg-card border">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${['envoi', 'retrait', 'crédit', 'facture'].includes(item.type) ? 'bg-red-50' : 'bg-emerald-50'}`}>
                    {item.type === 'envoi' ? '💸' : item.type === 'réception' ? '💰' : item.type === 'dépôt' ? '➕' : item.type === 'retrait' ? '🏧' : item.type === 'crédit' ? '📱' : '📄'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{item.type}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                  </div>
                  <p className={`text-sm font-semibold ${['réception', 'dépôt'].includes(item.type) ? 'text-emerald-600' : 'text-red-500'}`}>
                    {['réception', 'dépôt'].includes(item.type) ? '+' : '-'}{item.amount.toFixed(2)} {item.currency}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── TRANSFER ────────────────────────────────────────────────

  function renderTransferPhone() {
    return (
      <InputStep
        title="Transférer de l'argent"
        subtitle="Entrez le numéro du destinataire"
        placeholder="+243 000 000 000"
        type="tel"
        nextStep="transfer-amount"
        backStep="main-menu"
      />
    );
  }

  function renderTransferAmount() {
    return (
      <InputStep
        title="Montant du transfert"
        subtitle={`Destinataire: ${tx.phone || inputValue}`}
        placeholder={`Montant en ${currency}`}
        type="number"
        nextStep="transfer-confirm"
        backStep="transfer-phone"
        validate={() => updateTx({ phone: inputValue })}
      />
    );
  }

  function renderTransferConfirm() {
    const amount = parseFloat(tx.amount) || 0;
    const fee = Math.round(amount * 0.007 * 100) / 100;
    return (
      <div className="flex flex-col h-full">
        <Header title="Confirmer le transfert" onBack={() => setStep('transfer-amount')} />
        <div className="flex-1 flex flex-col p-6 gap-4">
          <div className="rounded-xl bg-muted/50 p-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Destinataire</span><span className="font-medium">{tx.phone}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Montant</span><span className="font-medium">{tx.amount} {currency}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Frais (0.7%)</span><span className="font-medium">{fee.toFixed(2)} {currency}</span></div>
            <div className="border-t pt-2 flex justify-between text-sm"><span className="font-medium">Total</span><span className="font-bold text-emerald-600">{(amount + fee).toFixed(2)} {currency}</span></div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="size-3" />Code PIN requis</p>
          <div className="mt-auto">
            <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl" onClick={() => setStep('transfer-pin')}>
              Confirmer et envoyer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function renderTransferPin() {
    const amount = parseFloat(tx.amount) || 0;
    const fee = Math.round(amount * 0.007 * 100) / 100;
    return (
      <PinStep
        nextStep="transfer-done"
        backStep="transfer-confirm"
        action={() => executeWithPin(
          '/api/ussd/transfer',
          { senderId: user?.id, receiverPhone: tx.phone, amount, currency },
          'transfer-done',
          `Transfert de ${amount.toFixed(2)} ${currency} envoyé à ${tx.phone}\nFrais: ${fee.toFixed(2)} ${currency}`,
        )}
      />
    );
  }

  // ─── WITHDRAWAL ──────────────────────────────────────────────

  function renderWithdrawAgent() {
    return (
      <InputStep
        title="Retrait via agent"
        subtitle="Entrez le numéro de l'agent"
        placeholder="Numéro agent (ex: 202601)"
        type="text"
        nextStep="withdraw-agent-name"
        backStep="main-menu"
        onValueChange={async (val) => {
          // Auto-add AGT- prefix if just digits
          let code = val
          if (/^\d+$/.test(code.trim())) {
            code = `AGT-${code.trim()}`
          }
          if (code.length >= 8) {
            updateTx({ agentCode: code });
            const name = await handleAgentLookup(code);
            if (name) {
              updateTx({ agentName: name });
              toast.success(`Agent: ${name}`);
            }
          }
        }}
      />
    );
  }

  function renderWithdrawAgentName() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Confirmer agent" onBack={() => setStep('withdraw-agent')} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          {tx.agentName ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <UserCheck className="size-8 text-emerald-700" />
              </div>
              <p className="text-lg font-semibold text-emerald-700">{tx.agentName}</p>
              <p className="text-sm text-muted-foreground font-mono">{tx.agentCode}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Recherche agent...</p>
          )}
          <Button className="w-full max-w-[300px] h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
            onClick={async () => {
              if (!tx.agentName) {
                await handleAgentLookup(tx.agentCode);
              }
              setStep('withdraw-amount');
            }}>
            Confirmer et continuer
          </Button>
        </div>
      </div>
    );
  }

  function renderWithdrawAmount() {
    return (
      <InputStep
        title="Montant du retrait"
        subtitle={`Agent: ${tx.agentName || tx.agentCode}`}
        placeholder={`Montant en ${currency}`}
        type="number"
        nextStep="withdraw-confirm"
        backStep="withdraw-agent-name"
        validate={() => updateTx({ amount: inputValue })}
      />
    );
  }

  function renderWithdrawConfirm() {
    const amount = parseFloat(tx.amount) || 0;
    const fee = Math.round(amount * 0.01 * 100) / 100;
    return (
      <div className="flex flex-col h-full">
        <Header title="Confirmer le retrait" onBack={() => setStep('withdraw-amount')} />
        <div className="flex-1 flex flex-col p-6 gap-4">
          <div className="rounded-xl bg-muted/50 p-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Agent</span><span className="font-medium">{tx.agentName || tx.agentCode}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Montant</span><span className="font-medium">{tx.amount} {currency}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Frais (1%)</span><span className="font-medium">{fee.toFixed(2)} {currency}</span></div>
            <div className="border-t pt-2 flex justify-between text-sm"><span className="font-medium">Total débité</span><span className="font-bold text-red-500">{(amount + fee).toFixed(2)} {currency}</span></div>
          </div>
          <div className="mt-auto">
            <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl" onClick={() => setStep('withdraw-pin')}>
              Confirmer le retrait
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function renderWithdrawPin() {
    const amount = parseFloat(tx.amount) || 0;
    return (
      <PinStep
        nextStep="withdraw-done"
        backStep="withdraw-confirm"
        action={() => executeWithPin(
          '/api/ussd/withdraw',
          { userId: user?.id, agentCode: tx.agentCode, amount, currency },
          'withdraw-done',
          `Retrait de ${amount.toFixed(2)} ${currency}\nAgent: ${tx.agentName || tx.agentCode}\nOpération effectuée avec succès.`,
        )}
      />
    );
  }

  // ─── DEPOSIT ─────────────────────────────────────────────────

  function renderDepositAgent() {
    return (
      <InputStep
        title="Dépôt via agent"
        subtitle="Entrez le numéro de l'agent"
        placeholder="Numéro agent (ex: 202601)"
        type="text"
        nextStep="deposit-agent-name"
        backStep="main-menu"
        onValueChange={async (val) => {
          // Auto-add AGT- prefix if just digits
          let code = val
          if (/^\d+$/.test(code.trim())) {
            code = `AGT-${code.trim()}`
          }
          if (code.length >= 8) {
            updateTx({ agentCode: code });
            const name = await handleAgentLookup(code);
            if (name) {
              updateTx({ agentName: name });
              toast.success(`Agent: ${name}`);
            }
          }
        }}
      />
    );
  }

  function renderDepositAgentName() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Confirmer agent" onBack={() => setStep('deposit-agent')} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          {tx.agentName ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <UserCheck className="size-8 text-emerald-700" />
              </div>
              <p className="text-lg font-semibold text-emerald-700">{tx.agentName}</p>
              <p className="text-sm text-muted-foreground font-mono">{tx.agentCode}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Recherche agent...</p>
          )}
          <Button className="w-full max-w-[300px] h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
            onClick={async () => {
              if (!tx.agentName) await handleAgentLookup(tx.agentCode);
              setStep('deposit-amount');
            }}>
            Confirmer et continuer
          </Button>
        </div>
      </div>
    );
  }

  function renderDepositAmount() {
    return (
      <InputStep
        title="Montant du dépôt"
        subtitle={`Agent: ${tx.agentName || tx.agentCode}`}
        placeholder={`Montant en ${currency}`}
        type="number"
        nextStep="deposit-confirm"
        backStep="deposit-agent-name"
        validate={() => updateTx({ amount: inputValue })}
      />
    );
  }

  function renderDepositConfirm() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Confirmer le dépôt" onBack={() => setStep('deposit-amount')} />
        <div className="flex-1 flex flex-col p-6 gap-4">
          <div className="rounded-xl bg-muted/50 p-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Agent</span><span className="font-medium">{tx.agentName || tx.agentCode}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Montant</span><span className="font-bold text-emerald-600">{tx.amount} {currency}</span></div>
          </div>
          <p className="text-xs text-muted-foreground">L'agent confirmera le dépôt de son côté.</p>
          <div className="mt-auto">
            <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
              onClick={async () => {
                if (!user?.id) return;
                setLoading(true);
                try {
                  const res = await fetch('/api/ussd/deposit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, agentCode: tx.agentCode, amount: parseFloat(tx.amount), currency }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setResultMessage(`Dépôt de ${tx.amount} ${currency}\nAgent: ${tx.agentName || tx.agentCode}\nCompte crédité.`);
                    setStep('deposit-done');
                  } else {
                    toast.error(data.message || 'Erreur');
                  }
                } catch {
                  queueOfflineTransaction('/api/ussd/deposit', 'POST', { userId: user.id, agentCode: tx.agentCode, amount: parseFloat(tx.amount), currency });
                  setResultMessage(`Dépôt de ${tx.amount} ${currency} enregistré hors ligne.`);
                  setStep('deposit-done');
                }
                finally { setLoading(false); }
              }}
              disabled={loading}
            >
              {loading ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Traitement...</span> : 'Confirmer le dépôt'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── CREDIT PURCHASE ─────────────────────────────────────────

  function renderCreditNetwork() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Achat de crédit" onBack={goMenu} />
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground mb-4">Sélectionnez votre opérateur:</p>
          <div className="space-y-2">
            {NETWORKS.map((network, i) => (
              <motion.div key={network} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { updateTx({ network }); setStep('credit-phone'); }}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Phone className="size-5 text-emerald-700" /></div>
                    <span className="font-medium flex-1">{network}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderCreditPhone() {
    return (
      <InputStep title={`Crédit ${tx.network}`} subtitle="Numéro à recharger" placeholder="+243 000 000 000" type="tel" nextStep="credit-amount" backStep="credit-network" validate={() => updateTx({ phone: inputValue })} />
    );
  }

  function renderCreditAmount() {
    return (
      <InputStep title="Montant" subtitle={`Réseau: ${tx.network} — ${tx.phone}`} placeholder={`Montant en ${currency}`} type="number" nextStep="credit-confirm" backStep="credit-phone" validate={() => updateTx({ amount: inputValue })} />
    );
  }

  function renderCreditConfirm() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Confirmer l'achat" onBack={() => setStep('credit-amount')} />
        <div className="flex-1 flex flex-col p-6 gap-4">
          <div className="rounded-xl bg-muted/50 p-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Réseau</span><span className="font-medium">{tx.network}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Numéro</span><span className="font-medium">{tx.phone}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Montant</span><span className="font-bold text-emerald-600">{tx.amount} {currency}</span></div>
          </div>
          <div className="mt-auto">
            <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl" onClick={() => setStep('credit-pin')}>Confirmer l'achat</Button>
          </div>
        </div>
      </div>
    );
  }

  function renderCreditPin() {
    return (
      <PinStep
        nextStep="credit-done"
        backStep="credit-confirm"
        action={() => executeWithPin(
          '/api/ussd/credit',
          { userId: user?.id, network: tx.network, phoneNumber: tx.phone, amount: parseFloat(tx.amount), currency },
          'credit-done',
          `Achat de ${tx.amount} ${currency}\nRéseau: ${tx.network}\nNuméro: ${tx.phone}`,
        )}
      />
    );
  }

  // ─── BILL PAYMENT ────────────────────────────────────────────

  function renderBillType() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Paiement de factures" onBack={goMenu} />
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground mb-4">Sélectionnez le type:</p>
          <div className="space-y-2">
            {BILL_TYPES.map((bt, i) => (
              <motion.div key={bt.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { updateTx({ billType: bt.id }); setStep('bill-reference'); }}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <span className="text-xl">{bt.icon}</span>
                    <span className="font-medium flex-1">{bt.label}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderBillReference() {
    const billLabel = BILL_TYPES.find(b => b.id === tx.billType)?.label || '';
    return (
      <InputStep title={`Facture — ${billLabel}`} subtitle="Entrez la référence / numéro de compte" placeholder="Référence" type="text" nextStep="bill-amount" backStep="bill-type" validate={() => updateTx({ reference: inputValue })} />
    );
  }

  function renderBillAmount() {
    return (
      <InputStep title="Montant de la facture" subtitle={`Référence: ${tx.reference}`} placeholder={`Montant en ${currency}`} type="number" nextStep="bill-confirm" backStep="bill-reference" validate={() => updateTx({ amount: inputValue })} />
    );
  }

  function renderBillConfirm() {
    const billLabel = BILL_TYPES.find(b => b.id === tx.billType)?.label || '';
    return (
      <div className="flex flex-col h-full">
        <Header title="Confirmer le paiement" onBack={() => setStep('bill-amount')} />
        <div className="flex-1 flex flex-col p-6 gap-4">
          <div className="rounded-xl bg-muted/50 p-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Type</span><span className="font-medium">{billLabel}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Référence</span><span className="font-medium">{tx.reference}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Montant</span><span className="font-bold text-emerald-600">{tx.amount} {currency}</span></div>
          </div>
          <div className="mt-auto">
            <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl" onClick={() => setStep('bill-pin')}>Payer maintenant</Button>
          </div>
        </div>
      </div>
    );
  }

  function renderBillPin() {
    return (
      <PinStep
        nextStep="bill-done"
        backStep="bill-confirm"
        action={() => executeWithPin(
          '/api/ussd/bills',
          { userId: user?.id, billType: tx.billType, reference: tx.reference, amount: parseFloat(tx.amount), currency },
          'bill-done',
          `Paiement de ${tx.amount} ${currency}\nType: ${BILL_TYPES.find(b => b.id === tx.billType)?.label}\nRéf: ${tx.reference}`,
        )}
      />
    );
  }

  // ─── FAVORITES ───────────────────────────────────────────────

  function renderFavoritesList() {
    if (loading) return <LoadingScreen text="Chargement des favoris..." />;
    return (
      <div className="flex flex-col h-full">
        <Header title="Favoris" onBack={goMenu} />
        <div className="flex-1 overflow-y-auto p-4">
          {favorites.length === 0 ? (
            <div className="text-center py-10">
              <Star className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun favori enregistré</p>
            </div>
          ) : (
            <div className="space-y-2">
              {favorites.map((fav, i) => (
                <motion.div key={fav.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm">
                        {fav.type === 'transfer' ? '💸' : '📱'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{fav.label}</p>
                        <p className="text-xs text-muted-foreground font-mono">{fav.phone}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700" onClick={() => { updateTx({ phone: fav.phone, selectedFavorite: fav }); setStep('quick-send'); }}>
                        <Send className="size-4 mr-1" />Envoyer
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 h-8 w-8" onClick={() => deleteFavorite(fav.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          <Button variant="outline" className="w-full mt-4 rounded-xl" onClick={() => setStep('favorites-add')}>
            <Plus className="size-4 mr-2" />Ajouter un favori
          </Button>
        </div>
      </div>
    );
  }

  function renderFavoritesAdd() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Ajouter un favori" onBack={() => setStep('favorites-list')} />
        <div className="flex-1 flex flex-col p-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nom du contact</label>
            <Input placeholder="Ex: Maman" value={tx.favoriteLabel} onChange={(e) => updateTx({ favoriteLabel: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Numéro de téléphone</label>
            <Input type="tel" placeholder="+243 000 000 000" value={tx.favoritePhone} onChange={(e) => updateTx({ favoritePhone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <div className="flex gap-2">
              <Button variant={tx.favoriteType === 'transfer' ? 'default' : 'outline'} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateTx({ favoriteType: 'transfer' })}>Transfert</Button>
              <Button variant={tx.favoriteType === 'credit' ? 'default' : 'outline'} className="flex-1 rounded-xl" onClick={() => updateTx({ favoriteType: 'credit' })}>Crédit</Button>
            </div>
          </div>
          <div className="mt-auto">
            <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl" onClick={addFavorite} disabled={!tx.favoriteLabel.trim() || !tx.favoritePhone.trim() || loading}>
              {loading ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Enregistrement...</span> : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Quick send from favorite
  function renderQuickSend() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Envoi rapide" onBack={() => setStep('favorites-list')} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <div className="text-center">
            <p className="text-lg font-semibold">{tx.selectedFavorite?.label}</p>
            <p className="text-sm text-muted-foreground font-mono">{tx.phone}</p>
          </div>
          <div className="w-full max-w-[280px]">
            <Input ref={inputRef} type="number" placeholder={`Montant en ${currency}`} value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="h-14 text-xl text-center" autoFocus onKeyDown={(e) => e.key === 'Enter' && inputValue && setStep('quick-confirm')} />
          </div>
          <Button className="w-full max-w-[280px] h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl" onClick={() => inputValue && setStep('quick-confirm')} disabled={!inputValue}>Suivant</Button>
        </div>
      </div>
    );
  }

  function renderQuickConfirm() {
    const amount = parseFloat(inputValue) || 0;
    const fee = Math.round(amount * 0.007 * 100) / 100;
    return (
      <div className="flex flex-col h-full">
        <Header title="Confirmer l'envoi rapide" onBack={() => setStep('quick-send')} />
        <div className="flex-1 flex flex-col p-6 gap-4">
          <div className="rounded-xl bg-muted/50 p-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Destinataire</span><span className="font-medium">{tx.selectedFavorite?.label} ({tx.phone})</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Montant</span><span className="font-medium">{inputValue} {currency}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Frais</span><span className="font-medium">{fee.toFixed(2)} {currency}</span></div>
            <div className="border-t pt-2 flex justify-between text-sm"><span className="font-medium">Total</span><span className="font-bold text-emerald-600">{(amount + fee).toFixed(2)} {currency}</span></div>
          </div>
          <div className="mt-auto">
            <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl" onClick={() => { updateTx({ amount: inputValue }); setStep('quick-pin'); }}>Confirmer</Button>
          </div>
        </div>
      </div>
    );
  }

  function renderQuickPin() {
    const amount = parseFloat(tx.amount) || 0;
    const fee = Math.round(amount * 0.007 * 100) / 100;
    return (
      <PinStep
        nextStep="quick-done"
        backStep="quick-confirm"
        action={() => executeWithPin(
          '/api/ussd/transfer',
          { senderId: user?.id, receiverPhone: tx.phone, amount, currency },
          'quick-done',
          `Envoi rapide de ${amount.toFixed(2)} ${currency} à ${tx.selectedFavorite?.label} (${tx.phone})\nFrais: ${fee.toFixed(2)} ${currency}`,
        )}
      />
    );
  }

  // ─── NEW FEATURE SCREENS ─────────────────────────────────────

  function renderInfoScreen(title: string, icon: React.ReactNode, lines: string[]) {
    return (
      <div className="flex flex-col h-full">
        <Header title={title} onBack={goMenu} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            {icon}
          </div>
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 p-6 rounded-xl leading-loose w-full text-left">
            {lines.join('\n')}
          </pre>
          <Button className="w-full max-w-[300px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={goMenu}>
            Retour au menu
          </Button>
        </div>
      </div>
    );
  }

  function renderBundles() {
    return renderInfoScreen('Achats Bundles', <Package className="size-8 text-emerald-700" />, [
      'BUNDLES DISPONIBLES',
      '━━━━━━━━━━━━━━━',
      '📦 Data: 1Go — 2 500 FC',
      '📦 Data: 5Go — 7 500 FC',
      '📦 Data: 10Go — 12 000 FC',
      '📦 Data: 20Go — 20 000 FC',
      '━━━━━━━━━━━━━━━',
      '📱 Société: Vodacom, Airtel, Orange',
      '━━━━━━━━━━━━━━━',
      'Utilisez l\'app TRAIT > Bundles',
      'pour acheter en détail.',
      'Ou composez *1709*7#',
    ]);
  }

  function renderMicrocredit() {
    return renderInfoScreen('Micro-Crédit', <PiggyBank className="size-8 text-emerald-700" />, [
      'MICRO-CRÉDIT TRAIT',
      '━━━━━━━━━━━━━━━',
      '💰 Montant: 50$ - 500$',
      '📅 Durée: 7 à 30 jours',
      '📊 Taux: 5%',
      '━━━━━━━━━━━━━━━',
      '✅ Aucun frais caché',
      '✅ Décaissement instantané',
      '✅ Remboursement flexible',
      '━━━━━━━━━━━━━━━',
      'Disponible dans l\'app TRAIT',
      'Menu > Micro-Crédit',
    ]);
  }

  function renderSavings() {
    return renderInfoScreen('Épargne', <PiggyBank className="size-8 text-emerald-700" />, [
      'OBJECTIFS D\'ÉPARGNE',
      '━━━━━━━━━━━━━━━',
      '🎯 Créez des objectifs',
      '💰 Épargne automatique',
      '📊 Suivi en temps réel',
      '━━━━━━━━━━━━━━━',
      'Vos objectifs:',
      '• Ouvrez l\'app TRAIT',
      '• Menu > Épargne',
      '• Créez votre objectif',
    ]);
  }

  function renderPaymentLink() {
    return renderInfoScreen('Paiement par lien', <Link className="size-8 text-emerald-700" />, [
      'LIENS DE PAIEMENT',
      '━━━━━━━━━━━━━━━',
      '🔗 Générez un lien de paiement',
      '📱 Partagez par SMS/WhatsApp',
      '💳 Paiement par wallet/MPESA/Orange',
      '━━━━━━━━━━━━━━━',
      'Dans l\'app TRAIT:',
      'Menu > Liens de Paiement',
      'Créez et partagez vos liens',
    ]);
  }

  function renderPaymentRequest() {
    return renderInfoScreen('Demandes de paiement', <Handshake className="size-8 text-emerald-700" />, [
      'DEMANDES DE PAIEMENT',
      '━━━━━━━━━━━━━━━',
      '📤 Envoyez une demande',
      '💰 Montant et description',
      '🔔 Notification au destinataire',
      '━━━━━━━━━━━━━━━',
      'Dans l\'app TRAIT:',
      'Menu > Demandes de Paiement',
    ]);
  }

  function renderRecurring() {
    return renderInfoScreen('Paiements récurrents', <Repeat className="size-8 text-emerald-700" />, [
      'PAIEMENTS RÉCURRENTS',
      '━━━━━━━━━━━━━━━',
      '🔄 Planifiez vos paiements',
      '📅 Quotidien / Hebdo / Mensuel',
      '🔔 Rappels automatiques',
      '━━━━━━━━━━━━━━━',
      'Dans l\'app TRAIT:',
      'Menu > Paiements Récurrents',
    ]);
  }

  function renderInternational() {
    return renderInfoScreen('Transfert International', <Globe className="size-8 text-emerald-700" />, [
      'TRANSFERT INTERNATIONAL',
      '━━━━━━━━━━━━━━━',
      '🌍 Envoi vers l\'étranger',
      '💰 USD, EUR, GBP, XAF...',
      '🏦 Virement bancaire / Mobile Money',
      '━━━━━━━━━━━━━━━',
      'Frais compétitifs',
      'Taux de change préférentiel',
      '━━━━━━━━━━━━━━━',
      'Dans l\'app TRAIT > International',
    ]);
  }

  function renderCards() {
    return renderInfoScreen('Cartes TRAIT', <CreditCard className="size-8 text-emerald-700" />, [
      'CARTES TRAIT',
      '━━━━━━━━━━━━━━━',
      '💳 Carte Virtuelle USD/FC',
      '📱 Paiement mobile et NFC',
      '🔒 Sécurisée par PIN et 2FA',
      '━━━━━━━━━━━━━━━',
      '• Commandez depuis l\'app',
      '• Activez en 1 clic',
      '• Gérez vos plafonds',
      '━━━━━━━━━━━━━━━',
      'Menu > Cartes TRAIT',
    ]);
  }

  function renderReferral() {
    return renderInfoScreen('Code de Parrainage', <Gift className="size-8 text-emerald-700" />, [
      'PARRAINAGE TRAIT',
      '━━━━━━━━━━━━━━━',
      `🎁 Votre code: ${user?.referralCode || 'N/A'}`,
      '━━━━━━━━━━━━━━━',
      '👥 Parrainez vos proches',
      '💰 Gagnez des bonus',
      '📈 Suivez vos filleuls',
      '━━━━━━━━━━━━━━━',
      'Dans l\'app TRAIT:',
      'Menu > Parrainage',
    ]);
  }

  function renderAnalytics() {
    return renderInfoScreen('Analytiques', <BarChart3 className="size-8 text-emerald-700" />, [
      'STATISTIQUES',
      '━━━━━━━━━━━━━━━',
      '📊 Vue d\'ensemble',
      '💰 Revenus et dépenses',
      '📈 Graphiques mensuels',
      '━━━━━━━━━━━━━━━',
      'Dans l\'app TRAIT:',
      'Menu > Analytics',
    ]);
  }

  function renderReceipts() {
    return renderInfoScreen('Reçus électroniques', <Receipt className="size-8 text-emerald-700" />, [
      'REÇUS ÉLECTRONIQUES',
      '━━━━━━━━━━━━━━━',
      '🧾 Reçus pour chaque transaction',
      '📧 Envoi par email',
      '📱 Partage par WhatsApp',
      '━━━━━━━━━━━━━━━',
      'Dans l\'app TRAIT:',
      'Menu > Reçus',
    ]);
  }

  function renderContactPay() {
    return renderInfoScreen('Paiement Contact', <Users className="size-8 text-emerald-700" />, [
      'PAIEMENT CONTACT',
      '━━━━━━━━━━━━━━━',
      '📱 Payez depuis vos contacts',
      '👤 Sélectionnez un contact',
      '💰 Entrez le montant',
      '━━━━━━━━━━━━━━━',
      'Dans l\'app TRAIT:',
      'Menu > Paiement Contact',
    ]);
  }

  function renderQrPay() {
    return renderInfoScreen('Paiement QR', <QrCode className="size-8 text-emerald-700" />, [
      'PAIEMENT QR CODE',
      '━━━━━━━━━━━━━━━',
      '📷 Scannez un QR code',
      '💰 Payez instantanément',
      '🔒 Sécurisé par PIN',
      '━━━━━━━━━━━━━━━',
      'Dans l\'app TRAIT:',
      'Menu > QR Paiement',
    ]);
  }

  function renderMarketplace() {
    return renderInfoScreen('Marketplace', <Store className="size-8 text-emerald-700" />, [
      'MARKETPLACE TRAIT',
      '━━━━━━━━━━━━━━━',
      '🛍️ Achetez et vendez',
      '📦 Produits numériques',
      '💰 Paiement via Wallet TRAIT',
      '━━━━━━━━━━━━━━━',
      'Dans l\'app TRAIT:',
      'Menu > Marketplace',
    ]);
  }

  function renderBarterScreen() {
    return renderInfoScreen('Troc (Barter)', <RefreshCw className="size-8 text-emerald-700" />, [
      'TROC / BARTER',
      '━━━━━━━━━━━━━━━',
      '🔄 Échangez sans argent',
      '📦 Proposez vos biens',
      '💬 Négociez en direct',
      '━━━━━━━━━━━━━━━',
      'Dans l\'app TRAIT:',
      'Menu > Troc / Barter',
    ]);
  }

  function renderAgentInfo() {
    if (!user?.agentCode) {
      return renderInfoScreen('Info Agent', <UserCheck className="size-8 text-emerald-700" />, [
        'INFORMATION AGENT',
        '━━━━━━━━━━━━━━━',
        'ℹ️ Vous n\'êtes pas agent.',
        'Pour devenir agent TRAIT:',
        '• Menu > Devenir Agent',
        '• Remplissez le formulaire',
        '• Attendez la validation',
      ]);
    }
    return renderInfoScreen('Info Agent', <UserCheck className="size-8 text-emerald-700" />, [
      'VOS INFORMATIONS AGENT',
      '━━━━━━━━━━━━━━━',
      `🏢 Nom: ${user.businessName || user.name || 'N/A'}`,
      `🆔 Code: ${user.agentCode}`,
      `📞 Téléphone: ${user.phone}`,
      `📍 Localisation: ${user.location || 'N/A'}`,
      `✅ Statut: ${user.validationStatus === 'validated' ? 'Validé' : user.validationStatus}`,
      '━━━━━━━━━━━━━━━',
      'Utilisez l\'app pour:',
      '• Dépôts clients',
      '• Retraits clients',
      '• Voir votre activité',
    ]);
  }

  // ─── ACCOUNT ─────────────────────────────────────────────────

  function renderAccountInfo() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Mon compte" onBack={goMenu} />
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-1 mt-3">
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Nom</span><span className="font-medium">{user?.name || user?.pseudo || 'N/A'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Téléphone</span><span className="font-medium font-mono">{user?.phone}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Rôle</span><Badge variant="outline" className="text-xs">{user?.role === 'agent' ? 'Agent' : 'Client'}</Badge></div>
                {(user?.agentCode || user?.agentNumber) && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Code agent</span><span className="font-mono font-semibold text-emerald-700">{(() => { const c = user?.agentCode || user?.agentNumber; return c ? (c.startsWith('AGT-') ? c : `AGT-${c}`) : ''; })()}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Inscrit le</span><span className="text-xs">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : 'N/A'}</span></div>
              </CardContent>
            </Card>
            <div className="pt-3 space-y-1">
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors" onClick={() => setStep('change-pin-current')}>
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><Key className="size-4 text-amber-700" /></div>
                <span className="flex-1 text-left text-sm font-medium">Changer le code PIN</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors" onClick={() => setStep('temp-block')}>
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><ShieldOff className="size-4 text-red-600" /></div>
                <span className="flex-1 text-left text-sm font-medium text-red-600">Bloquer temporairement</span>
                <ChevronRight className="size-4 text-red-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Change PIN flow
  function renderChangePinCurrent() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Changer le PIN" onBack={() => setStep('account-info')} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center"><Key className="size-6 text-amber-700" /></div>
          <div className="text-center">
            <p className="text-base font-semibold">PIN actuel</p>
            <p className="text-sm text-muted-foreground">Entrez votre code PIN actuel</p>
          </div>
          <Input ref={inputRef} type="password" placeholder="••••" value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="h-14 text-2xl text-center tracking-[0.5em] max-w-[200px]" maxLength={8} onKeyDown={async (e) => {
            if (e.key === 'Enter' && inputValue.length >= 4) {
              const res = await fetch('/api/auth/verify-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, pin: inputValue }) });
              const data = await res.json();
              if (data.success) { updateTx({ currentPin: inputValue }); setStep('change-pin-new'); }
              else { toast.error('PIN actuel incorrect'); setInputValue(''); }
            }
          }} autoFocus />
          <Button className="w-full max-w-[300px] h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl" onClick={async () => {
            const res = await fetch('/api/auth/verify-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, pin: inputValue }) });
            const data = await res.json();
            if (data.success) { updateTx({ currentPin: inputValue }); setStep('change-pin-new'); }
            else { toast.error('PIN actuel incorrect'); setInputValue(''); }
          }} disabled={inputValue.length < 4}>Vérifier</Button>
        </div>
      </div>
    );
  }

  function renderChangePinNew() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Nouveau PIN" onBack={() => setStep('change-pin-current')} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="text-center">
            <p className="text-base font-semibold">Entrez le nouveau PIN</p>
            <p className="text-sm text-muted-foreground">Minimum 4 chiffres</p>
          </div>
          <Input ref={inputRef} type="password" placeholder="••••" value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="h-14 text-2xl text-center tracking-[0.5em] max-w-[200px]" maxLength={8} onKeyDown={(e) => e.key === 'Enter' && inputValue.length >= 4 && setStep('change-pin-confirm')} autoFocus />
          <Button className="w-full max-w-[300px] h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl" onClick={() => { updateTx({ newPin: inputValue }); setStep('change-pin-confirm'); }} disabled={inputValue.length < 4}>Suivant</Button>
        </div>
      </div>
    );
  }

  function renderChangePinConfirm() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Confirmer le PIN" onBack={() => setStep('change-pin-new')} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="text-center">
            <p className="text-base font-semibold">Confirmez le nouveau PIN</p>
            <p className="text-sm text-muted-foreground">Entrez le nouveau PIN à nouveau</p>
          </div>
          <Input ref={inputRef} type="password" placeholder="••••" value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="h-14 text-2xl text-center tracking-[0.5em] max-w-[200px]" maxLength={8} onKeyDown={async (e) => {
            if (e.key === 'Enter' && inputValue === tx.newPin && inputValue.length >= 4) {
              const res = await fetch('/api/auth/set-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, pin: inputValue }) });
              const data = await res.json();
              if (data.success) {
                setResultMessage('Votre code PIN a été modifié avec succès.');
                setStep('change-pin-done');
              } else { toast.error('Erreur'); }
            } else if (e.key === 'Enter') { toast.error('Les PIN ne correspondent pas'); }
          }} autoFocus />
          <Button className="w-full max-w-[300px] h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl" onClick={async () => {
            if (inputValue !== tx.newPin || inputValue.length < 4) { toast.error('Les PIN ne correspondent pas'); return; }
            const res = await fetch('/api/auth/set-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, pin: inputValue }) });
            const data = await res.json();
            if (data.success) {
              setResultMessage('Votre code PIN a été modifié avec succès.');
              setStep('change-pin-done');
            } else { toast.error('Erreur'); }
          }}>Confirmer</Button>
        </div>
      </div>
    );
  }

  function renderChangePinDone() {
    return <DoneStep msg={resultMessage || 'PIN modifié'} />;
  }

  // Temp block
  function renderTempBlock() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Blocage temporaire" onBack={() => setStep('account-info')} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle className="size-8 text-red-600" /></div>
          <div className="text-center max-w-[280px]">
            <p className="text-lg font-semibold text-red-600">Bloquer votre compte ?</p>
            <p className="text-sm text-muted-foreground mt-2">En cas de téléphone perdu ou volé, vous pouvez bloquer temporairement votre compte. Contactez le support pour le débloquer.</p>
          </div>
          <div className="flex gap-3 w-full max-w-[300px]">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep('account-info')}>Annuler</Button>
            <Button className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={async () => {
              if (!user?.id) return;
              try {
                await fetch('/api/ussd/temp-block', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, action: 'block' }) });
                setResultMessage('Votre compte a été bloqué temporairement.\n\nContactez le support TRAIT pour le débloquer.');
                setStep('temp-block-done');
              } catch { toast.error('Erreur'); }
            }}>Bloquer</Button>
          </div>
        </div>
      </div>
    );
  }

  function renderTempBlockDone() {
    return <DoneStep msg={resultMessage || 'Compte bloqué'} />;
  }

  // ─── SETTINGS ─────────────────────────────────────────────────

  function renderSettings() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Paramètres" onBack={goMenu} />
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-1 mt-3">
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors" onClick={() => setStep('settings-language')}>
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Globe className="size-4 text-blue-700" /></div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Langue</p>
                <p className="text-xs text-muted-foreground">{LANGUAGES.find(l => l.code === ussdLang)?.label}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors" onClick={() => setStep('settings-notifications')}>
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><Bell className="size-4 text-purple-700" /></div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Notifications SMS</p>
                <p className="text-xs text-muted-foreground">{smsNotif ? 'Activées' : 'Désactivées'}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors" onClick={() => setStep('settings-security')}>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><ShieldCheck className="size-4 text-emerald-700" /></div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Sécurité</p>
                <p className="text-xs text-muted-foreground">Changer PIN, vérrouiller compte</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderSettingsLanguage() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Langue" onBack={() => setStep('settings')} />
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground mb-4">Choisissez votre langue:</p>
          <div className="space-y-2">
            {LANGUAGES.map((lang, i) => (
              <motion.div key={lang.code} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className={`cursor-pointer hover:shadow-md transition-shadow ${ussdLang === lang.code ? 'border-emerald-300 bg-emerald-50/50' : ''}`} onClick={() => updateSetting({ ussdLanguage: lang.code })}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Globe className="size-5 text-muted-foreground" />
                    <span className="font-medium flex-1">{lang.label}</span>
                    {ussdLang === lang.code && <CheckCircle2 className="size-5 text-emerald-600" />}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderSettingsNotifications() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Notifications SMS" onBack={() => setStep('settings')} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center"><Bell className="size-8 text-purple-700" /></div>
          <div className="text-center">
            <p className="text-lg font-semibold">Notifications SMS</p>
            <p className="text-sm text-muted-foreground mt-1">{smsNotif ? 'Activées' : 'Désactivées'}</p>
          </div>
          <Button className={`w-full max-w-[300px] h-12 rounded-xl font-semibold ${smsNotif ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`} onClick={() => updateSetting({ smsNotifications: !smsNotif })}>
            {smsNotif ? 'Désactiver' : 'Activer'} les notifications
          </Button>
        </div>
      </div>
    );
  }

  function renderSettingsSecurity() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Sécurité" onBack={() => setStep('settings')} />
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-1 mt-3">
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors" onClick={() => setStep('change-pin-current')}>
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><Key className="size-4 text-amber-700" /></div>
              <span className="flex-1 text-left text-sm font-medium">Changer le code PIN</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors" onClick={() => setStep('temp-block')}>
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><ShieldOff className="size-4 text-red-600" /></div>
              <span className="flex-1 text-left text-sm font-medium text-red-600">Bloquer temporairement</span>
              <ChevronRight className="size-4 text-red-300" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── SUPPORT ──────────────────────────────────────────────────

  function renderSupport() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Support client" onBack={goMenu} />
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-1 mt-3">
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors" onClick={() => setStep('support-help')}>
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><HelpCircle className="size-4 text-blue-700" /></div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Aide</p>
                <p className="text-xs text-muted-foreground">FAQ et guide d'utilisation</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors" onClick={() => setStep('support-report')}>
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><MessageSquare className="size-4 text-amber-700" /></div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Signaler un problème</p>
                <p className="text-xs text-muted-foreground">Contacter l'assistance</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors" onClick={() => setStep('temp-block')}>
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><AlertTriangle className="size-4 text-red-600" /></div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-red-600">Bloquer mon compte</p>
                <p className="text-xs text-muted-foreground text-red-400">En cas de perte ou vol</p>
              </div>
              <ChevronRight className="size-4 text-red-300" />
            </button>
          </div>
          <Card className="mt-4 bg-emerald-50 border-emerald-200">
            <CardContent className="p-4 text-center">
              <Headphones className="size-8 text-emerald-700 mx-auto mb-2" />
              <p className="text-sm font-semibold text-emerald-800">Support TRAIT</p>
              <p className="text-xs text-emerald-700 mt-1">Disponible 24h/24, 7j/7</p>
              <p className="text-xs text-emerald-600 mt-2 font-mono">*1709*28#</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  function renderSupportReport() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Signaler un problème" onBack={() => setStep('support')} />
        <div className="flex-1 flex flex-col p-4 gap-4">
          <p className="text-sm text-muted-foreground">Décrivez votre problème :</p>
          <textarea
            className="w-full min-h-[120px] rounded-xl border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Décrivez votre problème..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl" onClick={() => {
            if (!inputValue.trim()) { toast.error('Décrivez votre problème'); return; }
            toast.success('Signalement envoyé. Notre équipe vous contactera.');
            goMenu();
          }} disabled={!inputValue.trim()}>Envoyer le signalement</Button>
        </div>
      </div>
    );
  }

  function renderSupportHelp() {
    return (
      <div className="flex flex-col h-full">
        <Header title="Aide" onBack={() => setStep('support')} />
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold text-sm mb-2">Comment utiliser TRAIT USSD ?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Composez *1709# depuis votre téléphone. Naviguez dans les 28 services disponibles.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold text-sm mb-2">Comment transférer de l'argent ?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Menu principal → Option 2 → Entrez le numéro → Entrez le montant → Confirmez avec votre PIN.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold text-sm mb-2">Code PIN oublié ?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Contactez le support client TRAIT pour réinitialiser votre code PIN.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold text-sm mb-2">Mon compte est bloqué</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Contactez le support TRAIT pour débloquer votre compte. Apportez une pièce d'identité valide.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold text-sm mb-2">Comment devenir agent ?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Menu → Devenir Agent. Remplissez le formulaire avec vos informations. Attendez la validation par l'administrateur.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ─── QUIT ─────────────────────────────────────────────────────

  function renderQuit() {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Phone className="size-10 text-muted-foreground" />
          </div>
        </motion.div>
        <div className="text-center">
          <p className="text-lg font-semibold mb-1">Merci d'utiliser</p>
          <p className="text-2xl font-black text-emerald-600 mb-2">TRAIT USSD</p>
          <p className="text-sm text-muted-foreground font-mono">*1709#</p>
        </div>
        <div className="flex gap-3 w-full max-w-[300px]">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={goMenu}>Menu principal</Button>
          <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={goBack}>Fermer USSD</Button>
        </div>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────

  const stepRenderers: Record<UssdStep, () => React.ReactNode> = {
    'welcome': renderWelcome,
    'main-menu': renderMainMenu,
    'balance': renderBalance,
    'balance-fc': renderBalance,
    'balance-usd': renderBalance,
    'transfer-currency': () => renderCurrencySelection("Transférer de l'argent", { fc: 'transfer-phone', usd: 'transfer-phone' }),
    'transfer-phone': renderTransferPhone,
    'transfer-amount': renderTransferAmount,
    'transfer-confirm': renderTransferConfirm,
    'transfer-pin': renderTransferPin,
    'transfer-done': () => <DoneStep msg={resultMessage} />,
    'withdraw-currency': () => renderCurrencySelection('Retrait via agent', { fc: 'withdraw-agent', usd: 'withdraw-agent' }),
    'withdraw-agent': renderWithdrawAgent,
    'withdraw-agent-name': renderWithdrawAgentName,
    'withdraw-amount': renderWithdrawAmount,
    'withdraw-confirm': renderWithdrawConfirm,
    'withdraw-pin': renderWithdrawPin,
    'withdraw-done': () => <DoneStep msg={resultMessage} />,
    'deposit-currency': () => renderCurrencySelection('Dépôt via agent', { fc: 'deposit-agent', usd: 'deposit-agent' }),
    'deposit-agent': renderDepositAgent,
    'deposit-agent-name': renderDepositAgentName,
    'deposit-amount': renderDepositAmount,
    'deposit-confirm': renderDepositConfirm,
    'deposit-done': () => <DoneStep msg={resultMessage} />,
    'credit-currency': () => renderCurrencySelection('Achat de crédit', { fc: 'credit-network', usd: 'credit-network' }),
    'credit-network': renderCreditNetwork,
    'credit-phone': renderCreditPhone,
    'credit-amount': renderCreditAmount,
    'credit-confirm': renderCreditConfirm,
    'credit-pin': renderCreditPin,
    'credit-done': () => <DoneStep msg={resultMessage} />,
    'bill-currency': () => renderCurrencySelection('Paiement de factures', { fc: 'bill-type', usd: 'bill-type' }),
    'bill-type': renderBillType,
    'bill-reference': renderBillReference,
    'bill-amount': renderBillAmount,
    'bill-confirm': renderBillConfirm,
    'bill-pin': renderBillPin,
    'bill-done': () => <DoneStep msg={resultMessage} />,
    'history': renderHistory,
    'favorites-list': renderFavoritesList,
    'favorites-add': renderFavoritesAdd,
    'quick-send': renderQuickSend,
    'quick-amount': () => renderQuickSend(),
    'quick-confirm': renderQuickConfirm,
    'quick-pin': renderQuickPin,
    'quick-done': () => <DoneStep msg={resultMessage} />,
    'account-info': renderAccountInfo,
    'change-pin-current': renderChangePinCurrent,
    'change-pin-new': renderChangePinNew,
    'change-pin-confirm': renderChangePinConfirm,
    'change-pin-done': renderChangePinDone,
    'temp-block': renderTempBlock,
    'temp-block-done': renderTempBlockDone,
    'settings': renderSettings,
    'settings-language': renderSettingsLanguage,
    'settings-notifications': renderSettingsNotifications,
    'settings-security': renderSettingsSecurity,
    'support': renderSupport,
    'support-report': renderSupportReport,
    'support-help': renderSupportHelp,
    'bundles': renderBundles,
    'microcredit': renderMicrocredit,
    'savings': renderSavings,
    'payment-link': renderPaymentLink,
    'payment-request': renderPaymentRequest,
    'recurring': renderRecurring,
    'international': renderInternational,
    'cards': renderCards,
    'referral': renderReferral,
    'analytics': renderAnalytics,
    'receipts': renderReceipts,
    'contact-pay': renderContactPay,
    'qr-pay': renderQrPay,
    'marketplace': renderMarketplace,
    'barter': renderBarterScreen,
    'agent-info': renderAgentInfo,
    'quit': renderQuit,
  };

  const renderStep = stepRenderers[step];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {renderStep()}
    </div>
  );
}
