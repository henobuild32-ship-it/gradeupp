'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Apple, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useState } from 'react';

export function PWAInstallBanner({ visible = true }: { visible?: boolean }) {
  const { canInstall, isIOS, isInstalled, isStandalone, isOnline, installApp, dismiss } = usePWAInstall();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Don't show if already installed or in standalone mode
  if (!visible || isStandalone || isInstalled || !canInstall) return null;

  const handleInstall = async () => {
    setInstalling(true);
    const success = await installApp();
    setInstalling(false);
    if (!success && isIOS) {
      setShowIOSInstructions(true);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!showIOSInstructions && !isIOS && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-md"
          >
            <div className="bg-card rounded-2xl shadow-xl border border-border p-4 flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#0D5C63] to-[#14888F] flex items-center justify-center p-0.5 shadow-lg shadow-blue-500/20">
                <div className="w-full h-full rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden p-1">
                  <img src="/trait-logo.png" alt="TRAIT" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Installer TRAIT</p>
                <p className="text-xs text-muted-foreground mt-0.5">Accès rapide depuis votre écran d&apos;accueil</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={handleInstall}
                    disabled={installing}
                    size="sm"
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg px-4 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Installer
                  </Button>
                  <Button
                    onClick={dismiss}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-lg px-3 cursor-pointer"
                  >
                    Plus tard
                  </Button>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {!showIOSInstructions && isIOS && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-md"
          >
            <div className="bg-card rounded-2xl shadow-xl border border-border p-4 flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#0D5C63] to-[#14888F] flex items-center justify-center p-0.5 shadow-lg shadow-blue-500/20">
                <div className="w-full h-full rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden p-1">
                  <img src="/trait-logo.png" alt="TRAIT" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Installer sur iPhone</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ajoutez Trait à votre écran d&apos;accueil</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => setShowIOSInstructions(true)}
                    size="sm"
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg px-4 cursor-pointer"
                  >
                    Comment faire
                  </Button>
                  <Button
                    onClick={dismiss}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-lg px-3 cursor-pointer"
                  >
                    Plus tard
                  </Button>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50"
            onClick={() => setShowIOSInstructions(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-card rounded-t-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Installer sur iPhone</h3>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Ouvrir dans Safari</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Utilisez le navigateur Safari pour ouvrir cette page</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-blue-600">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Appuyez sur l&apos;icône Partager</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Touchez le bouton <Apple className="inline w-3.5 h-3.5 mx-0.5" /> en bas de l&apos;écran
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-blue-600">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Sur l&apos;écran d&apos;accueil</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sélectionnez &quot;Sur l&apos;écran d&apos;accueil&quot; dans le menu</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-emerald-600">4</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Appuyez sur Ajouter</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Confirmez en tapant &quot;Ajouter&quot; en haut à droite</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full h-11 mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl cursor-pointer"
              >
                Compris !
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline indicator */}
      <AnimatePresence>
        {!isOnline && !isStandalone && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2"
          >
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Mode hors-ligne - Certaines fonctionnalités limitées</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
