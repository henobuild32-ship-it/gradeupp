'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

export default function PinVerifyScreen() {
  const { goBack, navigateTo, user, clearPendingPinAction, pendingPinAction } = useAppStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinRef = useRef('');

  const submitPin = useCallback(async (value: string) => {
    if (submitting || !value || value.length < 4) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, pin: value }),
      });
      const data = await res.json();
      if (data.success) {
        const action = pendingPinAction;
        clearPendingPinAction?.();
        action?.(value);
        setPin('');
        pinRef.current = '';
      } else {
        throw new Error(data.message || 'Code PIN incorrect');
      }
    } catch (err: any) {
      const msg = err.message || 'Code PIN incorrect';
      if (msg.includes('Session expirée') || msg === 'Session invalide' || msg === 'Non authentifié') {
        useAppStore.getState().logout();
        toast.error('Session expirée. Veuillez vous reconnecter.');
        navigateTo('welcome');
        return;
      }
      setError(msg);
      setShaking(true);
      setTimeout(() => {
        setPin('');
        pinRef.current = '';
        setError('');
        setShaking(false);
      }, 1000);
    } finally {
      setSubmitting(false);
    }
  }, [user, pendingPinAction, clearPendingPinAction, navigateTo, submitting]);

  const handleDigit = useCallback((digit: string) => {
    if (submitting) return;
    if (pinRef.current.length >= 8) return;
    const newPin = pinRef.current + digit;
    pinRef.current = newPin;
    setPin(newPin);

    if (submitTimer.current) clearTimeout(submitTimer.current);
    if (newPin.length >= 4) {
      submitTimer.current = setTimeout(() => {
        submitPin(pinRef.current);
      }, 1000);
    }
  }, [submitPin, submitting]);

  const handleDelete = () => {
    if (submitTimer.current) clearTimeout(submitTimer.current);
    const next = pinRef.current.slice(0, -1);
    pinRef.current = next;
    setPin(next);
  };

  useEffect(() => {
    return () => {
      if (submitTimer.current) clearTimeout(submitTimer.current);
    };
  }, []);

  const dotCount = Math.max(4, Math.min(8, pin.length || 4));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between px-4 py-4"
      >
        <button
          onClick={goBack}
          className="w-10 h-10 rounded-full hover:bg-accent flex items-center justify-center cursor-pointer"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>
        {/* Biometric button removed */}
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 flex flex-col items-center justify-center px-6 py-8"
      >
        <div className="flex flex-col items-center gap-2 mb-8">
          <h2 className="text-xl font-bold text-foreground">Vérification de sécurité</h2>
          <p className="text-sm text-muted-foreground">Entrez votre code PIN pour valider</p>
        </div>

        {/* PIN dots */}
        <motion.div
          animate={shaking ? { x: [-5, 5, -5, 5, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex gap-4 mb-8"
        >
          {Array.from({ length: Math.max(4, pin.length || 4) }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: i < pin.length ? 1.2 : 1,
                backgroundColor: i < pin.length
                  ? (error ? '#ef4444' : '#0D5C63')
                  : '#e5e7eb',
              }}
              transition={{ duration: 0.15 }}
              className="w-4 h-4 rounded-full"
            />
          ))}
        </motion.div>

        {/* Errors */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex items-center gap-1.5 text-red-500 text-sm mb-4 bg-red-50 dark:bg-red-950/20 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 max-w-[280px] text-center"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(key => {
            if (key === '') {
              return <div key="empty" />;
            }
            if (key === 'del') {
              return (
                <button
                  key="del"
                  onClick={handleDelete}
                  className="h-14 rounded-xl bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground text-sm font-medium transition-colors cursor-pointer"
                >
                  ←
                </button>
              );
            }
            return (
              <button
                key={key}
                onClick={() => handleDigit(key)}
                className="h-14 rounded-xl bg-background border border-border hover:bg-[#0D5C63]/5 hover:border-[#0D5C63]/20 flex items-center justify-center text-xl font-semibold transition-colors active:scale-95 cursor-pointer"
              >
                {key}
              </button>
            );
          })}
        </div>
      </motion.main>
    </div>
  );
}
