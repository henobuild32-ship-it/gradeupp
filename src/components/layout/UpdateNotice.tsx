'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Sparkles, ArrowRight, RefreshCw, Download } from 'lucide-react';

const API_VERSION = '/api/app/version';
const DEPLOY_KEY = 'trait_last_deploy_id';

function getStoredDeployId(): string | null {
  try { return localStorage.getItem(DEPLOY_KEY); } catch { return null; }
}

function setStoredDeployId(id: string) {
  try { localStorage.setItem(DEPLOY_KEY, id); } catch {}
}

export function UpdateNotice() {
  const { user, setLastSeenVersion } = useAppStore();
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [deployId, setDeployId] = useState<string | null>(null);
  const [changelog, setChangelog] = useState<string[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = (window.navigator as any).standalone === true;
    setIsPWA(standalone || iosStandalone);
  }, []);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(API_VERSION + '?t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setAppVersion(data.version);
        setDeployId(data.deployId);
        setChangelog(data.changelog || []);
        setDownloadUrl(data.downloadUrl || null);

        const storedId = getStoredDeployId();
        if (data.deployId && data.deployId !== storedId) {
          setShowUpdate(true);
        }
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (user) {
      checkVersion();
      const interval = setInterval(checkVersion, 3 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, checkVersion]);

  useEffect(() => {
    if (!user) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATE_AVAILABLE') {
        checkVersion();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [user, checkVersion]);

  const handleDismiss = () => {
    if (deployId) {
      setStoredDeployId(deployId);
      setLastSeenVersion(appVersion || '');
    }
    setShowUpdate(false);
  };

  const handleReload = async () => {
    setInstalling(true);
    if (deployId) {
      setStoredDeployId(deployId);
    }
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      if (reg?.active) {
        reg.active.postMessage({ type: 'CLEAR_CACHE' });
      }
    } catch {}
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    // Force hard reload
    window.location.href = window.location.href.split('#')[0] + '?t=' + Date.now();
  };

  const handleInstallAPK = async () => {
    setInstalling(true);
    if (deployId) {
      setStoredDeployId(deployId);
    }
    try {
      const { AppUpdate } = await import('@/plugins/app-update');
      const url = downloadUrl?.startsWith('http')
        ? downloadUrl
        : (typeof window !== 'undefined' ? window.location.origin : '') + (downloadUrl || '/downloads/trait.apk');
      await AppUpdate.downloadAndInstall({ url });
    } catch {
      const fullUrl = (downloadUrl || '/downloads/trait.apk');
      const absoluteUrl = fullUrl.startsWith('http') ? fullUrl : window.location.origin + fullUrl;
      window.open(absoluteUrl, '_blank');
    } finally {
      setInstalling(false);
      handleDismiss();
    }
  };

  if (!showUpdate || !appVersion) return null;

  return (
    <Dialog open={showUpdate} onOpenChange={() => handleDismiss()}>
      <DialogContent className="max-w-sm rounded-2xl border-0 p-0 overflow-hidden">
        {/* Header gradient */}
        <div className="relative bg-gradient-to-br from-[#0D5C63] via-[#0A7B82] to-[#0D5C63] px-6 pt-8 pb-10 text-center">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-6 w-16 h-16 rounded-full bg-white/20 blur-xl" />
            <div className="absolute bottom-2 right-8 w-20 h-20 rounded-full bg-white/15 blur-2xl" />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-white text-lg font-bold tracking-wide">Administration TRAIT</h2>
            <p className="text-white/70 text-xs mt-1 tracking-wider uppercase">Nouvelle version disponible</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 -mt-4 relative z-10">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-100 dark:border-zinc-800 p-5">
            {/* Version badge */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge className="bg-[#0D5C63]/10 text-[#0D5C63] dark:bg-[#0D5C63]/20 dark:text-[#00D4AA] font-mono text-sm px-3 py-1">
                v{appVersion}
              </Badge>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>

            <p className="text-center text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
              L&apos;administration TRAIT a déployé une nouvelle version avec des améliorations et corrections importantes.
            </p>

            {changelog.length > 0 && (
              <div className="space-y-2 mb-4 max-h-36 overflow-y-auto">
                {changelog.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <ArrowRight className="w-3 h-3 mt-0.5 text-[#0D5C63] dark:text-[#00D4AA] shrink-0" />
                    <span className="text-zinc-600 dark:text-zinc-400">{item}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2.5">
              {isPWA ? (
                <Button
                  onClick={handleReload}
                  className="w-full bg-[#0D5C63] hover:bg-[#0A4A50] text-white font-semibold h-11 rounded-xl shadow-md shadow-[#0D5C63]/25"
                  disabled={installing}
                >
                  {installing ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Mise à jour en cours...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Recharger et mettre à jour
                    </span>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleInstallAPK}
                  className="w-full bg-[#0D5C63] hover:bg-[#0A4A50] text-white font-semibold h-11 rounded-xl shadow-md shadow-[#0D5C63]/25"
                  disabled={installing}
                >
                  {installing ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Téléchargement...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Télécharger la mise à jour
                    </span>
                  )}
                </Button>
              )}
              <Button
                onClick={handleDismiss}
                variant="ghost"
                className="w-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 h-9 text-xs"
              >
                Appliquer plus tard
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="h-4" />
      </DialogContent>
    </Dialog>
  );
}
