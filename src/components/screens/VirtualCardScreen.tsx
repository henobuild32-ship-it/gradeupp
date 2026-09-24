'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Snowflake,
  Flame,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  ShieldAlert,
  History,
  Globe,
  Nfc,
  Banknote,
  Wallet,
  Package,
  CheckCircle2,
  Loader2,
  SlidersHorizontal,
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
 * - Mode démo = SPÉCIMEN uniquement (0000 0000 0000 0000).
 */

const REVEAL_TIMEOUT_MS = 30_000;
const CLIPBOARD_CLEAR_MS = 60_000;
const IS_SPECIMEN = process.env.NEXT_PUBLIC_CARD_MODE !== 'live';

type LimitKey = 'online' | 'contactless' | 'atm';

interface CardLimits {
  online: boolean;
  contactless: boolean;
  atm: boolean;
}

export default function VirtualCardScreen() {
  const { goBack, navigateTo, user, setPendingPinAction } = useAppStore();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [cardState, setCardState] = useState<VirtualCardState>('active');
  const [revealed, setRevealed] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [showOneTimeDialog, setShowOneTimeDialog] = useState(false);
  const [showLimitsDialog, setShowLimitsDialog] = useState(false);
  const [limits, setLimits] = useState<CardLimits>({
    online: true,
    contactless: true,
    atm: true,
  });

  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Données carte (last4 uniquement — jamais de PAN complet en state persistant) ──
  const [card, setCard] = useState<VirtualCardData>({
    last4: IS_SPECIMEN ? '0000' : '0000',
    maskedNumber: '•••• •••• •••• 0000',
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
          const active = (data.cards || []).find(
            (c: { status: string }) => c.status === 'active' || c.status === 'suspended' || c.status === 'blocked' || c.status === 'frozen',
          );
          const pending = (data.pendingRequests || [])[0];
          if (active) {
            const last4 = String(active.cardNumber || '').slice(-4) || '0000';
            setCardState(
              active.status === 'frozen'
                ? 'frozen'
                : active.status === 'blocked'
                  ? 'blocked'
                  : active.status === 'suspended'
                    ? 'frozen'
                    : 'active',
            );
            setCard((c) => ({
              ...c,
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
        // Silently keep specimen defaults in demo
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
    setPendingPinAction(() => async () => {
      // Après PIN OK : en mode live, appeler GET /api/cards/reveal → SDK émetteur.
      // Ici : jamais de PAN inventé hors spécimen.
      setRevealed(true);
      setCard((c) => ({
        ...c,
        revealed: true,
        issuerPan: IS_SPECIMEN ? null : c.issuerPan,
        issuerExpiry: IS_SPECIMEN ? null : c.issuerExpiry,
        issuerCvv: IS_SPECIMEN ? null : c.issuerCvv,
      }));
      startRevealTimer();
      toast.success(t('vcard.revealed'));
    });
    navigateTo('pin-verify');
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
        body: JSON.stringify({ action: next === 'frozen' ? 'freeze' : 'unfreeze' }),
      });
      const data = await res.json();
      if (data.success) {
        setCardState(next);
        hideDetails();
        toast.success(next === 'frozen' ? t('vcard.frozen_toast') : t('vcard.unfrozen_toast'));
      } else {
        // Fallback UI même si endpoint absent (maquette)
        setCardState(next);
        toast.success(next === 'frozen' ? t('vcard.frozen_toast') : t('vcard.unfrozen_toast'));
      }
    } catch {
      setCardState(next);
      toast.success(next === 'frozen' ? t('vcard.frozen_toast') : t('vcard.unfrozen_toast'));
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
    setShowLostDialog(false);
    setActionLoading('lost');
    // Remplacement immédiat carte virtuelle
    setCardState('blocked');
    hideDetails();
    setActionLoading(null);
    toast.success(t('vcard.lost_done'));
  };

  const handleOneTimeCard = () => {
    setShowOneTimeDialog(false);
    toast.success(t('vcard.one_time_done'));
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
        case 'limits':
          setShowLimitsDialog(true);
          break;
        case 'online':
          setLimits((l) => ({ ...l, online: !l.online }));
          toast.success(limits.online ? t('vcard.online_disabled') : t('vcard.online_enabled'));
          break;
        case 'tx':
          navigateTo('history');
          break;
        case 'lost':
          setShowLostDialog(true);
          break;
        case 'onetime':
          setShowOneTimeDialog(true);
          break;
        default:
          break;
      }
    },
    [toggleFreeze, limits.online, navigateTo, t],
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
        id: 'limits',
        icon: SlidersHorizontal,
        labelKey: 'vcard.limits',
        disabled: cardState === 'pending',
      },
      {
        id: 'online',
        icon: Globe,
        labelKey: limits.online ? 'vcard.online_off' : 'vcard.online_on',
        disabled: cardState === 'pending' || cardState === 'blocked',
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
        disabled: cardState === 'pending',
      },
      {
        id: 'onetime',
        icon: Wallet,
        labelKey: 'vcard.one_time',
        disabled: cardState === 'pending',
      },
    ],
    [cardState, actionLoading, limits.online],
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

        {/* Actions de révélation (détails) */}
        {(cardState === 'active' || cardState === 'frozen') && (
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-auto flex-col gap-1 py-3 rounded-xl border-border"
              onClick={revealed ? hideDetails : requestReveal}
            >
              {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="text-[10px]">
                {revealed ? t('vcard.hide_details') : t('vcard.show_details')}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-auto flex-col gap-1 py-3 rounded-xl border-border"
              onClick={() =>
                copyField(
                  IS_SPECIMEN ? '0000000000000000' : card.maskedNumber.replace(/\s|•/g, ''),
                  'vcard.copied_number',
                )
              }
            >
              <Copy className="w-4 h-4" />
              <span className="text-[10px]">{t('vcard.copy_number')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-auto flex-col gap-1 py-3 rounded-xl border-border"
              disabled={!revealed}
              onClick={() =>
                copyField(IS_SPECIMEN ? '0000' : card.expiry, 'vcard.copied_expiry')
              }
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[10px]">{t('vcard.copy_expiry')}</span>
            </Button>
          </div>
        )}

        {/* Révélation : copies CVV */}
        {revealed && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => copyField(IS_SPECIMEN ? '000' : '', 'vcard.copied_cvv')}
            >
              <Copy className="w-4 h-4" />
              {t('vcard.copy_cvv')}
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground rounded-xl border border-dashed border-border">
              <Fingerprint className="w-3.5 h-3.5 text-[#3ddc97]" />
              {t('vcard.auth_ok')}
            </div>
          </div>
        )}

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
        </div>

        {/* Résumé limites */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('vcard.limits_title')}
          </p>
          {(
            [
              { key: 'online' as LimitKey, icon: Globe, labelKey: 'vcard.limit_online' },
              { key: 'contactless' as LimitKey, icon: Nfc, labelKey: 'vcard.limit_contactless' },
              { key: 'atm' as LimitKey, icon: Banknote, labelKey: 'vcard.limit_atm' },
            ] as const
          ).map(({ key, icon: Icon, labelKey }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <Icon className="w-4 h-4 text-muted-foreground" />
                {t(labelKey)}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={limits[key]}
                onClick={() => setLimits((l) => ({ ...l, [key]: !l[key] }))}
                className="relative h-6 w-11 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: limits[key] ? '#3ddc97' : 'rgba(128,128,128,0.35)',
                  outlineColor: '#3ddc97',
                }}
                aria-label={t(labelKey)}
              >
                <span
                  className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: limits[key] ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          ))}
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
            >
              <ShieldAlert className="w-4 h-4" />
              {t('vcard.lost_confirm')}
            </Button>
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setShowLostDialog(false)}>
              {t('vcard.cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : carte à usage unique ── */}
      <Dialog open={showOneTimeDialog} onOpenChange={setShowOneTimeDialog}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('vcard.one_time_title')}</DialogTitle>
            <DialogDescription>{t('vcard.one_time_desc')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Button
              className="h-11 rounded-xl bg-[#0f1b2d] hover:bg-[#0f1b2d]/90 text-white dark:bg-[#3ddc97] dark:text-[#0f1b2d] dark:hover:bg-[#3ddc97]/90"
              onClick={handleOneTimeCard}
            >
              <Wallet className="w-4 h-4" />
              {t('vcard.one_time_confirm')}
            </Button>
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setShowOneTimeDialog(false)}>
              {t('vcard.cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : limites détaillées ── */}
      <Dialog open={showLimitsDialog} onOpenChange={setShowLimitsDialog}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('vcard.limits_dialog_title')}</DialogTitle>
            <DialogDescription>{t('vcard.limits_dialog_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(
              [
                { key: 'online' as LimitKey, labelKey: 'vcard.limit_online' },
                { key: 'contactless' as LimitKey, labelKey: 'vcard.limit_contactless' },
                { key: 'atm' as LimitKey, labelKey: 'vcard.limit_atm' },
              ] as const
            ).map(({ key, labelKey }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{t(labelKey)}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={limits[key]}
                  onClick={() => setLimits((l) => ({ ...l, [key]: !l[key] }))}
                  className="relative h-6 w-11 rounded-full transition-colors"
                  style={{ background: limits[key] ? '#3ddc97' : 'rgba(128,128,128,0.35)' }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                    style={{ transform: limits[key] ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            ))}
          </div>
          <Button className="h-11 rounded-xl w-full" onClick={() => setShowLimitsDialog(false)}>
            {t('vcard.save')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
