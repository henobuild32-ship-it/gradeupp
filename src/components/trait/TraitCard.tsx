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
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ════════════ FRONT ════════════ */}
        <div
          className="w-full rounded-2xl overflow-hidden relative shadow-2xl"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            aspectRatio: '1.586/1',
            border: `1px solid ${accentBorder}`,
          }}
        >
          <Image
            src="/trait-visa-bg.png"
            alt="Carte Visa Trait"
            fill
            className="object-cover"
            priority
          />

          {isSuspended && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-center">
                <Shield className="w-10 h-10 text-red-400 mx-auto mb-2" />
                <p className="text-white text-sm font-bold uppercase tracking-wider">
                  {status === 'suspended' ? 'Suspendue' : 'Bloquée'}
                </p>
              </div>
            </div>
          )}

          {/* Foreground details overlaid on the image */}
          <div className="absolute inset-0 z-10 p-5 md:p-6 flex flex-col justify-end pb-8">
            <div className="mb-4">
              <p className="text-white/80 text-[8px] font-semibold tracking-[2px] mb-1 drop-shadow-md">NUMÉRO DE CARTE</p>
              <p className="text-white text-[18px] md:text-[22px] font-mono font-bold tracking-[3px] md:tracking-[4px] drop-shadow-md">
                {formattedNumber}
              </p>
            </div>

            <div className="flex items-end justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-white/80 text-[7px] font-semibold tracking-[1.5px] mb-0.5 drop-shadow-md">TITULAIRE</p>
                <p className="text-white text-[12px] md:text-[14px] font-bold tracking-[2px] truncate uppercase drop-shadow-md">
                  {cardHolder}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/80 text-[7px] font-semibold tracking-[1.5px] mb-0.5 drop-shadow-md">EXPIRE</p>
                <p className="text-white text-[12px] md:text-[14px] font-mono font-bold tracking-[2px] drop-shadow-md">
                  {expiryDate}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════ BACK ════════════ */}
        <div
          className="absolute top-0 left-0 w-full rounded-2xl overflow-hidden shadow-2xl bg-[#1A1A1A]"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            aspectRatio: '1.586/1',
            border: `1px solid ${accentBorder}`,
          }}
        >
          <Image
            src="/trait-visa-bg.png"
            alt="Carte Visa Trait Dos"
            fill
            className="object-cover opacity-20 grayscale"
          />

          <div className="relative z-10 h-full flex flex-col">
            {/* Magnetic stripe */}
            <div className="w-full h-11 mt-6 bg-black opacity-90 shadow-sm" />

            <div className="px-5 pt-5 flex-1 flex flex-col justify-between pb-4">
              <div className="flex items-center justify-end mt-4">
                <div className="text-right flex flex-col items-end">
                  <p className="text-white/50 text-[7px] font-semibold tracking-[1.5px] mb-1.5">CODE CCV</p>
                  <div className="bg-white/90 px-4 py-2 rounded flex items-center justify-center min-w-[60px]">
                    <p className="text-black text-lg md:text-xl font-mono font-black tracking-widest leading-none">
                      {cvv || '•••'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto text-white/40 text-[7px] tracking-wider border-t border-white/10 pt-2">
                <p>SUPPORT@TRAIT.COM</p>
                <p className="font-mono">EXP {expiryDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-3 select-none">
        Appuyez pour retourner la carte
      </p>
    </div>
  );
}
