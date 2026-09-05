'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Wallet,
  Phone,
  Building,
  CreditCard,
  Store,
  Globe,
  DollarSign,
  Clock,
  Check,
  ChevronRight,
  Info,
  Shield,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Receipt,
  Calculator,
  ShieldX,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

// ─── Constants ─────────────────────────────────────────────────────

const EXCHANGE_RATE_USD_FC = 2850;
const TRANSFER_FEE_RATE = 0.007; // 0.7%
const TRAIT_COMMISSION_RATE = 0.015; // 1.5%

const COUNTRIES = [
  { value: 'CD', label: '🇨🇩 République Démocratique du Congo' },
  { value: 'CI', label: '🇨🇮 Côte d\'Ivoire' },
  { value: 'CM', label: '🇨🇲 Cameroun' },
  { value: 'SN', label: '🇸🇳 Sénégal' },
  { value: 'ML', label: '🇲🇱 Mali' },
  { value: 'BF', label: '🇧🇫 Burkina Faso' },
  { value: 'GN', label: '🇬🇳 Guinée' },
  { value: 'TD', label: '🇹🇩 Tchad' },
  { value: 'GA', label: '🇬🇦 Gabon' },
  { value: 'CG', label: '🇨🇬 Congo-Brazzaville' },
  { value: 'BJ', label: '🇧🇯 Bénin' },
  { value: 'TG', label: '🇹🇬 Togo' },
  { value: 'NE', label: '🇳🇪 Niger' },
  { value: 'CF', label: '🇨🇫 Centrafrique' },
  { value: 'GQ', label: '🇬🇶 Guinée Équatoriale' },
  { value: 'BI', label: '🇧🇮 Burundi' },
  { value: 'RW', label: '🇷🇼 Rwanda' },
  { value: 'KE', label: '🇰🇪 Kenya' },
  { value: 'UG', label: '🇺🇬 Ouganda' },
  { value: 'TZ', label: '🇹🇿 Tanzanie' },
  { value: 'ZA', label: '🇿🇦 Afrique du Sud' },
  { value: 'NG', label: '🇳🇬 Nigeria' },
  { value: 'GH', label: '🇬🇭 Ghana' },
  { value: 'FR', label: '🇫🇷 France' },
  { value: 'BE', label: '🇧🇪 Belgique' },
  { value: 'US', label: '🇺🇸 États-Unis' },
  { value: 'GB', label: '🇬🇧 Royaume-Uni' },
  { value: 'CA', label: '🇨🇦 Canada' },
];

const MOBILE_NETWORKS = [
  { value: 'vodacom', label: 'Vodacom' },
  { value: 'airtel', label: 'Airtel' },
  { value: 'orange', label: 'Orange' },
  { value: 'africell', label: 'Africell' },
  { value: 'mtn', label: 'MTN' },
  { value: 'mpesa', label: 'M-Pesa' },
];

// ─── Types ─────────────────────────────────────────────────────────

type TransferType =
  | 'wallet'
  | 'mobile-money'
  | 'bank'
  | 'card'
  | 'merchant';

interface TransferTypeOption {
  id: TransferType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface FormData {
  // Common
  recipientCountry: string;
  beneficiaryName: string;
  currency: string;
  amount: string;
  motif: string;
  // Wallet
  traitNumber: string;
  // Mobile Money
  mobileNetwork: string;
  recipientPhone: string;
  // Bank
  bankName: string;
  accountNumber: string;
  swiftBic: string;
  iban: string;
  beneficiaryAddress: string;
  // Card
  cardHolder: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  billingAddress: string;
  // Merchant
  merchantId: string;
  merchantReference: string;
  transactionReference: string;
}

// ─── Transfer Type Definitions ─────────────────────────────────────

const TRANSFER_TYPES: TransferTypeOption[] = [
  {
    id: 'wallet',
    label: 'Wallet TRAIT',
    description: 'Transfert wallet à wallet',
    icon: Wallet,
  },
  {
    id: 'mobile-money',
    label: 'Mobile Money',
    description: 'Mobile money international',
    icon: Phone,
  },
  {
    id: 'bank',
    label: 'Banque',
    description: 'Virement bancaire',
    icon: Building,
  },
  {
    id: 'card',
    label: 'Carte Bancaire',
    description: 'Paiement par carte',
    icon: CreditCard,
  },
  {
    id: 'merchant',
    label: 'Paiement Marchand',
    description: 'Payer un marchand',
    icon: Store,
  },
];

const EMPTY_FORM: FormData = {
  recipientCountry: '',
  beneficiaryName: '',
  currency: 'USD',
  amount: '',
  motif: '',
  traitNumber: '',
  mobileNetwork: '',
  recipientPhone: '',
  bankName: '',
  accountNumber: '',
  swiftBic: '',
  iban: '',
  beneficiaryAddress: '',
  cardHolder: '',
  cardNumber: '',
  expiryDate: '',
  cvv: '',
  billingAddress: '',
  merchantId: '',
  merchantReference: '',
  transactionReference: '',

};

// ─── Helpers ───────────────────────────────────────────────────────

function fmtCur(amount: number, currency: string): string {
  if (currency === 'FC') return `${amount.toFixed(2)} FC`;
  if (currency === 'EUR') return `€${amount.toFixed(2)}`;
  return `$${amount.toFixed(2)}`;
}

function getEstimatedTime(type: TransferType): string {
  switch (type) {
    case 'wallet':
    case 'mobile-money':
    case 'merchant':
      return 'Instantané';
    case 'card':
      return '24 heures';
    case 'bank':
      return '2-3 jours ouvrables';
    default:
      return 'Instantané';
  }
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiryDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

// ─── Component ─────────────────────────────────────────────────────

export default function InternationalTransferScreen() {
  const { user, goBack, navigateTo, setUser } = useAppStore();

  const [selectedType, setSelectedType] = useState<TransferType | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // KYC & Security state
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const [kycLoading, setKycLoading] = useState(true);

  useEffect(() => {
    const currentUserId = user?.id;
    if (!currentUserId) return;

    async function check() {
      try {
        const token = useAppStore.getState().token;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/kyc?userId=${currentUserId}`, { headers });
        const data = await res.json();
        if (data.success) {
          setKycStatus(data.kyc.status);
          setDailyRemaining(data.security.remainingToday);
        }
      } catch { /* silent */ }
      finally { setKycLoading(false); }
    }
    check();
  }, [user?.id]);

  // ─── Computed Values ────────────────────────────────────────────

  const numericAmount = parseFloat(form.amount) || 0;
  const transferFee = Math.round(numericAmount * TRANSFER_FEE_RATE * 100) / 100;
  const traitCommission = Math.round(numericAmount * TRAIT_COMMISSION_RATE * 100) / 100;

  const conversionRate = useMemo(() => {
    if (!selectedType || !form.recipientCountry) return null;
    // Mock: if recipient is in FC zone, convert; otherwise show 1:1 for EUR
    const fcZoneCountries = ['CD', 'CG', 'BI', 'RW', 'CF', 'CG', 'GQ', 'GA', 'CM', 'CI', 'SN', 'ML', 'BF', 'GN', 'TD', 'NE', 'TG', 'BJ'];
    if (fcZoneCountries.includes(form.recipientCountry) && form.currency !== 'FC') {
      return { from: form.currency, to: 'FC', rate: form.currency === 'USD' ? EXCHANGE_RATE_USD_FC : EXCHANGE_RATE_USD_FC * 0.92 };
    }
    if (!fcZoneCountries.includes(form.recipientCountry) && form.currency === 'FC') {
      return { from: 'FC', to: 'USD', rate: 1 / EXCHANGE_RATE_USD_FC };
    }
    return null;
  }, [selectedType, form.recipientCountry, form.currency]);

  const receivedAmount = useMemo(() => {
    const afterFees = numericAmount - transferFee - traitCommission;
    if (conversionRate) {
      return Math.round(afterFees * conversionRate.rate * 100) / 100;
    }
    return afterFees;
  }, [numericAmount, transferFee, traitCommission, conversionRate]);

  const receivedCurrency = conversionRate?.to || form.currency;

  // ─── Form Handlers ──────────────────────────────────────────────

  function updateForm(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ─── Validation ─────────────────────────────────────────────────

  function validateForm(): boolean {
    if (!selectedType) {
      toast.error('Veuillez sélectionner un type de transfert');
      return false;
    }
    if (!form.recipientCountry) {
      toast.error('Veuillez sélectionner le pays du destinataire');
      return false;
    }
    if (!form.beneficiaryName.trim()) {
      toast.error('Veuillez entrer le nom du bénéficiaire');
      return false;
    }
    if (numericAmount <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return false;
    }

    // Type-specific validation
    switch (selectedType) {
      case 'wallet':
        if (!form.traitNumber.trim()) {
          toast.error('Veuillez entrer le numéro TRAIT ou téléphone');
          return false;
        }
        break;
      case 'mobile-money':
        if (!form.mobileNetwork) {
          toast.error('Veuillez sélectionner le réseau Mobile Money');
          return false;
        }
        if (!form.recipientPhone.trim()) {
          toast.error('Veuillez entrer le numéro du destinataire');
          return false;
        }
        break;
      case 'bank':
        if (!form.bankName.trim()) {
          toast.error('Veuillez entrer le nom de la banque');
          return false;
        }
        if (!form.accountNumber.trim()) {
          toast.error('Veuillez entrer le numéro de compte');
          return false;
        }
        if (!form.swiftBic.trim()) {
          toast.error('Veuillez entrer le code SWIFT/BIC');
          return false;
        }
        if (!form.iban.trim()) {
          toast.error('Veuillez entrer l\'IBAN');
          return false;
        }
        break;
      case 'card':
        if (!form.cardHolder.trim()) {
          toast.error('Veuillez entrer le nom du titulaire');
          return false;
        }
        if (form.cardNumber.replace(/\s/g, '').length < 16) {
          toast.error('Veuillez entrer un numéro de carte valide');
          return false;
        }
        if (form.expiryDate.replace('/', '').length < 4) {
          toast.error('Veuillez entrer une date d\'expiration valide');
          return false;
        }
        if (!form.cvv || form.cvv.length < 3) {
          toast.error('Veuillez entrer un CVV valide');
          return false;
        }
        break;
      case 'merchant':
        if (!form.merchantId.trim()) {
          toast.error('Veuillez entrer l\'ID Marchand');
          return false;
        }
        if (!form.merchantReference.trim()) {
          toast.error('Veuillez entrer la référence marchand');
          return false;
        }
        break;
    }

    return true;
  }

  // ─── Submit ─────────────────────────────────────────────────────

  async function handleViewSummary() {
    if (!validateForm()) return;
    setShowSummary(true);
  }

  async function handleConfirmTransfer() {
    if (!user?.id || !selectedType) return;
    setShowSummary(false);
    setLoading(true);

    try {
      const apiType = selectedType === 'mobile-money'
        ? 'mobile_money'
        : selectedType;

      const payload = {
        userId: user.id,
        type: apiType,
        recipientName: form.beneficiaryName.trim(),
        recipientPhone: form.recipientPhone || form.traitNumber || '',
        recipientAccount: form.accountNumber || form.cardNumber.replace(/\s/g, '') || form.merchantReference || form.transactionReference || '',
        recipientBank: form.bankName || form.mobileNetwork || '',
        swiftBic: form.swiftBic || '',
        iban: form.iban || '',
        country: form.recipientCountry,
        currency: form.currency,
        amount: numericAmount,
        description: form.motif || `${selectedTypeInfo?.label || 'Transfert'} vers ${countryLabel}`,
      };

      const token = useAppStore.getState().token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/transfers/international', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        if (data.updatedBalances) {
          setUser({
            ...user,
            realBalance: data.updatedBalances.realBalance,
            realBalanceFC: data.updatedBalances.realBalanceFC,
            bonusBalance: data.updatedBalances.bonusBalance,
            bonusBalanceFC: data.updatedBalances.bonusBalanceFC,
          } as any);
        }
        setShowSuccess(true);
      } else {
        toast.error(data.message || 'Erreur lors du transfert international');
      }
    } catch {
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  function handleSuccessClose() {
    setShowSuccess(false);
    setForm(EMPTY_FORM);
    setSelectedType(null);
  }

  // ─── Render Helpers ─────────────────────────────────────────────

  function renderTypeSpecificFields() {
    if (!selectedType) return null;

    switch (selectedType) {
      case 'wallet':
        return (
          <div className="space-y-2">
            <Label htmlFor="traitNumber" className="text-sm font-medium">
              Numéro TRAIT ou téléphone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="traitNumber"
              type="tel"
              placeholder="+243 000 000 000"
              value={form.traitNumber}
              onChange={(e) => updateForm('traitNumber', e.target.value)}
              className="h-11"
            />
          </div>
        );

      case 'mobile-money':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Réseau Mobile Money <span className="text-red-500">*</span>
              </Label>
              <Select value={form.mobileNetwork} onValueChange={(v) => updateForm('mobileNetwork', v)}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Sélectionner le réseau" />
                </SelectTrigger>
                <SelectContent>
                  {MOBILE_NETWORKS.map((net) => (
                    <SelectItem key={net.value} value={net.value}>
                      {net.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientPhone" className="text-sm font-medium">
                Numéro du destinataire <span className="text-red-500">*</span>
              </Label>
              <Input
                id="recipientPhone"
                type="tel"
                placeholder="+243 000 000 000"
                value={form.recipientPhone}
                onChange={(e) => updateForm('recipientPhone', e.target.value)}
                className="h-11"
              />
            </div>
          </>
        );

      case 'bank':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="bankName" className="text-sm font-medium">
                Nom de la banque <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bankName"
                type="text"
                placeholder="Ex: Rawbank, BCDC..."
                value={form.bankName}
                onChange={(e) => updateForm('bankName', e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber" className="text-sm font-medium">
                Numéro de compte <span className="text-red-500">*</span>
              </Label>
              <Input
                id="accountNumber"
                type="text"
                placeholder="Numéro de compte bancaire"
                value={form.accountNumber}
                onChange={(e) => updateForm('accountNumber', e.target.value)}
                className="h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="swiftBic" className="text-sm font-medium">
                  SWIFT/BIC <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="swiftBic"
                  type="text"
                  placeholder="ABCDEFXX"
                  value={form.swiftBic}
                  onChange={(e) => updateForm('swiftBic', e.target.value.toUpperCase())}
                  className="h-11"
                  maxLength={11}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iban" className="text-sm font-medium">
                  IBAN <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="iban"
                  type="text"
                  placeholder="IBAN"
                  value={form.iban}
                  onChange={(e) => updateForm('iban', e.target.value.toUpperCase())}
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="beneficiaryAddress" className="text-sm font-medium">
                Adresse du bénéficiaire
              </Label>
              <Input
                id="beneficiaryAddress"
                type="text"
                placeholder="Adresse complète"
                value={form.beneficiaryAddress}
                onChange={(e) => updateForm('beneficiaryAddress', e.target.value)}
                className="h-11"
              />
            </div>
          </>
        );

      case 'card':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="cardHolder" className="text-sm font-medium">
                Nom du titulaire <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cardHolder"
                type="text"
                placeholder="Nom complet sur la carte"
                value={form.cardHolder}
                onChange={(e) => updateForm('cardHolder', e.target.value.toUpperCase())}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardNumber" className="text-sm font-medium">
                Numéro de carte <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={form.cardNumber}
                  onChange={(e) => updateForm('cardNumber', formatCardNumber(e.target.value))}
                  className="h-11 pl-10"
                  maxLength={19}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="expiryDate" className="text-sm font-medium">
                  Date d&apos;expiration <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="expiryDate"
                  type="text"
                  placeholder="MM/AA"
                  value={form.expiryDate}
                  onChange={(e) => updateForm('expiryDate', formatExpiryDate(e.target.value))}
                  className="h-11"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv" className="text-sm font-medium">
                  CVV <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cvv"
                  type="password"
                  placeholder="•••"
                  value={form.cvv}
                  onChange={(e) => updateForm('cvv', e.target.value.replace(/\D/g, '').slice(0, 3))}
                  className="h-11"
                  maxLength={3}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingAddress" className="text-sm font-medium">
                Adresse de facturation
              </Label>
              <Input
                id="billingAddress"
                type="text"
                placeholder="Adresse de facturation"
                value={form.billingAddress}
                onChange={(e) => updateForm('billingAddress', e.target.value)}
                className="h-11"
              />
            </div>
          </>
        );

      case 'merchant':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="merchantId" className="text-sm font-medium">
                ID Marchand <span className="text-red-500">*</span>
              </Label>
              <Input
                id="merchantId"
                type="text"
                placeholder="Identifiant du marchand"
                value={form.merchantId}
                onChange={(e) => updateForm('merchantId', e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="merchantReference" className="text-sm font-medium">
                Référence marchand <span className="text-red-500">*</span>
              </Label>
              <Input
                id="merchantReference"
                type="text"
                placeholder="Référence unique"
                value={form.merchantReference}
                onChange={(e) => updateForm('merchantReference', e.target.value)}
                className="h-11"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  }

  // ─── Selected Type Info ─────────────────────────────────────────

  const selectedTypeInfo = TRANSFER_TYPES.find((t) => t.id === selectedType);
  const countryLabel = COUNTRIES.find((c) => c.value === form.recipientCountry)?.label || '';

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={goBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Transferts Internationaux</h1>
            <p className="text-xs text-muted-foreground">Envoyez de l&apos;argent partout dans le monde</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <Shield className="size-3" />
            <span className="font-medium">Sécurisé</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6 pb-8">
        {/* ── KYC / Security Warning Banner ─────────────────────── */}
        {!kycLoading && kycStatus !== 'verified' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30"
          >
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Vérification KYC requise
              </p>
              <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70">
                {kycStatus === 'none'
                  ? 'Vous devez vérifier votre identité avant d\'effectuer des transferts internationaux.'
                  : kycStatus === 'rejected'
                    ? 'Votre vérification a été refusée. Veuillez soumettre à nouveau.'
                    : 'Votre vérification est en cours de traitement.'}
              </p>
            </div>
            {kycStatus !== 'pending' && (
              <Button
                size="sm"
                className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0"
                onClick={() => navigateTo('kyc-verification')}
              >
                Vérifier
              </Button>
            )}
          </motion.div>
        )}

        {!kycLoading && dailyRemaining !== null && dailyRemaining <= 3 && kycStatus === 'verified' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30"
          >
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                Limite journalière
              </p>
              <p className="text-[10px] text-orange-600/70 dark:text-orange-500/70">
                {dailyRemaining === 0
                  ? 'Limite atteinte (10/jour). Réessayez demain.'
                  : `Il vous reste ${dailyRemaining} transaction(s) aujourd'hui.`}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Transfer Type Selection ──────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="size-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-foreground">Type de transfert</h2>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {TRANSFER_TYPES.map((type, index) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;

              return (
                <motion.button
                  key={type.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => {
                    setSelectedType(type.id);
                    setForm(EMPTY_FORM);
                  }}
                  className={`
                    relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200
                    ${isSelected
                      ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100'
                      : 'border-border bg-card hover:border-emerald-300 hover:bg-emerald-50/50'
                    }
                  `}
                >
                  <div className={`p-2.5 rounded-xl transition-colors ${isSelected ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="text-center">
                    <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-emerald-700' : 'text-foreground'}`}>
                      {type.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                      {type.description}
                    </p>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5"
                    >
                      <div className="size-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="size-3 text-white" />
                      </div>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Dynamic Form ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {selectedType && (
            <motion.div
              key={selectedType}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    {selectedTypeInfo && (
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                        <selectedTypeInfo.icon className="size-5" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{selectedTypeInfo?.label}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Remplissez les informations du transfert
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recipient Country */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Globe className="size-3.5 text-emerald-600" />
                      Pays du destinataire <span className="text-red-500">*</span>
                    </Label>
                    <Select value={form.recipientCountry} onValueChange={(v) => updateForm('recipientCountry', v)}>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="Sélectionner le pays" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Beneficiary Name */}
                  <div className="space-y-2">
                    <Label htmlFor="beneficiaryName" className="text-sm font-medium">
                      Nom du bénéficiaire <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="beneficiaryName"
                      type="text"
                      placeholder="Nom complet du bénéficiaire"
                      value={form.beneficiaryName}
                      onChange={(e) => updateForm('beneficiaryName', e.target.value)}
                      className="h-11"
                    />
                  </div>

                  {/* Currency */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <DollarSign className="size-3.5 text-emerald-600" />
                      Devise <span className="text-red-500">*</span>
                    </Label>
                    <Select value={form.currency} onValueChange={(v) => updateForm('currency', v)}>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - Dollar US</SelectItem>
                        <SelectItem value="FC">FC - Franc Congolais</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-medium">
                      Montant <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        {form.currency === 'USD' ? '$' : form.currency === 'EUR' ? '€' : ''}
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(e) => updateForm('amount', e.target.value)}
                        className={`h-11 ${form.currency !== 'FC' ? 'pl-7' : 'pl-3'}`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                        {form.currency}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Type-specific fields */}
                  <div className="space-y-4">
                    {selectedTypeInfo && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">
                          <selectedTypeInfo.icon className="size-3 mr-1" />
                          Champs {selectedTypeInfo.label}
                        </Badge>
                      </div>
                    )}
                    {renderTypeSpecificFields()}
                  </div>

                  <Separator />

                  {/* Motif (optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="motif" className="text-sm font-medium">
                      Motif <span className="text-muted-foreground font-normal">(optionnel)</span>
                    </Label>
                    <Textarea
                      id="motif"
                      placeholder="Raison du transfert..."
                      value={form.motif}
                      onChange={(e) => updateForm('motif', e.target.value)}
                      className="min-h-[80px] resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Fee preview */}
                  {numericAmount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className="size-4 text-emerald-600" />
                        <p className="text-sm font-semibold text-emerald-700">Aperçu des frais</p>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Montant envoyé</span>
                        <span className="font-medium">{fmtCur(numericAmount, form.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Frais de transfert (0.7%)</span>
                        <span className="font-medium">{fmtCur(transferFee, form.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Commission TRAIT (1.5%)</span>
                        <span className="font-medium">{fmtCur(traitCommission, form.currency)}</span>
                      </div>
                      {conversionRate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Taux de conversion</span>
                          <span className="font-medium text-amber-600">
                            1 {conversionRate.from} = {conversionRate.rate.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {conversionRate.to}
                          </span>
                        </div>
                      )}
                      <Separator className="my-1" />
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-emerald-700">Montant reçu (estimé)</span>
                        <span className="font-bold text-emerald-700">{fmtCur(receivedAmount, receivedCurrency)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        <span>Temps estimé: {getEstimatedTime(selectedType)}</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Security notice */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700">
                      Vérifiez attentivement les informations avant de confirmer. Les transferts internationaux sont irréversibles.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-base"
                    onClick={handleViewSummary}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Traitement en cours...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Voir le résumé
                        <ChevronRight className="size-4" />
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty State ──────────────────────────────────────── */}
        {!selectedType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="p-4 rounded-full bg-muted mb-4">
              <Globe className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              Sélectionnez un type de transfert
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Choisissez la méthode de transfert qui correspond à vos besoins pour envoyer de l&apos;argent à l&apos;international
            </p>
          </motion.div>
        )}
      </div>

      {/* ── Summary Dialog ─────────────────────────────────────── */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="mx-4 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-emerald-600" />
              Résumé du transfert
            </DialogTitle>
            <DialogDescription>
              Vérifiez les détails de votre transfert international
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Transfer Type */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              {selectedTypeInfo && (
                <div className="p-2 rounded-lg bg-emerald-500 text-white">
                  <selectedTypeInfo.icon className="size-5" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-emerald-700">{selectedTypeInfo?.label}</p>
                <p className="text-xs text-emerald-600">Transfert international</p>
              </div>
            </div>

            {/* Beneficiary Info */}
            <div className="space-y-3 p-4 rounded-xl bg-muted/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Informations du bénéficiaire
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pays</span>
                <span className="font-medium text-right max-w-[60%] truncate">{countryLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nom</span>
                <span className="font-medium">{form.beneficiaryName}</span>
              </div>

              {/* Type-specific summary fields */}
              {selectedType === 'wallet' && form.traitNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">N° TRAIT/Tél</span>
                  <span className="font-medium">{form.traitNumber}</span>
                </div>
              )}
              {selectedType === 'mobile-money' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Réseau</span>
                    <span className="font-medium">{MOBILE_NETWORKS.find((n) => n.value === form.mobileNetwork)?.label}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">N° Destinataire</span>
                    <span className="font-medium">{form.recipientPhone}</span>
                  </div>
                </>
              )}
              {selectedType === 'bank' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Banque</span>
                    <span className="font-medium">{form.bankName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Compte</span>
                    <span className="font-medium font-mono">{form.accountNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SWIFT/BIC</span>
                    <span className="font-medium font-mono">{form.swiftBic}</span>
                  </div>
                </>
              )}
              {selectedType === 'card' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Titulaire</span>
                    <span className="font-medium">{form.cardHolder}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Carte</span>
                    <span className="font-medium font-mono">•••• •••• •••• {form.cardNumber.replace(/\s/g, '').slice(-4)}</span>
                  </div>
                </>
              )}
              {selectedType === 'merchant' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ID Marchand</span>
                    <span className="font-medium font-mono">{form.merchantId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Référence</span>
                    <span className="font-medium">{form.merchantReference}</span>
                  </div>
                </>
              )}

              {form.motif && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Motif</span>
                  <span className="font-medium text-right max-w-[60%]">{form.motif}</span>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="space-y-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                Détails financiers
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant envoyé</span>
                <span className="font-medium">{fmtCur(numericAmount, form.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frais de transfert (0.7%)</span>
                <span className="font-medium text-red-500">-{fmtCur(transferFee, form.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Commission TRAIT (1.5%)</span>
                <span className="font-medium text-red-500">-{fmtCur(traitCommission, form.currency)}</span>
              </div>
              {conversionRate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taux de conversion</span>
                  <span className="font-medium text-amber-600">
                    1 {conversionRate.from} = {conversionRate.rate.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {conversionRate.to}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-emerald-700">Montant reçu</span>
                <span className="font-bold text-emerald-700 text-lg">
                  {fmtCur(receivedAmount, receivedCurrency)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <Clock className="size-3" />
                <span>Temps estimé: {getEstimatedTime(selectedType!)}</span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
              <Shield className="size-4 text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Ce transfert est sécurisé par un cryptage de bout en bout. Vos données financières sont protégées.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowSummary(false)}>
              Modifier
            </Button>
            <Button
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleConfirmTransfer}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Envoi...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Confirmer le transfert
                  <ArrowRight className="size-4" />
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Success Dialog ─────────────────────────────────────── */}
      <Dialog open={showSuccess} onOpenChange={handleSuccessClose}>
        <DialogContent className="mx-4 rounded-2xl text-center">
          <DialogHeader className="items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mx-auto mb-2"
            >
              <div className="size-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="size-10 text-emerald-600" />
              </div>
            </motion.div>
            <DialogTitle className="text-xl text-emerald-700">
              Transfert envoyé avec succès !
            </DialogTitle>
            <DialogDescription className="text-sm">
              Votre transfert international a été initié. Le bénéficiaire recevra les fonds selon le délai estimé.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Montant envoyé</span>
                <span className="font-bold text-emerald-700">{fmtCur(numericAmount, form.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant reçu</span>
                <span className="font-bold text-emerald-700">{fmtCur(receivedAmount, receivedCurrency)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Temps estimé</span>
                <span className="font-medium">{getEstimatedTime(selectedType!)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-xs text-muted-foreground">
              <Info className="size-4 shrink-0" />
              <span>
                Un reçu sera disponible dans votre historique de transactions.
              </span>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={handleSuccessClose}
            >
              Nouveau transfert
            </Button>
            <Button
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                handleSuccessClose();
                navigateTo('history');
              }}
            >
              <span className="flex items-center gap-2">
                Voir l&apos;historique
                <ArrowRight className="size-4" />
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
