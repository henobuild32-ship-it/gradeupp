'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function getIsIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  return isIOSDevice || (isSafari && !window.matchMedia('(display-mode: standalone)').matches);
}

function getIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

interface PWAInstallState {
  canInstall: boolean;
  isIOS: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  installApp: () => Promise<boolean>;
  dismiss: () => void;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // These are computed once on mount and don't change
  const isIOS = getIsIOS();
  const isStandalone = getIsStandalone();
  const isInstalled = isStandalone;

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Register service worker
    if ('serviceWorker' in navigator && !isStandalone) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
        // Service worker registration failed - non-critical
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  const installApp = useCallback(async (): Promise<boolean> => {
    if (isIOS) {
      return false;
    }

    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setCanInstall(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [deferredPrompt, isIOS]);

  const dismiss = useCallback(() => {
    setCanInstall(false);
  }, []);

  return {
    canInstall,
    isIOS,
    isInstalled,
    isStandalone,
    isOnline,
    installApp,
    dismiss,
  };
}
