'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Wifi, Lock, Globe } from 'lucide-react';

interface TraitCardProps {
  cardType: 'USD' | 'FC';
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
  qrCode: string;
  balance?: number;
  status?: string;
}

export default function TraitCard({
  cardType,
  cardNumber,
  cardHolder,
  expiryDate,
  cvv,
  qrCode,
  status = 'active',
}: TraitCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const isUSD = cardType === 'USD';
  const isSuspended = status === 'suspended' || status === 'blocked';

  const formattedNumber = cardNumber.replace(/(.{4})/g, '$1 ').trim();

  const accentColor = isUSD ? '#00C9A7' : '#FF6B6B';
  const accentColorLight = isUSD ? '#00C9A730' : '#FF6B6B30';
  const accentColorBorder = isUSD ? '#00C9A740' : '#FF6B6B40';
  const currencyLabel = isUSD ? 'USD' : 'FC';
  const gradientBg = isUSD
    ? 'linear-gradient(135deg, #0B0E1A 0%, #121A3A 30%, #0D1528 60%, #081020 100%)'
    : 'linear-gradient(135deg, #1A0A10 0%, #2D1020 30%, #200810 60%, #180510 100%)';
  const gradientBgBack = isUSD
    ? 'linear-gradient(135deg, #081020 0%, #0D1528 30%, #121A3A 60%, #0B0E1A 100%)'
    : 'linear-gradient(135deg, #180510 0%, #200810 30%, #2D1020 60%, #1A0A10 100%)';

  const qrValue = JSON.stringify({
    card: cardNumber,
    type: currencyLabel,
    holder: cardHolder,
    id: qrCode,
  });

  const displayCvv = cvv || '***';

  return (
    <div
      className="w-full cursor-pointer select-none"
      style={{ perspective: '1200px' }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className="relative w-full"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.7s cubic-bezier(0.23, 1, 0.32, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ═══════ FRONT ═══════ */}
        <div
          className="w-full rounded-2xl overflow-hidden shadow-2xl"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: gradientBg,
            minHeight: '240px',
            border: `1px solid ${accentColorBorder}`,
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(${accentColor} 1px, transparent 1px),
                linear-gradient(90deg, ${accentColor} 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />
          <div
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-[0.15]"
            style={{ background: `radial-gradient(circle, ${accentColor}, transparent 70%)` }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-[0.08]"
            style={{ background: `radial-gradient(circle, ${accentColor}, transparent 70%)` }}
          />
          <div
            className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-32 opacity-[0.04]"
            style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
          />

          {isSuspended && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
              <div className="text-center">
                <Shield className="w-10 h-10 text-red-400 mx-auto mb-2" />
                <p className="text-white text-sm font-bold uppercase tracking-wider">
                  {status === 'suspended' ? 'Suspendue' : 'Bloquee'}
                </p>
              </div>
            </div>
          )}

          <div className="relative z-10 p-5 pt-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden"
                  style={{
                    backgroundColor: `${accentColor}15`,
                    border: `1px solid ${accentColorBorder}`,
                  }}
                >
                  <Image
                    src="/trait-logo.png"
                    alt="TRAIT"
                    width={28}
                    height={28}
                    className="object-contain"
                    style={{ filter: 'brightness(0) invert(1)' }}
                  />
                </div>
                <div>
                  <p className="text-white text-[15px] font-black tracking-[3px] leading-none">
                    TRAIT
                  </p>
                  <p className="text-white/30 text-[7px] font-medium tracking-[2px] mt-0.5">
                    CARTE NUMERIQUE
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <div
                  className="px-3 py-1 rounded-full text-[10px] font-bold tracking-[1.5px] uppercase"
                  style={{
                    backgroundColor: accentColorLight,
                    color: accentColor,
                    border: `1px solid ${accentColorBorder}`,
                  }}
                >
                  {currencyLabel}
                </div>
                <Wifi className="w-4 h-4 rotate-90" style={{ color: accentColor, opacity: 0.5 }} />
              </div>
            </div>

            <div className="mb-5">
              <p className="text-white/30 text-[9px] font-semibold tracking-[2px] mb-1.5">
                NUMERO DE CARTE
              </p>
              <p className="text-white text-[22px] font-mono font-bold tracking-[4px] leading-none">
                {formattedNumber}
              </p>
            </div>

            <div className="flex items-end justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-white/30 text-[8px] font-semibold tracking-[1.5px] mb-1">
                  TITULAIRE
                </p>
                <p className="text-white text-[13px] font-bold tracking-[2px] truncate uppercase leading-none">
                  {cardHolder}
                </p>
              </div>

              <div
                className="w-[72px] h-[72px] rounded-xl flex items-center justify-center ml-3 shrink-0 p-1"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <QRCodeSVG
                  value={qrValue}
                  size={56}
                  level="M"
                  fgColor={isUSD ? '#0B0E1A' : '#1A0A10'}
                  bgColor="#FFFFFF"
                  imageSettings={{
                    src: '/trait-logo.png',
                    height: 14,
                    width: 14,
                    excavate: true,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
              <div>
                <p className="text-white/30 text-[8px] font-semibold tracking-[1.5px]">
                  EXPIRE
                </p>
                <p className="text-white text-[14px] font-mono font-bold tracking-[2px]">
                  {expiryDate}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3" style={{ color: accentColor, opacity: 0.6 }} />
                <p
                  className="text-[8px] font-bold tracking-[1.5px]"
                  style={{ color: accentColor, opacity: 0.6 }}
                >
                  SECURISEE PAR TRAIT
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ BACK ═══════ */}
        <div
          className="absolute top-0 left-0 w-full rounded-2xl overflow-hidden shadow-2xl"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: gradientBgBack,
            minHeight: '240px',
            border: `1px solid ${accentColorBorder}`,
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(${accentColor} 1px, transparent 1px),
                linear-gradient(90deg, ${accentColor} 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />
          <div
            className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-[0.1]"
            style={{ background: `radial-gradient(circle, ${accentColor}, transparent 70%)` }}
          />

          <div className="relative z-10 p-5 pt-4">
            <div className="flex items-center gap-2.5 mb-5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden"
                style={{
                  backgroundColor: `${accentColor}15`,
                  border: `1px solid ${accentColorBorder}`,
                }}
              >
                <Image
                  src="/trait-logo.png"
                  alt="TRAIT"
                  width={32}
                  height={32}
                  className="w-7 h-7 object-contain"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
              <p className="text-white text-[15px] font-black tracking-[3px]">TRAIT</p>
            </div>

            <p className="text-white/40 text-[8px] leading-relaxed italic mb-4 px-1">
              Cette carte est la propriete de{' '}
              <span className="text-white/70 font-semibold not-italic">
                {cardHolder}
              </span>
              . Si vous la trouvez, veuillez la retourner.
            </p>

            <div className="mb-4">
              <p className="text-white/30 text-[8px] font-semibold tracking-[1.5px] mb-1.5">
                SIGNATURE AUTORISEE
              </p>
              <div
                className="h-8 rounded-md flex items-center px-3"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.1), rgba(255,255,255,0.06))',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p className="text-white/30 text-[10px] font-mono italic tracking-wider">
                  TRAIT CARD
                </p>
              </div>
            </div>

            {/* CCV */}
            <div className="mb-5">
              <p className="text-white/30 text-[8px] font-semibold tracking-[1.5px] mb-1.5">
                CODE DE SECURITE (CCV)
              </p>
              <div
                className="inline-flex items-center rounded-lg px-4 py-2"
                style={{ backgroundColor: accentColorLight }}
              >
                <p className="text-white text-xl font-mono font-bold tracking-[5px]">
                  {displayCvv}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                { icon: Lock, label: 'Securite', desc: 'Protection avancee' },
                { icon: Shield, label: 'Confidentiel', desc: 'Ne partagez pas le CCV' },
                { icon: Globe, label: 'Utilisation', desc: 'En ligne et en magasin' },
                { icon: Lock, label: 'Support', desc: 'trait137@gmail.com' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor, opacity: 0.6 }} />
                    <div className="min-w-0">
                      <p className="text-white/60 text-[8px] font-bold leading-none tracking-wider">
                        {item.label}
                      </p>
                      <p className="text-white/30 text-[7px] leading-tight mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.06]">
              <p className="text-white/20 text-[7px] tracking-wider">
                EXPIRE {expiryDate}
              </p>
              <p className="text-white/15 text-[7px] tracking-wider">
                {currencyLabel} &bull; {isUSD ? 'INTERNATIONALE' : 'NATIONALE'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-2.5">
        Appuyez pour retourner la carte
      </p>
    </div>
  );
}
