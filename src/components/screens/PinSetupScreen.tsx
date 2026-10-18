'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Fingerprint, ScanFace } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { enrollBiometric, checkBiometricSupport } from '@/lib/biometric';
import { routeAfterAuth } from '@/lib/route-after-auth';
import { toast } from 'sonner';

export default function PinSetupScreen() {
  const { navigateTo, user, setUser } = useAppStore();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm' | 'saving' | 'success' | 'biometric'>('create');
  const [error, setError] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLabel, setBioLabel] = useState('Biométrie');
  const [bioEnrolling, setBioEnrolling] = useState(false);

  // Propose la biométrie (empreinte / visage / code de l'appareil) après le PIN
  useEffect(() => {
    if (step !== 'success') return;
    (async () => {
      try {
        const support = await checkBiometricSupport();
        if (support.supported) {
          setBioAvailable(true);
          setBioLabel(support.label);
          setTimeout(() => setStep('biometric'), 1200);
        } else {
          setTimeout(() => finishFlow(), 1500);
        }
      } catch {
        setTimeout(() => finishFlow(), 1500);
      }
    })()
     
  }, [step]);

  // Procédure normale terminée : onboarding si jamais vu, sinon écran du rôle
  const finishFlow = () => routeAfterAuth(navigateTo, { ...(user || {}), pinSet: true });

  const handleEnableBiometric = async () => {
    setBioEnrolling(true);
    try {
      await enrollBiometric();
      if (user) setUser({ ...user, biometricEnabled: true });
      toast.success(`Déverrouillage par ${bioLabel.toLowerCase()} activé !`);
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (!/cancel|annul/i.test(msg)) {
        toast.error(msg || 'Activation impossible sur cet appareil');
      }
    } finally {
      setBioEnrolling(false);
      finishFlow();
    }
  };

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
                setUser({ ...user, pinSet: true });
                setStep('success');
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
        ) : step === 'biometric' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 w-full max-w-sm"
          >
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              {/fac|iris/i.test(bioLabel) ? (
                <ScanFace className="w-10 h-10 text-emerald-600" />
              ) : (
                <Fingerprint className="w-10 h-10 text-emerald-600" />
              )}
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Activer la {bioLabel.toLowerCase()} ?
              </h2>
              <p className="text-sm text-muted-foreground">
                Déverrouillez TRAIT avec {bioLabel.toLowerCase()} ou le code de votre appareil à
                chaque réouverture. Vos données biométriques restent sur votre téléphone.
              </p>
            </div>
            <div className="w-full flex flex-col gap-3 mt-2">
              <button
                onClick={handleEnableBiometric}
                disabled={bioEnrolling}
                className="h-12 rounded-xl bg-[#0D5C63] hover:bg-[#083A3E] text-white font-semibold flex items-center justify-center transition-colors active:scale-[0.98] cursor-pointer disabled:opacity-60"
              >
                {bioEnrolling ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Activer le déverrouillage rapide'
                )}
              </button>
              <button
                onClick={finishFlow}
                disabled={bioEnrolling}
                className="h-12 rounded-xl text-muted-foreground font-medium hover:text-foreground transition-colors cursor-pointer"
              >
                Plus tard
              </button>
            </div>
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
