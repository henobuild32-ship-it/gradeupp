'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, ScanFace, Lock, ShieldAlert, LogOut, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { authenticateBiometric, checkBiometricSupport, describeBiometricError, isNativePlatform, storedCredentialId } from '@/lib/biometric';

/**
 * Écran de verrouillage TRAIT — s'affiche à la réouverture de l'app
 * (rechargement, cold start APK, retour au premier plan après inactivité)
 * pour tout utilisateur connecté. Déverrouillage par biométrie (empreinte,
 * visage, Windows Hello) ou code de l'appareil, avec repli sur le code PIN
 * TRAIT quand la biométrie n'est pas activée / indisponible.
 */

const BIOMETRIC_COOLDOWN_MS = 1500;

export default function AppLock({ onUnlock }: { onUnlock: () => void }) {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setToken = useAppStore((s) => s.setToken);
  const logout = useAppStore((s) => s.logout);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biométrie');
  const [prompting, setPrompting] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [sessionAlive, setSessionAlive] = useState<boolean | null>(null);
  const [showPinPad, setShowPinPad] = useState(false);
  const pinRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triedAutoBiometric = useRef(false);

  const isBiometricEnrolled = !!user?.biometricEnabled;

  // Session encore valide ? (le cookie peut avoir expiré depuis la fermeture)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/profile', { credentials: 'include' });
        if (!cancelled) setSessionAlive(res.ok);
      } catch {
        if (!cancelled) setSessionAlive(true); // hors ligne : garder le PIN local
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Détection biométrie + prompt automatique à l'ouverture
  useEffect(() => {
    if (triedAutoBiometric.current) return;
    triedAutoBiometric.current = true;
    (async () => {
      try {
        const support = await checkBiometricSupport();
        if (!support.supported || !isBiometricEnrolled) {
          setShowPinPad(true);
          return;
        }
        setBiometricAvailable(true);
        setBiometricLabel(support.label);
        // Prompt automatique (comportement bancaire standard)
        setTimeout(() => {
          runBiometric();
        }, 400);
      } catch {
        setShowPinPad(true);
      }
    })();
     
  }, []);

  const runBiometric = useCallback(async () => {
    if (prompting || cooldown) return;
    setPrompting(true);
    try {
      const unlockedUser = await authenticateBiometric();
      if (unlockedUser) {
        setUser({ ...useAppStore.getState().user, ...unlockedUser } as any);
        if (unlockedUser.pinSet === false) {
          // Procédure normale : PIN obligatoire avant d'accéder au compte
          toast.info('Configurez votre code PIN pour continuer');
          navigateTo('pin-setup');
        }
        onUnlock();
      }
    } catch (err: any) {
      const msg = describeBiometricError(err);
      const cancelled = /cancel|annul|dismiss|fall back|fallback|not allowed/i.test(msg);
      if (!cancelled) {
        toast.error(msg);
      }
      setShowPinPad(true);
      setCooldown(true);
      setTimeout(() => setCooldown(false), BIOMETRIC_COOLDOWN_MS);
    } finally {
      setPrompting(false);
    }
  }, [prompting, cooldown, onUnlock, setUser, navigateTo]);

  const submitPin = useCallback(async (value: string) => {
    if (verifyingPin || value.length < 4) return;
    setVerifyingPin(true);
    setPinError('');
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, pin: value }),
      });
      const data = await res.json();
      if (data.success) {
        setPin('');
        pinRef.current = '';
        onUnlock();
      } else {
        throw new Error(data.message || 'Code PIN incorrect');
      }
    } catch (err: any) {
      const msg = err?.message || 'Code PIN incorrect';
      if (msg.includes('Session expirée') || msg === 'Session invalide' || msg === 'Non authentifié') {
        setSessionAlive(false);
        setPinError('Session expirée — reconnectez-vous');
      } else {
        setPinError(msg);
      }
      setTimeout(() => {
        setPin('');
        pinRef.current = '';
        setPinError('');
      }, 1000);
    } finally {
      setVerifyingPin(false);
    }
  }, [user?.id, verifyingPin, onUnlock]);

  const handleDigit = useCallback((digit: string) => {
    if (verifyingPin) return;
    if (pinRef.current.length >= 8) return;
    const next = pinRef.current + digit;
    pinRef.current = next;
    setPin(next);
    setPinError('');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (next.length >= 4) {
      timerRef.current = setTimeout(() => submitPin(pinRef.current), 400);
    }
  }, [verifyingPin, submitPin]);

  const handleDelete = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const next = pinRef.current.slice(0, -1);
    pinRef.current = next;
    setPin(next);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleLogout = () => {
    logout();
    navigateTo('welcome');
  };

  const BiometricIcon = /fac|iris/i.test(biometricLabel) ? ScanFace : Fingerprint;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col"
    >
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0D5C63] to-[#083A3E] flex items-center justify-center mb-8 shadow-xl shadow-[#0D5C63]/20"
        >
          <Lock className="w-9 h-9 text-white" />
        </motion.div>

        <h1 className="text-xl font-bold text-foreground mb-1">TRAIT est verrouillé</h1>
        <p className="text-sm text-muted-foreground text-center mb-10">
          {user?.name || user?.pseudo || user?.phone ? (
            <>Bonjour <span className="font-medium text-foreground">{user?.name || user?.pseudo || user?.phone}</span>, déverrouillez pour continuer</>
          ) : (
            'Déverrouillez pour continuer'
          )}
        </p>

        {/* Biométrie */}
        {biometricAvailable && isBiometricEnrolled && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            disabled={prompting || cooldown}
            onClick={() => runBiometric()}
            className="flex flex-col items-center gap-3 mb-10 cursor-pointer disabled:opacity-60"
          >
            <div className="w-24 h-24 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center">
              {prompting ? (
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
              ) : (
                <BiometricIcon className="w-11 h-11 text-emerald-600" />
              )}
            </div>
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {prompting ? 'Authentification…' : cooldown ? 'Réessayez dans un instant' : `Utiliser ${biometricLabel.toLowerCase()}`}
            </span>
          </motion.button>
        )}

        {/* Repli : code PIN TRAIT (ou configuration si jamais créé) */}
        {showPinPad && user?.pinSet === false && (
          <div className="w-full max-w-[300px] flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun code PIN configuré. Créez-le pour déverrouiller l&apos;app et effectuer des
              transactions.
            </p>
            <button
              onClick={() => {
                onUnlock();
                navigateTo('pin-setup');
              }}
              className="h-12 w-full rounded-xl bg-[#0D5C63] hover:bg-[#083A3E] text-white font-semibold transition-colors active:scale-[0.98] cursor-pointer"
            >
              Configurer mon code PIN
            </button>
          </div>
        )}
        {showPinPad && user?.pinSet !== false && (
          <div className="w-full max-w-[280px] flex flex-col items-center">
            {!biometricAvailable && (
              <p className="text-sm text-muted-foreground mb-6">Entrez votre code PIN</p>
            )}
            <motion.div
              animate={pinError ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex gap-4 mb-6"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: i < pin.length ? 1.2 : 1,
                    backgroundColor: i < pin.length ? (pinError ? '#ef4444' : '#0D5C63') : '#e5e7eb',
                  }}
                  transition={{ duration: 0.15 }}
                  className="w-4 h-4 rounded-full"
                />
              ))}
            </motion.div>

            {pinError && (
              <div className="flex items-center gap-1.5 text-red-500 text-sm mb-4 bg-red-50 dark:bg-red-950/20 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
                if (key === '') return <div key="empty" />;
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
          </div>
        )}

        {/* Lien vers le clavier PIN si biométrie en cours / disponible */}
        {!showPinPad && biometricAvailable && (
          <button
            onClick={() => setShowPinPad(true)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
          >
            Utiliser le code PIN
          </button>
        )}
      </div>

      {/* Session expirée : seule issue = reconnexion */}
      {sessionAlive === false && (
        <div className="px-6 pb-10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-2.5 text-sm">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Votre session a expiré. Déverrouillez par biométrie ou reconnectez-vous.</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Se reconnecter
          </button>
        </div>
      )}

      <p className="pb-6 text-center text-xs text-muted-foreground">
        Sécurisé par {isNativePlatform() ? 'le verrouillage de votre appareil' : 'votre appareil'} — TRAIT
      </p>
    </motion.div>
  );
}
