'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Share2,
  Copy,
  Download,
  Printer,
  X,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import { formatCurrencyAmount, formatExchangeRate, normalizeCurrency } from '@/lib/currency';
import { getCountry } from '@/lib/countries';
import { QRCodeSVG } from 'qrcode.react';

interface ReceiptData {
  id: string;
  receiptNumber: string;
  invoiceNumber?: string | null;
  type: string;
  amount: number;
  fee: number;
  total: number;
  currency: string;
  receivingCurrency?: string | null;
  amountReceived?: number | null;
  exchangeRate?: number | null;
  status: string;
  description: string;
  createdAt: string;
  sender: { name: string; phone: string | null; country: string | null };
  receiver: { name: string; phone: string | null; country: string | null };
}

export default function ReceiptScreen() {
  const { user, navigateTo, pageParams } = useAppStore();
  const { t } = useTranslation();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState('');

  const transactionId = pageParams?.transactionId;

  useEffect(() => {
    if (!transactionId) { setLoading(false); return; }
    fetchReceipt();
  }, [transactionId]);

  useEffect(() => {
    if (receipt && typeof window !== 'undefined') {
      setVerificationUrl(`${window.location.origin}/receipt/verify/${encodeURIComponent(receipt.id)}`);
    }
  }, [receipt?.id]);

  async function fetchReceipt() {
    try {
      const res = await fetch('/api/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transactionId }),
      });
      const data = await res.json();
      if (data.success && data.receipt?.transaction) {
        const result = data.receipt;
        const transaction = result.transaction;
        setReceipt({
          id: transaction.id,
          receiptNumber: result.receiptNumber,
          invoiceNumber: result.invoiceNumber ?? null,
          type: transaction.type,
          amount: transaction.amount,
          fee: transaction.fee,
          total: transaction.amount + transaction.fee,
          currency: transaction.currency,
          receivingCurrency: transaction.receivingCurrency ?? transaction.currency,
          amountReceived: transaction.amountReceived ?? transaction.amount,
          exchangeRate: transaction.exchangeRate ?? null,
          status: transaction.status,
          description: transaction.description || '',
          createdAt: transaction.createdAt,
          sender: result.sender,
          receiver: result.receiver,
        });
      }
      else toast.error('Reçu introuvable');
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed': return <Badge className="bg-emerald-100 text-emerald-700 border-0"><CheckCircle className="h-3 w-3 mr-1" />Complété</Badge>;
      case 'pending': return <Badge className="bg-amber-100 text-amber-700 border-0"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'failed': return <Badge className="bg-red-100 text-red-700 border-0"><XCircle className="h-3 w-3 mr-1" />Échoué</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  }

  function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'long', timeStyle: 'short', timeZoneName: 'short',
    }).format(new Date(dateStr));
  }

  function money(amount: number, currency: string) {
    return formatCurrencyAmount(amount, normalizeCurrency(currency));
  }

  function countryName(code: string | null) {
    if (!code) return '—';
    return getCountry(code)?.nameFr || code;
  }

  async function handleShare() {
    if (!receipt) return;
    const text = `Trait Fintech — Reçu de transaction\nN°: ${receipt.receiptNumber}${receipt.invoiceNumber ? `\nFacture: ${receipt.invoiceNumber}` : ''}\nEnvoyé: ${money(receipt.amount, receipt.currency)}\nReçu: ${money(receipt.amountReceived ?? receipt.amount, receipt.receivingCurrency || receipt.currency)}\nDe: ${receipt.sender.name}\nÀ: ${receipt.receiver.name}\nDate: ${formatDate(receipt.createdAt)}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Reçu Trait Fintech', text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success('Détails du reçu copiés.');
      }
    } catch { toast.error('Le partage n’a pas abouti.'); }
  }

  async function handleCopy() {
    if (!receipt) return;
    const text = `Reçu Trait Fintech\n${receipt.receiptNumber}${receipt.invoiceNumber ? `\nFacture: ${receipt.invoiceNumber}` : ''}\n${formatDate(receipt.createdAt)}\nDe: ${receipt.sender.name} (${receipt.sender.phone})\nÀ: ${receipt.receiver.name} (${receipt.receiver.phone})\nEnvoyé: ${money(receipt.amount, receipt.currency)}\nFrais: ${money(receipt.fee, receipt.currency)}\nTotal débité: ${money(receipt.total, receipt.currency)}\nReçu: ${money(receipt.amountReceived ?? receipt.amount, receipt.receivingCurrency || receipt.currency)}${receipt.exchangeRate ? `\nTaux: 1 USD = ${formatExchangeRate(receipt.exchangeRate)} CDF` : ''}\nStatut: ${receipt.status}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Détails copiés !');
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function imageUrlToDataUrl(url: string): Promise<string> {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error('Image du document indisponible');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Image invalide'));
      reader.onerror = () => reject(new Error('Image invalide'));
      reader.readAsDataURL(blob);
    });
  }

  async function qrSvgToPng(): Promise<string> {
    const svg = document.querySelector<SVGSVGElement>('.receipt-verification-qr');
    if (!svg) throw new Error('QR de vérification indisponible');
    const svgData = new XMLSerializer().serializeToString(svg);
    const objectUrl = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new window.Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Impossible de préparer le QR de vérification'));
        image.src = objectUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 384;
      canvas.height = 384;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Préparation du QR indisponible');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function handleDownload() {
    if (!receipt) return;
    if (downloading) return;
    setDownloading(true);
    try {
      const [{ createReceiptPdf }, logoDataUrl, qrDataUrl] = await Promise.all([
        import('@/lib/receipt-pdf'),
        imageUrlToDataUrl('/trait-logo.png'),
        qrSvgToPng(),
      ]);
      const bytes = createReceiptPdf({
        ...receipt,
        transactionId: receipt.id,
        invoiceNumber: receipt.invoiceNumber ?? null,
        receivingCurrency: receipt.receivingCurrency ?? receipt.currency,
        amountReceived: receipt.amountReceived ?? receipt.amount,
        exchangeRate: receipt.exchangeRate ?? null,
        verificationUrl,
        logoDataUrl,
        qrDataUrl,
      });
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const pdf = new Blob([buffer], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `Trait-Fintech-${receipt.receiptNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      toast.success('Reçu PDF téléchargé.');
    } catch {
      toast.error('Impossible de générer le PDF. Réessayez ou utilisez Imprimer / PDF.');
    } finally {
      setDownloading(false);
    }
  }

  function handlePrint() {
    if (!receipt) return;
    if (typeof window.print !== 'function') {
      toast.error('L’impression n’est pas prise en charge sur cet appareil.');
      return;
    }
    document.body.classList.add('receipt-print-mode');
    window.addEventListener('afterprint', () => document.body.classList.remove('receipt-print-mode'), { once: true });
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-sm rounded-2xl" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Reçu introuvable</p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigateTo('home')}>Retour</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="print:hidden flex items-center gap-3 px-4 pt-6 pb-4 bg-white dark:bg-gray-950">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">{receipt.invoiceNumber ? 'Facture et reçu' : 'Reçu'}</h1>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto print:max-w-none print:p-0">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="receipt-print-area bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-border overflow-hidden print:rounded-none print:shadow-none">
          <div className="receipt-print-header bg-[#0D5C63] p-6 text-white text-center">
            <Image src="/trait-logo.png" width={56} height={56} alt="Logo Trait Fintech" className="receipt-brand-logo mx-auto mb-2 rounded-lg bg-white object-contain" />
            <p className="text-lg font-bold">Trait Fintech</p>
            <p className="text-[10px] opacity-80 mt-0.5">Reçu de transaction confirmé</p>
            <div className="mt-4">
            <p className="text-[10px] opacity-70">N° reçu {receipt.receiptNumber}</p>
            {receipt.invoiceNumber && <p className="text-[10px] opacity-80 mt-1">Facture {receipt.invoiceNumber}</p>}
              <p className="text-xs mt-1 opacity-80">{formatDate(receipt.createdAt)}</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-center py-3">
              {getStatusBadge(receipt.status)}
              <p className={`text-3xl font-bold mt-2 ${
                receipt.status === 'failed' ? 'text-red-600' : 'text-gray-900 dark:text-white'
              }`}>
                {money(receipt.amount, receipt.currency)}
              </p>
              {receipt.description && (
                <p className="text-xs text-muted-foreground mt-1">{receipt.description}</p>
              )}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">EXPÉDITEUR</p>
                <p className="text-sm font-semibold text-foreground">{receipt.sender.name}</p>
                <p className="text-xs text-muted-foreground">{countryName(receipt.sender.country)}{receipt.sender.phone ? ` · ${receipt.sender.phone}` : ''}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">DESTINATAIRE</p>
                <p className="text-sm font-semibold text-foreground">{receipt.receiver.name}</p>
                <p className="text-xs text-muted-foreground">{countryName(receipt.receiver.country)}{receipt.receiver.phone ? ` · ${receipt.receiver.phone}` : ''}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Type d’opération</span>
                <span className="text-right font-medium">{receipt.type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant envoyé</span>
                <span className="font-medium">{money(receipt.amount, receipt.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frais</span>
                <span className="font-medium">{money(receipt.fee, receipt.currency)}</span>
              </div>
              {receipt.exchangeRate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taux appliqué</span>
                  <span className="font-medium">1 USD = {formatExchangeRate(receipt.exchangeRate)} CDF</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant reçu</span>
                <span className="font-medium">{money(receipt.amountReceived ?? receipt.amount, receipt.receivingCurrency || receipt.currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-[#0D5C63]">{money(receipt.total, receipt.currency)}</span>
              </div>
            </div>

            {verificationUrl && (
              <div className="border-t border-border pt-4 text-center">
                <p className="text-xs font-semibold text-foreground">Vérifier l’authenticité du reçu</p>
                <QRCodeSVG value={verificationUrl} size={116} level="M" includeMargin className="receipt-verification-qr mx-auto mt-2" aria-label="QR code de vérification du reçu" />
                <p className="break-all text-[10px] text-muted-foreground print:hidden">{verificationUrl}</p>
              </div>
            )}
          </div>
        </motion.div>

        <div className="print:hidden flex flex-wrap gap-2 mt-6">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />Partager
          </Button>
          <Button variant="outline" className="flex-1 rounded-xl" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {downloading ? 'Préparation…' : 'Télécharger le PDF'}
          </Button>
          <Button variant="outline" className="flex-1 rounded-xl" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />Imprimer / PDF
          </Button>
          <Button variant="outline" className="flex-1 rounded-xl" onClick={handleCopy}>
            {copied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? 'Copié' : 'Copier'}
          </Button>
          <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => navigateTo('home')}>
            <X className="h-4 w-4 mr-2" />Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
