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

const API_VERSION = '/api/app/version';

export function UpdateNotice() {
  const { user, lastSeenVersion, setLastSeenVersion } = useAppStore();
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [changelog, setChangelog] = useState<string[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);
  const [installing, setInstalling] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(API_VERSION, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setAppVersion(data.version);
        setChangelog(data.changelog || []);
        setDownloadUrl(data.downloadUrl || null);
        if (lastSeenVersion !== data.version) {
          setShowUpdate(true);
        }
      }
    } catch {
      // Silently fail
    }
  }, [lastSeenVersion]);

  useEffect(() => {
    if (user) {
      checkVersion();
    }
  }, [user, checkVersion]);

  const handleDismiss = () => {
    if (appVersion) {
      setLastSeenVersion(appVersion);
    }
    setShowUpdate(false);
  };

  const handleInstall = async () => {
    setInstalling(true);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            Mise à jour disponible
            <Badge variant="default" className="text-xs">{appVersion}</Badge>
          </DialogTitle>
          <DialogDescription>
            Une nouvelle version est disponible. Mettez à jour pour bénéficier des dernières améliorations.
          </DialogDescription>
        </DialogHeader>

        {changelog.length > 0 && (
          <div className="space-y-2 my-2 max-h-48 overflow-y-auto">
            {changelog.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-[#0D5C63]">•</span>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <Button onClick={handleDismiss} variant="outline" className="flex-1">
            Plus tard
          </Button>
          <Button onClick={handleInstall} className="flex-1 bg-[#0D5C63] hover:bg-[#0A4A50] text-white" disabled={installing}>
            {installing ? 'Téléchargement...' : 'Mettre à jour'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
