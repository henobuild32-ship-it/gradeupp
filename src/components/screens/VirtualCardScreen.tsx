'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Snowflake,
  Flame,
  Copy,
  ShieldAlert,
  History,
  Package,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import VirtualCard, { type VirtualCardData, type VirtualCardState } from '@/components/trait/VirtualCard';

/**
 * Écran « Carte virtuelle » — ce que l'utilisateur voit après sa demande.
 *
 * SÉCURITÉ :
 * - Révélation des détails : PIN (biométrie native via WebAuthn/FLAG_SECURE côté natif).
 * - Auto-masquage après 30 s ou passage en arrière-plan.
 * - Copie : presse-papiers effacé après 60 s.
 * - Jamais de stockage local du PAN/CVV complet.
 * - Sans émetteur bancaire connecté, aucun numéro ni CVV n'est affiché.
 */

const REVEAL_TIMEOUT_MS = 30_000;
const CLIPBOARD_CLEAR_MS = 60_000;

export default function VirtualCardScreen() {
  const { goBack, navigateTo, user, pageParams } = useAppStore();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [cardState, setCardState] = useState<VirtualCardState>('active');
  const [revealed, setRevealed] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showLostDialog, setShowLostDialog] = useState(false);

  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Données carte (last4 uniquement — jamais de PAN complet en state persistant) ──
  const [card, setCard] = useState<VirtualCardData>({
    last4: '',
    maskedNumber: '•••• •••• ••••',
    expiry: '',
    holder: user?.name || user?.pseudo || '—',
    cardType: 'USD',
    state: 'active',
    revealed: false,
    issuerPan: null,
    issuerExpiry: null,
    issuerCvv: null,
  });

  const clearRevealTimer = useCallback(() => {
    if (revealTimer.current) {
      clearTimeout(revealTimer.current);
      revealTimer.current = null;
    }
  }, []);

  const hideDetails = useCallback(() => {
    setRevealed(false);
    setCard((c) => ({
      ...c,
      revealed: false,
      issuerPan: null,
      issuerExpiry: null,
      issuerCvv: null,
    }));
    clearRevealTimer();
  }, [clearRevealTimer]);

  const startRevealTimer = useCallback(() => {
    clearRevealTimer();
    revealTimer.current = setTimeout(() => {
      hideDetails();
      toast.info(t('vcard.auto_hidden'));
    }, REVEAL_TIMEOUT_MS);
  }, [clearRevealTimer, hideDetails, t]);

  // Auto-hide on background / tab hide
  useEffect(() => {
    const onHide = () => {
      if (revealed) hideDetails();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur', onHide);
      clearRevealTimer();
      if (clipboardTimer.current) clearTimeout(clipboardTimer.current);
    };
  }, [revealed, hideDetails, clearRevealTimer]);

  // ── Chargement statut carte (API) ──
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const token = useAppStore.getState().token;
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`/api/cards/my-cards?userId=${user.id}`, { headers });
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          const active = (data.cards || []).find((c: { id: string }) => c.id === pageParams.cardId) || (data.cards || []).find(
            (c: { status: string }) => ['active', 'suspended', 'blocked', 'frozen', 'pending_retrieval'].includes(c.status),
          );
          const pending = (data.pendingRequests || [])[0];
          if (active) {
            const last4 = String(active.cardNumber || '').replace(/\D/g, '').slice(-4);
            setCardState(
              active.status === 'pending_retrieval'
                ? 'pending'
                : active.status === 'frozen'
                ? 'frozen'
                : active.status === 'blocked'
                  ? 'blocked'
                  : active.status === 'suspended'
                    ? 'frozen'
                    : 'active',
            );
            setCard((c) => ({
              ...c,
              id: active.id,
              last4,
              maskedNumber: `•••• •••• •••• ${last4}`,
              cardType: active.cardType === 'FC' ? 'FC' : 'USD',
              expiry: active.expiryDate || '',
              holder: user?.name || user?.pseudo || '—',
            }));
          } else if (pending) {
            setCardState('pending');
            setCard((c) => ({ ...c, cardType: pending.cardType === 'FC' ? 'FC' : 'USD', state: 'pending' }));
          } else {
            // Pas de carte → redirection écran demande
            navigateTo('card-request');
            return;
          }
        }
      } catch {
        toast.error('Impossible de charger le statut de votre carte. Réessayez.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.name, user?.pseudo, navigateTo]);

  useEffect(() => {
    setCard((c) => ({ ...c, state: cardState, revealed }));
  }, [cardState, revealed]);

  // ── Révélation sécurisée (PIN puis — natif — biométrie) ──
  const requestReveal = () => {
    toast.info('Aucun émetteur bancaire n’est connecté. Les numéros et CVV ne sont pas générés ni révélés par TRAIT.');
  };

  // ── Gel / dégel ──
  const toggleFreeze = useCallback(async () => {
    if (cardState !== 'active' && cardState !== 'frozen') return;
    const next = cardState === 'frozen' ? 'active' : 'frozen';
    setActionLoading('freeze');
    try {
      const token = useAppStore.getState().token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/cards/freeze', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: next === 'frozen' ? 'freeze' : 'unfreeze', cardId: card.id }),
      });
      const data = await res.json();
      if (data.success) {
        setCardState(next);
        hideDetails();
        toast.success(next === 'frozen' ? t('vcard.frozen_toast') : t('vcard.unfrozen_toast'));
      } else {
        toast.error(data.message || 'La carte n’a pas été modifiée');
      }
    } catch {
      toast.error('Impossible de joindre le service de carte');
    } finally {
      setActionLoading(null);
    }
  }, [cardState, hideDetails, t]);

  // ── Copie avec effacement presse-papiers à 60 s ──
  const copyField = async (value: string, labelKey: string) => {
    if (!value || value.includes('•')) {
      toast.error(t('vcard.reveal_first'));
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t(labelKey));
      if (clipboardTimer.current) clearTimeout(clipboardTimer.current);
      clipboardTimer.current = setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {});
      }, CLIPBOARD_CLEAR_MS);
    } catch {
      toast.error(t('vcard.copy_error'));
    }
  };

  // ── Actions ──
  const handleLost = async () => {
    if (!card.id) {
      toast.error('Carte introuvable. Actualisez votre liste de cartes.');
      return;
    }
    setActionLoading('lost');
    try {
      const token = useAppStore.getState().token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch('/api/cards/freeze', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'lost', cardId: card.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'La carte n’a pas pu être bloquée');
      setShowLostDialog(false);
      setCardState('blocked');
      hideDetails();
      toast.success('Carte bloquée', { description: 'Son QR est invalidé. Vous pouvez demander un remplacement.' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de joindre le service de carte');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivatePhysical = () => {
    setCardState('active');
    toast.success(t('vcard.physical_activated'));
  };

  const handleAction = useCallback(
    (id: string) => {
      switch (id) {
        case 'freeze':
          void toggleFreeze();
          break;
        case 'tx':
          navigateTo('history');
          break;
        case 'lost':
          setShowLostDialog(true);
          break;
        default:
          break;
      }
    },
    [toggleFreeze, navigateTo],
  );

  const actionGrid = useMemo<Array<{
    id: string;
    icon: React.ElementType;
    labelKey: string;
    danger?: boolean;
    disabled?: boolean;
  }>>(
    () => [
      {
        id: 'freeze',
        icon: cardState === 'frozen' ? Flame : Snowflake,
        labelKey: cardState === 'frozen' ? 'vcard.unfreeze' : 'vcard.freeze',
        disabled: actionLoading === 'freeze' || cardState === 'pending' || cardState === 'blocked',
      },
      {
        id: 'tx',
        icon: History,
        labelKey: 'vcard.recent_tx',
        disabled: false,
      },
      {
        id: 'lost',
        icon: ShieldAlert,
        labelKey: 'vcard.report_lost',
        danger: true,
        disabled: cardState === 'pending' || cardState === 'blocked' || actionLoading === 'lost',
      },
    ],
    [cardState, actionLoading],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={goBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">{t('vcard.title')}</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" data-secure-card="true">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 pt-6 pb-3"
      >
        <Button variant="ghost" size="icon" className="rounded-full" onClick={goBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground">{t('vcard.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('vcard.subtitle')}</p>
        </div>
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex-1 px-4 pb-8 space-y-5"
      >
        {/* Carte */}
        <VirtualCard
          data={card}
          onReveal={requestReveal}
          onHide={hideDetails}
          onActivate={handleActivatePhysical}
          onUnfreeze={cardState === 'frozen' ? () => toggleFreeze() : undefined}
        />

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="font-semibold">Portefeuille TRAIT interne</p>
          <p className="mt-1 text-xs leading-relaxed">TRAIT n’est pas relié à un émetteur bancaire. Aucun numéro bancaire ni CVV n’est créé ou révélé. Les paiements TRAIT seront activés après validation et remise de la carte.</p>
        </div>
        {/* Actions sous la carte */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('vcard.actions_title')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {actionGrid.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleAction(action.id)}
                disabled={action.disabled}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-4 text-center transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:pointer-events-none ${
                  action.danger ? 'border-red-500/30' : ''
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    action.danger
                      ? 'bg-red-500/10 text-red-500'
                      : 'bg-[#3ddc97]/10 text-[#0f1b2d] dark:text-[#3ddc97]'
                  }`}
                >
                  <action.icon className="w-4.5 h-4.5" />
                </span>
                <span
                  className={`text-[11px] font-medium leading-tight ${
                    action.danger ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                  }`}
                >
                  {t(action.labelKey)}
                </span>
              </button>
            ))}
          </div>
          {cardState === 'blocked' && (
            <Button className="mt-3 w-full rounded-xl" onClick={() => navigateTo('card-request')}>
              Demander une carte de remplacement
            </Button>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">Paramètres de paiement bancaire</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Les plafonds bancaires, paiements en ligne, sans contact et retraits ne sont pas activés : ils nécessitent un émetteur bancaire connecté. Les paiements QR TRAIT restent soumis à la confirmation du titulaire.</p>
        </div>

        {/* Note sécurité */}
        <p className="text-[11px] leading-relaxed text-muted-foreground flex items-start gap-2">
          <Package className="w-4 h-4 mt-0.5 shrink-0 text-[#3ddc97]" />
          {t('vcard.security_note')}
        </p>
      </motion.main>

      {/* ── Dialog : signalement perte/vol ── */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('vcard.lost_title')}</DialogTitle>
            <DialogDescription>{t('vcard.lost_desc')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Button
              className="h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white"
              onClick={handleLost}
              disabled={actionLoading === 'lost'}
            >
              {actionLoading === 'lost' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
              {actionLoading === 'lost' ? 'Blocage…' : t('vcard.lost_confirm')}
            </Button>
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setShowLostDialog(false)}>
              {t('vcard.cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
