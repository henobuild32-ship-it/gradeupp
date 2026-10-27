'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

interface ReceiptData {
  id: string;
  receiptNumber: string;
  invoiceNumber?: string | null;
  type: string;
  amount: number;
  fee: number;
  total: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
  sender: { name: string; phone: string };
  receiver: { name: string; phone: string };
}

export default function ReceiptScreen() {
  const { user, navigateTo, pageParams } = useAppStore();
  const { t } = useTranslation();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const transactionId = pageParams?.transactionId;

  useEffect(() => {
    if (!transactionId) { setLoading(false); return; }
    fetchReceipt();
  }, [transactionId]);

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
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  async function handleShare() {
    if (!receipt) return;
    const text = `TRAIT - Reçu de transaction\nN°: ${receipt.receiptNumber}${receipt.invoiceNumber ? `\nFacture: ${receipt.invoiceNumber}` : ''}\nMontant: ${receipt.currency === 'FC' ? '' : '$'}${receipt.amount.toFixed(2)} ${receipt.currency === 'FC' ? 'FC' : 'USD'}\nDe: ${receipt.sender.name}\nÀ: ${receipt.receiver.name}\nDate: ${formatDate(receipt.createdAt)}`;
    try { await navigator.share({ title: 'Reçu TRAIT', text }); } catch {}
  }

  async function handleCopy() {
    if (!receipt) return;
    const text = `Reçu TRAIT\n${receipt.receiptNumber}${receipt.invoiceNumber ? `\nFacture: ${receipt.invoiceNumber}` : ''}\n${formatDate(receipt.createdAt)}\nDe: ${receipt.sender.name} (${receipt.sender.phone})\nÀ: ${receipt.receiver.name} (${receipt.receiver.phone})\nMontant: ${receipt.currency === 'FC' ? '' : '$'}${receipt.amount.toFixed(2)} ${receipt.currency === 'FC' ? 'FC' : 'USD'}\nFrais: ${receipt.currency === 'FC' ? '' : '$'}${receipt.fee.toFixed(2)} ${receipt.currency === 'FC' ? 'FC' : 'USD'}\nTotal: ${receipt.currency === 'FC' ? '' : '$'}${receipt.total.toFixed(2)} ${receipt.currency === 'FC' ? 'FC' : 'USD'}\nStatut: ${receipt.status}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Détails copiés !');
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleDownload() {
    if (!receipt) return;
    const text = `TRAIT - Reçu de Transaction\n${'='.repeat(40)}\nN° Reçu: ${receipt.receiptNumber}${receipt.invoiceNumber ? `\nN° Facture: ${receipt.invoiceNumber}` : ''}\nDate: ${formatDate(receipt.createdAt)}\n\n--- EXPÉDITEUR ---\nNom: ${receipt.sender.name}\nTéléphone: ${receipt.sender.phone}\n\n--- DESTINATAIRE ---\nNom: ${receipt.receiver.name}\nTéléphone: ${receipt.receiver.phone}\n\n--- DÉTAILS ---\nDescription: ${receipt.description || 'N/A'}\nMontant: ${receipt.currency === 'FC' ? '' : '$'}${receipt.amount.toFixed(2)} ${receipt.currency === 'FC' ? 'FC' : 'USD'}\nFrais: ${receipt.currency === 'FC' ? '' : '$'}${receipt.fee.toFixed(2)} ${receipt.currency === 'FC' ? 'FC' : 'USD'}\nTotal: ${receipt.currency === 'FC' ? '' : '$'}${receipt.total.toFixed(2)} ${receipt.currency === 'FC' ? 'FC' : 'USD'}\nStatut: ${receipt.status}\n\n${'='.repeat(40)}\nMerci d'utiliser TRAIT !`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recu-${receipt.receiptNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Reçu téléchargé !');
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-border overflow-hidden print:rounded-none print:shadow-none">
          <div className="bg-[#0D5C63] p-6 text-white text-center">
            <p className="text-lg font-bold">TRAIT</p>
            <p className="text-[10px] opacity-80 mt-0.5">Transfert d&apos;argent sécurisé</p>
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
                {receipt.currency === 'FC' ? '' : '$'}{receipt.amount.toFixed(2)} {receipt.currency === 'FC' ? 'FC' : 'USD'}
              </p>
              {receipt.description && (
                <p className="text-xs text-muted-foreground mt-1">{receipt.description}</p>
              )}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">EXPÉDITEUR</p>
                <p className="text-sm font-semibold text-foreground">{receipt.sender.name}</p>
                <p className="text-xs text-muted-foreground">{receipt.sender.phone}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">DESTINATAIRE</p>
                <p className="text-sm font-semibold text-foreground">{receipt.receiver.name}</p>
                <p className="text-xs text-muted-foreground">{receipt.receiver.phone}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-medium">{receipt.currency === 'FC' ? '' : '$'}{receipt.amount.toFixed(2)} {receipt.currency === 'FC' ? 'FC' : 'USD'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frais</span>
                <span className="font-medium">{receipt.currency === 'FC' ? '' : '$'}{receipt.fee.toFixed(2)} {receipt.currency === 'FC' ? 'FC' : 'USD'}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-[#0D5C63]">{receipt.currency === 'FC' ? '' : '$'}{receipt.total.toFixed(2)} {receipt.currency === 'FC' ? 'FC' : 'USD'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="print:hidden flex flex-wrap gap-2 mt-6">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />Partager
          </Button>
          <Button variant="outline" className="flex-1 rounded-xl" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />Télécharger
          </Button>
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => window.print()}>
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
