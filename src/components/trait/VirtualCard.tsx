'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Snowflake,
  ShieldCheck,
  Package,
  Clock,
  CheckCircle2,
  Fingerprint,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * VirtualCard — écran carte Trait (ratio ID-1 85,6 × 54 mm).
 *
 * SÉCURITÉ (maquette / démo) :
 * - Jamais de PAN/CVV réel. Mode SPÉCIMEN = 0000 0000 0000 0000.
 * - En production, le PAN complet vient uniquement d'un SDK émetteur
 *   (panneau sécurisé) — jamais stocké ni loggé côté app Trait.
 */

export type VirtualCardState =
  | 'pending'      // 1. Demande en cours
  | 'active'       // 2. Carte virtuelle active
  | 'shipping'     // 3. Carte physique commandée
  | 'frozen'       // 4. Gelée
  | 'blocked';     // 4. Bloquée / perdue

export interface VirtualCardData {
  /** Derniers 4 chiffres uniquement (ou '0000' en spécimen). */
  last4: string;
  /** Masqué par défaut : •••• •••• •••• 1234 */
  maskedNumber: string;
  /** Expiration affichable (MM/AA). Vide tant que non révélée. */
  expiry: string;
  /** Nom du titulaire (profil KYC vérifié). */
  holder: string;
  cardType: 'USD' | 'FC';
  state: VirtualCardState;
  /** true = détails révélés temporairement (après auth). */
  revealed?: boolean;
  /** Données émetteur injectées par SDK sécurisé (jamais générées ici). */
  /** En démo : null → affichage SPÉCIMEN. */
  issuerPan?: string | null;
  issuerExpiry?: string | null;
  issuerCvv?: string | null;
}

export interface PendingTrackingStep {
  id: string;
  labelKey: string;
  done: boolean;
  active?: boolean;
}

export interface ShippingTrackingStep {
  id: string;
  labelKey: string;
  done: boolean;
  active?: boolean;
}

interface VirtualCardProps {
  data: VirtualCardData;
  onReveal?: () => void;
  onHide?: () => void;
  onActivate?: () => void;
  onUnfreeze?: () => void;
  className?: string;
}

const IS_SPECIMEN = process.env.NEXT_PUBLIC_CARD_MODE !== 'live';

function specimenPan(): string {
  return '0000 0000 0000 0000';
}

function formatPan(pan: string): string {
  return pan.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
}

function maskPan(last4: string): string {
  const l = (last4 || '0000').replace(/\D/g, '').padStart(4, '0').slice(-4);
  return `•••• •••• •••• ${l}`;
}

export default function VirtualCard({
  data,
  onReveal,
  onHide,
  onActivate,
  onUnfreeze,
  className = '',
}: VirtualCardProps) {
  const { t } = useTranslation();
  const [showBack, setShowBack] = useState(false);

  const isUSD = data.cardType === 'USD';
  const accent = '#3ddc97';
  const night = '#0f1b2d';
  const isDimmed =
    data.state === 'pending' || data.state === 'frozen' || data.state === 'blocked';
  const canReveal =
    data.state === 'active' || data.state === 'shipping' || data.state === 'frozen';

  // Numéro affiché : révélé (SDK) ou masqué / spécimen
  const displayPan =
    data.revealed && data.issuerPan && !IS_SPECIMEN
      ? formatPan(data.issuerPan)
      : data.revealed && IS_SPECIMEN
        ? specimenPan()
        : maskPan(data.last4);

  const displayExpiry =
    data.revealed && data.issuerExpiry && !IS_SPECIMEN
      ? data.issuerExpiry
      : data.revealed
        ? '00/00'
        : data.expiry || '••/••';

  const displayCvv =
    data.revealed && data.issuerCvv && !IS_SPECIMEN ? data.issuerCvv : '•••';

  const pendingSteps: PendingTrackingStep[] = [
    { id: 'kyc', labelKey: 'vcard.step_kyc', done: true },
    { id: 'create', labelKey: 'vcard.step_create', done: false, active: true },
    { id: 'ready', labelKey: 'vcard.step_ready', done: false },
  ];

  const shipSteps: ShippingTrackingStep[] = [
    { id: 'manufacture', labelKey: 'vcard.step_manufacture', done: true },
    { id: 'ship', labelKey: 'vcard.step_ship', done: false, active: true },
    { id: 'deliver', labelKey: 'vcard.step_deliver', done: false },
    { id: 'activate', labelKey: 'vcard.step_activate', done: false },
  ];

  const stateBadge = () => {
    switch (data.state) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-200 text-[11px] font-semibold px-2.5 py-1">
            <Clock className="w-3 h-3" />
            {t('vcard.status_pending')}
          </span>
        );
      case 'shipping':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-400/40 text-sky-200 text-[11px] font-semibold px-2.5 py-1">
            <Package className="w-3 h-3" />
            {t('vcard.status_shipping')}
          </span>
        );
      case 'frozen':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-[11px] font-semibold px-2.5 py-1">
            <Snowflake className="w-3 h-3" />
            {t('vcard.status_frozen')}
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 text-[11px] font-semibold px-2.5 py-1">
            <Lock className="w-3 h-3" />
            {t('vcard.status_blocked')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-semibold px-2.5 py-1">
            <CheckCircle2 className="w-3 h-3" />
            {t('vcard.status_active')}
          </span>
        );
    }
  };

  return (
    <div className={`w-full ${className}`} data-testid="virtual-card" data-state={data.state}>
      {/* ── Carte ID-1 ── */}
      <div
        className="relative w-full rounded-[18px] overflow-hidden select-none"
        style={{
          aspectRatio: '85.6 / 54',
          background: night,
          border: `1px solid ${isDimmed ? 'rgba(255,255,255,0.12)' : 'rgba(61,220,151,0.35)'}`,
          boxShadow: isDimmed
            ? '0 12px 32px -8px rgba(0,0,0,0.45)'
            : '0 20px 48px -12px rgba(15,27,45,0.55), 0 0 0 1px rgba(61,220,151,0.08)',
          opacity: data.state === 'pending' ? 0.72 : 1,
          filter: data.state === 'pending' ? 'grayscale(0.45)' : undefined,
        }}
        aria-label={t('vcard.card_label', { state: t(`vcard.status_${data.state === 'active' ? 'active' : data.state}`) })}
      >
        {/* Texture subtle */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 20% 0%, rgba(61,220,151,0.12) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(61,220,151,0.06) 0%, transparent 40%)',
          }}
        />

        {/* Contenu face */}
        <div className="relative z-10 h-full flex flex-col justify-between p-[5.5%] md:p-[6%]">
          {/* Haut : wordmark + badge */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span
                className="font-bold tracking-[0.18em] text-[13px] md:text-[15px] uppercase"
                style={{ color: '#ffffff' }}
              >
                Trait
              </span>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: accent }}
                aria-hidden
              />
            </div>
            <div className="flex items-center gap-2">
              {stateBadge()}
              {isUSD ? null : (
                <span className="text-[9px] font-bold tracking-widest text-white/70 border border-white/20 rounded px-1.5 py-0.5">
                  FC
                </span>
              )}
            </div>
          </div>

          {/* Milieu : numéro */}
          <div className="mt-auto">
            <p
              className="text-[7px] md:text-[8px] font-semibold tracking-[0.22em] mb-1 uppercase"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {t('vcard.number_label')}
            </p>
            <p
              className="font-mono font-bold text-[15px] sm:text-[18px] md:text-[21px] tracking-[0.12em] leading-none break-all"
              style={{
                color: data.revealed ? accent : '#ffffff',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
              data-testid="card-pan"
            >
              {displayPan}
            </p>
            {IS_SPECIMEN && data.revealed && (
              <p
                className="mt-1 text-[9px] font-bold tracking-[0.2em] uppercase"
                style={{ color: accent }}
              >
                Spécimen
              </p>
            )}
            {!data.revealed && (
              <p className="mt-1 text-[9px] text-white/45 uppercase tracking-wider">
                {t('vcard.specimen_hint')}
              </p>
            )}
          </div>

          {/* Bas : titulaire + exp + révéler */}
          <div className="flex items-end justify-between gap-3 mt-3">
            <div className="min-w-0 flex-1">
              <p
                className="text-[7px] md:text-[8px] font-semibold tracking-[0.18em] mb-0.5 uppercase"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {t('vcard.holder_label')}
              </p>
              <p
                className="text-[10px] md:text-[12px] font-bold uppercase tracking-wider truncate"
                style={{ color: '#ffffff' }}
              >
                {data.holder}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-[7px] md:text-[8px] font-semibold tracking-[0.18em] mb-0.5 uppercase"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {t('vcard.expiry_label')}
              </p>
              <p
                className="font-mono text-[10px] md:text-[12px] font-bold"
                style={{ color: '#ffffff' }}
              >
                {displayExpiry}
              </p>
            </div>
            {canReveal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (data.revealed) onHide?.();
                  else onReveal?.();
                }}
                className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: data.revealed ? 'rgba(61,220,151,0.15)' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${data.revealed ? accent : 'rgba(255,255,255,0.2)'}`,
                  color: data.revealed ? accent : '#ffffff',
                  outlineColor: accent,
                }}
                aria-label={data.revealed ? t('vcard.hide_details') : t('vcard.show_details')}
              >
                {data.revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {data.revealed ? t('vcard.hide_short') : t('vcard.show_short')}
              </button>
            )}
          </div>
        </div>

        {/* Overlay états non actifs */}
        <AnimatePresence>
          {data.state === 'frozen' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{ background: 'rgba(8,15,28,0.72)', backdropFilter: 'blur(4px)' }}
            >
              <div className="text-center px-4">
                <Snowflake className="w-8 h-8 mx-auto mb-1.5" style={{ color: accent }} />
                <p className="text-white text-xs font-bold uppercase tracking-widest">
                  {t('vcard.frozen_overlay')}
                </p>
                {onUnfreeze && (
                  <button
                    type="button"
                    onClick={onUnfreeze}
                    className="mt-3 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ background: accent, color: night, outlineColor: accent }}
                  >
                    {t('vcard.unfreeze_cta')}
                  </button>
                )}
              </div>
            </motion.div>
          )}
          {data.state === 'blocked' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{ background: 'rgba(8,15,28,0.78)', backdropFilter: 'blur(4px)' }}
            >
              <div className="text-center px-4">
                <ShieldCheck className="w-8 h-8 mx-auto mb-1.5 text-red-400" />
                <p className="text-white text-xs font-bold uppercase tracking-widest">
                  {t('vcard.blocked_overlay')}
                </p>
                <p className="text-white/60 text-[10px] mt-1">{t('vcard.blocked_overlay_hint')}</p>
              </div>
            </motion.div>
          )}
          {data.state === 'pending' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 text-center"
              style={{ background: 'rgba(8,15,28,0.55)' }}
            >
              <p className="text-white text-[11px] font-bold uppercase tracking-[0.2em] mb-1">
                {t('vcard.pending_overlay')}
              </p>
              <p className="text-white/55 text-[9px]">{t('vcard.pending_overlay_hint')}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge SPÉCIMEN permanent hors révélation */}
        {IS_SPECIMEN && (
          <span
            className="absolute bottom-2 right-3 z-10 text-[7px] font-black tracking-[0.25em] uppercase pointer-events-none"
            style={{ color: 'rgba(61,220,151,0.45)' }}
            aria-hidden
          >
            Spécimen
          </span>
        )}
      </div>

      {/* ── Suivi (états pending / shipping) ── */}
      {(data.state === 'pending' || data.state === 'shipping') && (
        <div
          className="mt-4 rounded-2xl border border-border bg-card p-4"
          data-testid="card-tracking"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {data.state === 'pending' ? t('vcard.tracking_pending') : t('vcard.tracking_shipping')}
          </p>
          <ol className="space-y-3">
            {(data.state === 'pending' ? pendingSteps : shipSteps).map((step, i, arr) => (
              <li key={step.id} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{
                    background: step.done
                      ? accent
                      : step.active
                        ? 'rgba(61,220,151,0.15)'
                        : 'rgba(128,128,128,0.15)',
                    color: step.done ? night : step.active ? accent : 'rgb(128,128,128)',
                    border: step.done ? 'none' : `1px solid ${step.active ? accent : 'transparent'}`,
                  }}
                  aria-hidden
                >
                  {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[13px] leading-tight ${
                      step.done || step.active ? 'text-foreground font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {t(step.labelKey)}
                  </p>
                </div>
                {i < arr.length - 1 && (
                  <span
                    className="absolute left-[calc(50%-1px)] w-px h-3 bg-border"
                    aria-hidden
                  />
                )}
              </li>
            ))}
          </ol>

          {data.state === 'shipping' && onActivate && (
            <button
              type="button"
              onClick={onActivate}
              className="mt-4 w-full h-11 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: accent, color: night, outlineColor: accent }}
            >
              {t('vcard.activate_cta')}
            </button>
          )}
        </div>
      )}

      {/* Ligne CVV si révélé (masquée sinon — jamais stockée) */}
      {data.revealed && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-2.5">
          <span className="text-xs text-muted-foreground font-medium">{t('vcard.cvv_label')}</span>
          <span className="font-mono text-sm font-bold tracking-widest text-foreground">
            {displayCvv}
          </span>
        </div>
      )}

      {/* Note biométrie */}
      {data.revealed && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Fingerprint className="w-3.5 h-3.5 text-[#3ddc97]" />
          {t('vcard.auto_hide_note')}
        </p>
      )}
    </div>
  );
}
