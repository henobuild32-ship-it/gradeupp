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
      className="w-full cursor-pointer select-none group"
      style={{ perspective: '1500px' }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className="relative w-full"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ════════════ FRONT ════════════ */}
        <div
          className="w-full rounded-[20px] overflow-hidden relative"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            aspectRatio: '1.586/1',
            border: `1px solid ${accentBorder}`,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          {/* Background Image */}
          <Image
            src="/trait-visa-bg.png"
            alt="Carte Visa Trait"
            fill
            className="object-cover"
            priority
          />

          {/* Subtly darkened gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 z-0" />

          {/* Glare effect */}
          <div className="absolute inset-0 z-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          {isSuspended && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-20">
              <div className="text-center bg-black/40 px-6 py-4 rounded-2xl border border-red-500/30">
                <Shield className="w-10 h-10 text-red-500 mx-auto mb-2" />
                <p className="text-white text-sm font-bold uppercase tracking-widest">
                  {status === 'suspended' ? 'Suspendue' : 'Bloquée'}
                </p>
              </div>
            </div>
          )}

          {/* Foreground details overlaid on the image */}
          <div className="absolute inset-0 z-10 p-5 md:p-6 flex flex-col justify-between">
            {/* Top row: Logo */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Image
                  src="/trait-logo.png"
                  alt="TRAIT Logo"
                  width={32}
                  height={32}
                  className="object-contain drop-shadow-md"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
                <span className="text-white font-bold tracking-[3px] text-sm md:text-base drop-shadow-md">
                  TRAIT
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-white/80 text-[8px] md:text-[9px] font-bold tracking-[2px] border border-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                  {cardType}
                </span>
              </div>
            </div>

            {/* Bottom details: Number, Name, Expiry */}
            <div className="mt-auto">
              <div className="mb-4 md:mb-5">
                <p className="text-white/70 text-[8px] md:text-[9px] font-semibold tracking-[3px] mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  NUMÉRO DE CARTE
                </p>
                <p className="text-white text-[20px] md:text-[24px] font-mono font-bold tracking-[3px] md:tracking-[4px] leading-none" 
                   style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8), -1px -1px 1px rgba(255,255,255,0.1)' }}>
                  {formattedNumber}
                </p>
              </div>

              <div className="flex items-end justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-white/70 text-[8px] md:text-[9px] font-semibold tracking-[2px] mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                    TITULAIRE
                  </p>
                  <p className="text-white text-[13px] md:text-[15px] font-bold tracking-[2.5px] truncate uppercase"
                     style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    {cardHolder}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-[8px] md:text-[9px] font-semibold tracking-[2px] mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                    EXPIRE
                  </p>
                  <p className="text-white text-[13px] md:text-[15px] font-mono font-bold tracking-[2px]"
                     style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    {expiryDate}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════ BACK ════════════ */}
        <div
          className="absolute top-0 left-0 w-full rounded-[20px] overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            aspectRatio: '1.586/1',
            border: `1px solid ${accentBorder}`,
            background: '#1A1A1A',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <Image
            src="/trait-visa-bg.png"
            alt="Carte Visa Trait Dos"
            fill
            className="object-cover opacity-15 grayscale"
          />

          <div className="relative z-10 h-full flex flex-col">
            {/* Magnetic stripe (realistic sizing & shadow) */}
            <div className="w-full h-10 md:h-12 mt-6 md:mt-8 bg-[#0a0a0a] shadow-inner border-y border-white/5" />

            <div className="px-5 md:px-6 pt-4 flex-1 flex flex-col justify-center">
              
              <div className="flex items-center gap-2">
                {/* Authorized Signature field */}
                <div className="flex-1 bg-white/10 h-8 md:h-10 rounded flex items-center px-3 border border-white/5">
                  <p className="text-white/30 text-[10px] italic font-serif">Signature autorisée</p>
                </div>
                
                {/* CVV Box */}
                <div className="bg-white px-4 h-8 md:h-10 rounded flex items-center justify-center min-w-[70px] shadow-sm">
                  <p className="text-black text-lg font-mono font-black tracking-widest leading-none">
                    {cvv || '•••'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="px-5 md:px-6 pb-4 md:pb-5">
              <div className="flex items-center justify-between text-white/40 text-[7px] md:text-[8px] tracking-wider border-t border-white/10 pt-3">
                <p className="uppercase">Contact: support@trait.com</p>
                <p className="font-mono">EXP {expiryDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-4 select-none uppercase tracking-widest opacity-60">
        Appuyez pour retourner
      </p>
    </div>
  );
}
