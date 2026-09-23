'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

export default function PinSetupScreen() {
  const { navigateTo, user, setUser } = useAppStore();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm' | 'saving' | 'success'>('create');
  const [error, setError] = useState('');

  const handleDigit = (digit: string) => {
    if (step === 'create') {
      if (pin.length >= 4) return;
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => {
          setStep('confirm');
          setError('');
        }, 300);
      }
    } else if (step === 'confirm') {
      if (confirmPin.length >= 4) return;
      const newConfirm = confirmPin + digit;
      setConfirmPin(newConfirm);
      if (newConfirm.length === 4) {
        setTimeout(async () => {
          if (newConfirm === pin) {
            if (!user) {
              setError('Utilisateur non trouvé');
              navigateTo('auth-login');
              return;
            }
            setStep('saving');
            // Save PIN to database
            try {
              const res = await fetch('/api/auth/set-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id, pin: newConfirm }),
              });
              const data = await res.json();

              if (data.success && user) {
                setStep('success');
                setTimeout(() => {
                  navigateTo('onboarding');
                }, 1500);
              } else {
                const msg = data.message || 'Erreur lors de la sauvegarde';
                if (msg.includes('Session expirée') || msg === 'Session invalide' || msg === 'Non authentifié') {
                  toast.error('Session expirée. Veuillez vous reconnecter.');
                  navigateTo('welcome');
                  return;
                }
                setError(msg);
                setStep('confirm');
                setConfirmPin('');
              }
            } catch {
              setError('Erreur de connexion');
              setStep('confirm');
              setConfirmPin('');
            }
          } else {
            setError('Les codes PIN ne correspondent pas');
            setConfirmPin('');
            setTimeout(() => {
              setStep('create');
              setPin('');
              setError('');
            }, 1500);
          }
        }, 300);
      }
    }
  };

  const handleDelete = () => {
    if (step === 'create') {
      setPin((prev) => prev.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  const currentPin = step === 'create' ? pin : confirmPin;

  const dotIndices = [0, 1, 2, 3];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col items-center justify-center px-6 py-12"
      >
        {step === 'success' ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Code PIN configuré !</h2>
            <p className="text-sm text-muted-foreground text-center">
              Votre code PIN a été enregistré avec succès
            </p>
          </motion.div>
        ) : step === 'saving' ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <p className="text-sm text-muted-foreground">Sauvegarde en cours...</p>
          </motion.div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 mb-10">
              <h2 className="text-xl font-bold text-foreground">
                {step === 'create' ? 'Créez votre code PIN' : 'Confirmez votre PIN'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {step === 'create'
                  ? 'Choisissez un code PIN à 4 chiffres'
                  : 'Entrez à nouveau votre code PIN'}
              </p>
            </div>

            {/* PIN dots */}
            <div className="flex gap-4 mb-10">
              {dotIndices.map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8 }}
                  animate={{
                    scale: i < currentPin.length ? 1.2 : 1,
                    backgroundColor: i < currentPin.length ? '#059669' : '#e5e7eb',
                  }}
                  transition={{ duration: 0.15 }}
                  className="w-4 h-4 rounded-full"
                />
              ))}
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm mb-4"
              >
                {error}
              </motion.p>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
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
                    className="h-14 rounded-xl bg-background border border-border hover:bg-emerald-50 hover:border-emerald-200 flex items-center justify-center text-xl font-semibold transition-colors active:scale-95 cursor-pointer"
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </motion.main>
    </div>
  );
}
