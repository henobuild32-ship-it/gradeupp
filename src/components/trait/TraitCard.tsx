'use client';

import { useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Wifi, Lock, Globe, Headphones, CreditCard, Eye, EyeOff } from 'lucide-react';

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

  const accent = isUSD ? '#00D4AA' : '#FF6B8A';
  const accentDim = isUSD ? 'rgba(0,212,170,0.15)' : 'rgba(255,107,138,0.15)';
  const accentBorder = isUSD ? 'rgba(0,212,170,0.25)' : 'rgba(255,107,138,0.25)';
  const bg = isUSD
    ? 'linear-gradient(145deg, #080D1A 0%, #0C1530 50%, #0A1025 100%)'
    : 'linear-gradient(145deg, #180810 0%, #281020 50%, #1A0815 100%)';
  const bgBack = isUSD
    ? 'linear-gradient(145deg, #0A1025 0%, #0C1530 50%, #080D1A 100%)'
    : 'linear-gradient(145deg, #1A0815 0%, #281020 50%, #180810 100%)';

  const qrValue = JSON.stringify({ card: cardNumber, type: cardType, holder: cardHolder, id: qrCode });

  return (
    <div
      className="w-full cursor-pointer select-none"
      style={{ perspective: '1500px' }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className="relative w-full"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ════════════ FRONT ════════════ */}
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: bg,
            aspectRatio: '1.586/1',
            border: `1px solid ${accentBorder}`,
            boxShadow: `0 25px 60px -15px rgba(0,0,0,0.6), inset 0 1px 0 ${accentBorder}`,
          }}
        >
          {/* Subtle glow */}
          <div
            className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-15 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${accent}, transparent 65%)` }}
          />
          <div
            className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full opacity-8 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${accent}, transparent 65%)` }}
          />

          {isSuspended && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
              <div className="text-center">
                <Shield className="w-10 h-10 text-red-400 mx-auto mb-2" />
                <p className="text-white text-sm font-bold uppercase tracking-wider">
                  {status === 'suspended' ? 'Suspendue' : 'Bloquée'}
                </p>
              </div>
            </div>
          )}

          <div className="relative z-10 h-full flex flex-col justify-between p-5">
            {/* Top */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: accentDim, border: `1px solid ${accentBorder}` }}
                >
                  <Image src="/trait-logo.png" alt="TRAIT" width={24} height={24} style={{ filter: 'brightness(0) invert(1)' }} />
                </div>
                <div>
                  <p className="text-white text-[15px] font-black tracking-[4px] leading-none">TRAIT</p>
                  <p className="text-white/25 text-[7px] font-medium tracking-[2px] mt-0.5">CARTE DIGITALE</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="px-3 py-1 rounded-full text-[10px] font-bold tracking-[1.5px]"
                  style={{ background: accentDim, color: accent, border: `1px solid ${accentBorder}` }}
                >
                  {cardType}
                </div>
                <Wifi className="w-4 h-4 rotate-90 opacity-30" style={{ color: accent }} />
              </div>
            </div>

            {/* Middle — chip + number */}
            <div>
              <div
                className="w-10 h-7 rounded-md mb-4"
                style={{ background: 'linear-gradient(135deg, #C9A96E, #E8D5A3, #C9A96E)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
              />
              <p className="text-white/30 text-[8px] font-semibold tracking-[2px] mb-1">NUMÉRO DE CARTE</p>
              <p className="text-white text-[20px] font-mono font-bold tracking-[3px] leading-none">
                {formattedNumber}
              </p>
            </div>

            {/* Bottom */}
            <div className="flex items-end justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-white/30 text-[7px] font-semibold tracking-[1.5px] mb-0.5">TITULAIRE</p>
                <p className="text-white text-[12px] font-bold tracking-[2px] truncate uppercase">{cardHolder}</p>
              </div>
              <div className="text-right">
                <p className="text-white/30 text-[7px] font-semibold tracking-[1.5px] mb-0.5">EXPIRE</p>
                <p className="text-white text-[13px] font-mono font-bold tracking-[2px]">{expiryDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════ BACK ════════════ */}
        <div
          className="absolute top-0 left-0 w-full rounded-2xl overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: bgBack,
            aspectRatio: '1.586/1',
            border: `1px solid ${accentBorder}`,
            boxShadow: `0 25px 60px -15px rgba(0,0,0,0.6), inset 0 1px 0 ${accentBorder}`,
          }}
        >
          {/* Glow */}
          <div
            className="absolute -top-24 -right-24 w-56 h-56 rounded-full opacity-10 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${accent}, transparent 65%)` }}
          />

          <div className="relative z-10 h-full flex flex-col">
            {/* Magnetic stripe */}
            <div
              className="w-full h-11 mt-6"
              style={{ background: 'linear-gradient(180deg, #1a1a1a, #2a2a2a, #1a1a1a)' }}
            />

            {/* Content */}
            <div className="px-5 pt-5 flex-1 flex flex-col justify-between">
              {/* Signature + CCV row */}
              <div className="flex items-center gap-4">
                {/* Signature */}
                <div className="flex-1">
                  <p className="text-white/25 text-[7px] font-semibold tracking-[1.5px] mb-1">SIGNATURE AUTORISÉE</p>
                  <div
                    className="h-9 rounded-md flex items-center px-3"
                    style={{
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.1), rgba(255,255,255,0.06))',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <p className="text-white/20 text-[10px] font-mono italic tracking-wider">TRAIT CARD</p>
                  </div>
                </div>

                {/* CCV — BIG and prominent */}
                <div className="text-center">
                  <p className="text-white/25 text-[7px] font-semibold tracking-[1.5px] mb-1.5">CODE CCV</p>
                  <div
                    className="px-6 py-3 rounded-xl"
                    style={{
                      background: '#FFFFFF',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
                    }}
                  >
                    <p className="text-gray-900 text-2xl font-mono font-black tracking-[6px] leading-none">
                      {cvv || '•••'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info row */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4">
                  {[
                    { icon: Lock, text: 'Sécurisé' },
                    { icon: Shield, text: 'Confidentiel' },
                    { icon: Globe, text: 'International' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-1">
                      <item.icon className="w-3 h-3 opacity-30" style={{ color: accent }} />
                      <p className="text-white/25 text-[7px] font-medium tracking-wider">{item.text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Headphones className="w-3 h-3 opacity-20" style={{ color: accent }} />
                  <p className="text-white/15 text-[7px] tracking-wider">SUPPORT</p>
                </div>
              </div>

              {/* Expiry footer */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] mt-2">
                <p className="text-white/15 text-[7px] tracking-wider font-mono">EXPIRE {expiryDate}</p>
                <p className="text-white/15 text-[7px] tracking-wider">TRAIT DIGITAL</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-2.5 select-none">
        Appuyez pour retourner la carte
      </p>
    </div>
  );
}
