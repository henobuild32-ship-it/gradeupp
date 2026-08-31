'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Wifi, Lock, Globe, Headphones, CreditCard } from 'lucide-react';

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

  const accentColor = isUSD ? '#00D4AA' : '#FF6B8A';
  const accentGlow = isUSD ? 'rgba(0,212,170,0.3)' : 'rgba(255,107,138,0.3)';
  const gradientBg = isUSD
    ? 'linear-gradient(135deg, #0A0F1E 0%, #0E1A35 40%, #0A1628 100%)'
    : 'linear-gradient(135deg, #1A0A12 0%, #2D1025 40%, #1A0818 100%)';
  const gradientBgBack = isUSD
    ? 'linear-gradient(135deg, #0A1628 0%, #0E1A35 40%, #0A0F1E 100%)'
    : 'linear-gradient(135deg, #1A0818 0%, #2D1025 40%, #1A0A12 100%)';
  const currencyLabel = isUSD ? 'USD' : 'FC';

  const qrValue = JSON.stringify({
    card: cardNumber,
    type: currencyLabel,
    holder: cardHolder,
    id: qrCode,
  });

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
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ═══════════ FRONT ═══════════ */}
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: gradientBg,
            aspectRatio: '1.586',
            border: `1px solid ${accentColor}20`,
            boxShadow: `0 20px 60px -10px rgba(0,0,0,0.5), 0 0 40px ${accentGlow}`,
          }}
        >
          {/* Background grid */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `linear-gradient(${accentColor} 1px, transparent 1px), linear-gradient(90deg, ${accentColor} 1px, transparent 1px)`,
              backgroundSize: '30px 30px',
            }}
          />
          {/* Glow orbs */}
          <div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20"
            style={{ background: `radial-gradient(circle, ${accentColor}, transparent 60%)` }}
          />
          <div
            className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full opacity-10"
            style={{ background: `radial-gradient(circle, ${accentColor}, transparent 60%)` }}
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

          <div className="relative z-10 p-5 pb-4 h-full flex flex-col justify-between">
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
                    border: `1px solid ${accentColor}40`,
                  }}
                >
                  <Image src="/trait-logo.png" alt="TRAIT" width={24} height={24} style={{ filter: 'brightness(0) invert(1)' }} />
                </div>
                <div>
                  <p className="text-white text-[16px] font-black tracking-[4px] leading-none">TRAIT</p>
                  <p className="text-white/30 text-[7px] font-medium tracking-[2px] mt-0.5">CARTE DIGITALE</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div
                  className="px-3 py-1 rounded-full text-[10px] font-bold tracking-[1.5px] uppercase"
                  style={{
                    background: `${accentColor}15`,
                    color: accentColor,
                    border: `1px solid ${accentColor}30`,
                  }}
                >
                  {currencyLabel}
                </div>
                <Wifi className="w-4 h-4 rotate-90 opacity-40" style={{ color: accentColor }} />
              </div>
            </div>

            {/* Chip + Number */}
            <div>
              {/* EMV Chip */}
              <div className="mb-4">
                <div
                  className="w-10 h-7 rounded-md"
                  style={{
                    background: `linear-gradient(135deg, #C9A96E, #E8D5A3, #C9A96E)`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
              </div>
              <p className="text-white/40 text-[8px] font-semibold tracking-[2px] mb-1">NUMÉRO DE CARTE</p>
              <p className="text-white text-[20px] font-mono font-bold tracking-[3px] leading-none">
                {formattedNumber}
              </p>
            </div>

            {/* Bottom row */}
            <div className="flex items-end justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-white/40 text-[7px] font-semibold tracking-[1.5px] mb-0.5">TITULAIRE</p>
                <p className="text-white text-[12px] font-bold tracking-[2px] truncate uppercase">
                  {cardHolder}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-[7px] font-semibold tracking-[1.5px] mb-0.5">EXPIRE</p>
                <p className="text-white text-[13px] font-mono font-bold tracking-[2px]">
                  {expiryDate}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ BACK ═══════════ */}
        <div
          className="absolute top-0 left-0 w-full rounded-2xl overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: gradientBgBack,
            aspectRatio: '1.586',
            border: `1px solid ${accentColor}20`,
            boxShadow: `0 20px 60px -10px rgba(0,0,0,0.5), 0 0 40px ${accentGlow}`,
          }}
        >
          {/* Background */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(${accentColor} 1px, transparent 1px), linear-gradient(90deg, ${accentColor} 1px, transparent 1px)`,
              backgroundSize: '30px 30px',
            }}
          />
          <div
            className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-10"
            style={{ background: `radial-gradient(circle, ${accentColor}, transparent 60%)` }}
          />

          <div className="relative z-10 h-full flex flex-col">
            {/* Magnetic stripe */}
            <div
              className="w-full h-10 mt-5"
              style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.4), rgba(0,0,0,0.6))' }}
            />

            {/* Signature strip + CCV */}
            <div className="px-5 pt-4 flex-1">
              <div className="flex items-center gap-3 mb-4">
                {/* Signature area */}
                <div className="flex-1">
                  <p className="text-white/30 text-[7px] font-semibold tracking-[1.5px] mb-1">SIGNATURE AUTORISÉE</p>
                  <div
                    className="h-8 rounded flex items-center px-3"
                    style={{
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.12), rgba(255,255,255,0.08))',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <p className="text-white/25 text-[10px] font-mono italic tracking-wider">TRAIT CARD</p>
                  </div>
                </div>

                {/* CCV */}
                <div className="text-center">
                  <p className="text-white/30 text-[7px] font-semibold tracking-[1.5px] mb-1">CCV</p>
                  <div
                    className="px-5 py-2 rounded-lg"
                    style={{
                      background: 'rgba(255,255,255,0.95)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                  >
                    <p className="text-gray-900 text-lg font-mono font-black tracking-[4px]">
                      {cvv || '•••'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { icon: Lock, label: 'Sécurité', desc: 'Protégée' },
                  { icon: Shield, label: 'Confidentiel', desc: 'Ne pas partager' },
                  { icon: Globe, label: 'Usage', desc: 'En ligne & magasin' },
                  { icon: Headphones, label: 'Support', desc: 'trait137@gmail.com' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5 py-1">
                    <item.icon className="w-3 h-3 shrink-0" style={{ color: accentColor, opacity: 0.5 }} />
                    <div>
                      <p className="text-white/50 text-[7px] font-bold leading-none tracking-wider">{item.label}</p>
                      <p className="text-white/25 text-[6px] leading-tight mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3 h-3 opacity-30" style={{ color: accentColor }} />
                  <p className="text-white/20 text-[7px] tracking-wider">TRAIT DIGITAL</p>
                </div>
                <p className="text-white/15 text-[7px] tracking-wider">EXPIRE {expiryDate}</p>
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
