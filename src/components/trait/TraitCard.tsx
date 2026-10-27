'use client';

import { useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { BadgeCheck, LockKeyhole, UserRound } from 'lucide-react';

interface TraitCardProps {
  cardType: 'USD' | 'FC';
  cardNumber?: string | null;
  cardHolder: string;
  expiryDate?: string | null;
  cvv?: string | null;
  qrCode?: string | null;
  balance?: number;
  status?: string;
  jobTitle?: string | null;
  birthDate?: string | null;
  holderPhoto?: string | null;
  cardId?: string | null;
  requestStatus?: string | null;
}

function cardStatus(status: string, requestStatus?: string | null) {
  if (status === 'active') return { label: 'ACTIVE', color: '#82e2ce' };
  if (status === 'pending_retrieval') {
    return requestStatus === 'pending'
      ? { label: 'EN VALIDATION', color: '#f5d28a' }
      : { label: 'RETRAIT REQUIS', color: '#f5d28a' };
  }
  if (status === 'frozen') return { label: 'GELÉE', color: '#91d7f2' };
  if (status === 'blocked' || status === 'suspended') return { label: 'BLOQUÉE', color: '#ffaaa7' };
  return { label: 'APERÇU', color: '#d6e0de' };
}

export default function TraitCard({
  cardType,
  cardNumber,
  cardHolder,
  qrCode,
  status = 'pending_retrieval',
  jobTitle,
  birthDate,
  holderPhoto,
  cardId,
  requestStatus,
}: TraitCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const isFC = cardType === 'FC';
  const isBlocked = ['suspended', 'blocked', 'frozen'].includes(status);
  const accent = isFC ? '#f38b9d' : '#81dfcc';
  const background = isFC
    ? 'linear-gradient(132deg,#25151c 0%,#3b2029 54%,#18212a 100%)'
    : 'linear-gradient(132deg,#102a31 0%,#183a45 54%,#172635 100%)';
  const cardRef = cardNumber?.replace(/\D/g, '').slice(-4) || cardId?.slice(-4).toUpperCase() || 'APERÇU';
  const safeQr = status === 'active' && requestStatus !== 'pending' && !isBlocked ? qrCode?.trim() || '' : '';
  const maskedBirthDate = birthDate?.includes('XXXX') ? birthDate : '••/••/XXXX';
  const state = cardStatus(status, requestStatus);
  const holder = cardHolder?.trim() || 'NOM PRÉNOM';

  return (
    <div className="w-full select-none" style={{ perspective: 1400, containerType: 'inline-size' }}>
      <button
        type="button"
        aria-label={`${isFlipped ? 'Afficher le recto' : 'Afficher le verso'} de la carte TRAIT de ${holder}`}
        aria-pressed={isFlipped}
        onClick={() => setIsFlipped(value => !value)}
        className="group relative block w-full cursor-pointer rounded-[22px] text-left outline-none transition-transform duration-700 ease-[cubic-bezier(.2,.75,.25,1)] focus-visible:ring-2 focus-visible:ring-[#167b70] focus-visible:ring-offset-4 motion-reduce:transition-none"
        style={{ aspectRatio: '85.6 / 53.98', transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)' }}
      >
        {/* Recto — QR opaque, portrait et identité du titulaire. */}
        <div
          className="absolute inset-0 overflow-hidden rounded-[22px] border border-white/15 text-white shadow-[0_22px_55px_-24px_rgba(6,24,29,.8)]"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', background }}
        >
          <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full opacity-[.13] blur-3xl" style={{ background: accent }} />
          <div className="pointer-events-none absolute inset-0 opacity-[.08]" style={{ backgroundImage: 'linear-gradient(135deg,transparent 35%,rgba(255,255,255,.35) 36%,transparent 37%),radial-gradient(circle at 25% 80%,white 1px,transparent 1px)', backgroundSize: '100% 100%,16px 16px' }} />

          <div className="relative flex h-full flex-col p-[4.7%]">
            <div className="flex shrink-0 items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm sm:h-9 sm:w-12">
                  <Image src="/trait-mark.png" alt="" width={48} height={34} className="h-full w-full object-contain" priority />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[clamp(12px,2.5vw,18px)] font-black leading-none tracking-[.2em]">TRAIT</p>
                  <p className="mt-1 truncate text-[8px] font-semibold tracking-[.12em] text-white/80 sm:text-[9px]">CARTE PERSONNELLE</p>
                </div>
              </div>

              <div id={cardId ? `trait-card-qr-${cardId}` : undefined} className="flex shrink-0 flex-col items-center gap-0.5 rounded-xl bg-white p-1 shadow-lg sm:gap-1 sm:p-2">
                {safeQr
                  ? <QRCodeSVG value={safeQr} size={88} level="Q" includeMargin className="h-[clamp(48px,16cqw,88px)] w-[clamp(48px,16cqw,88px)]" />
                  : <div className="grid h-[clamp(48px,16cqw,88px)] w-[clamp(48px,16cqw,88px)] place-items-center rounded-md bg-slate-50 px-1 text-center text-[8px] font-bold leading-tight text-slate-600">QR DISPONIBLE<br />APRÈS ACTIVATION</div>}
                <span className="text-[8px] font-extrabold tracking-[.13em] text-slate-700">{safeQr ? 'SCAN · CONFIRMER' : 'QR TRAIT'}</span>
              </div>
            </div>

            <div className="mt-[1.8cqw] flex min-h-0 flex-1 items-center gap-[3.5%]">
              <div className="relative h-full max-h-[108px] w-[25%] min-w-[62px] shrink-0 overflow-hidden rounded-xl border border-white/25 bg-white/10 shadow-md">
                {holderPhoto
                  ? <img src={holderPhoto} alt={`Portrait de ${holder}`} className="h-full w-full object-cover" />
                  : <div className="grid h-full place-items-center text-white/60"><UserRound className="h-8 w-8 sm:h-10 sm:w-10" /></div>}
                <span className="absolute inset-x-0 bottom-0 bg-[#071318]/75 px-1 py-1 text-center text-[8px] font-bold tracking-[.15em] text-white">PORTRAIT</span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center pr-1">
                <p className="text-[8px] font-bold tracking-[.16em] text-white/70 sm:text-[9px]">NOM DU TITULAIRE</p>
                <p className="mt-0.5 truncate text-[clamp(14px,3.2vw,23px)] font-bold uppercase leading-tight tracking-wide text-white">{holder}</p>
                <div className="mt-[1cqw] grid grid-cols-2 gap-x-2.5 gap-y-[1cqw] sm:mt-[1.4cqw] sm:gap-y-[1.3cqw]">
                  <div className="min-w-0">
                    <p className="text-[8px] font-semibold tracking-[.08em] text-white/80 sm:text-[9px]">POSTE / RÔLE</p>
                    <p className="truncate text-[clamp(10px,1.9vw,13px)] font-semibold text-white">{jobTitle || 'Membre TRAIT'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-semibold tracking-[.08em] text-white/80 sm:text-[9px]">NAISSANCE</p>
                    <p className="text-[clamp(10px,1.9vw,13px)] font-semibold tabular-nums text-white">{maskedBirthDate}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-[1.2cqw] flex shrink-0 items-center justify-between gap-2 border-t border-white/15 pt-[1cqw] sm:mt-[1.6cqw] sm:pt-[1.2cqw]">
              <span className="flex min-w-0 items-center gap-1.5 text-[8px] font-semibold tracking-[.07em] text-white/85 sm:text-[9px]">
                <LockKeyhole className="h-3 w-3 shrink-0" />
                <span className="truncate">QR SÉCURISÉ · AUCUN CVV NI NUMÉRO BANCAIRE</span>
              </span>
              <span className="shrink-0 rounded-full px-2 py-1 text-[8px] font-extrabold tracking-[.08em]" style={{ color: state.color, backgroundColor: `${state.color}18` }}>{state.label}</span>
            </div>
          </div>

          {isBlocked && <div className="absolute inset-0 z-20 grid place-items-center bg-black/65 text-sm font-black tracking-[.25em]">{state.label}</div>}
        </div>

        {/* Verso — mentions de propriété et indications pratiques, sans données bancaires. */}
        <div
          className="absolute inset-0 overflow-hidden rounded-[22px] border border-white/15 text-white shadow-[0_22px_55px_-24px_rgba(6,24,29,.8)]"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'linear-gradient(145deg,#101c25 0%,#172a35 58%,#0c151c 100%)' }}
        >
          <div className="absolute inset-x-0 top-[18%] h-[17%] bg-[#071014] shadow-inner" />
          <div className="relative flex h-full flex-col justify-between p-[5%]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-10 items-center justify-center overflow-hidden rounded-md bg-white p-1">
                  <Image src="/trait-mark.png" alt="" width={42} height={30} className="h-full w-full object-contain" />
                </span>
                <div>
                  <p className="text-[clamp(14px,2.8vw,20px)] font-black tracking-[.2em]">TRAIT</p>
                  <p className="text-[8px] font-semibold tracking-[.13em] text-white/65 sm:text-[9px]">CARTE D’IDENTITÉ & PORTEFEUILLE</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-white/20 px-2.5 py-1 text-[8px] font-bold tracking-[.1em] text-white/75">{cardType}</span>
            </div>

            <div className="mb-[1%] max-w-[88%]">
              <p className="text-[8px] font-semibold tracking-[.16em] text-white/80 sm:text-[9px]">CARTE NOMINATIVE · PORTEUR AUTORISÉ</p>
              <p className="mt-1 truncate text-[clamp(12px,2.5vw,18px)] font-bold uppercase tracking-wide text-white">{holder}</p>
              <p className="mt-1.5 text-[8px] leading-relaxed text-white/75 sm:text-[9px]">
                Cette carte demeure la propriété de TRAIT et est attribuée à son titulaire. En cas de perte, bloquez-la dans l’application. Un scan prépare le paiement; le titulaire vérifie le montant et confirme avec son PIN.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-white/15 pt-1.5 text-[8px] font-semibold tracking-[.1em] text-white/80 sm:text-[9px]">
              <span>RÉF. •••• {cardRef}</span>
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5" /> CARTE NOMINATIVE</span>
            </div>
          </div>
          {isBlocked && <div className="absolute inset-0 z-20 grid place-items-center bg-black/65 text-sm font-black tracking-[.25em]">{state.label}</div>}
        </div>
      </button>

      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-muted-foreground">
        Appuyez pour retourner la carte. Le QR ne contient aucune donnée bancaire; chaque paiement doit être confirmé par le titulaire.
      </p>
    </div>
  );
}
