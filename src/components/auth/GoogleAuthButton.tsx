'use client';

import { useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { signInWithGoogle, completeGoogleRedirect } from '@/lib/firebase';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface GoogleAuthButtonProps {
  mode: 'login' | 'register';
  selectedRole?: string;
  onSuccess?: (data: any) => void;
  onNeedsProfile?: (googleData: any, idToken: string) => void;
  extraPayload?: Record<string, any>;
  className?: string;
}

export default function GoogleAuthButton({
  mode,
  selectedRole = 'client',
  onSuccess,
  onNeedsProfile,
  extraPayload = {},
  className = '',
}: GoogleAuthButtonProps) {
  const { setUser, setToken, navigateTo } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleBackendCall = useCallback(
    async (idToken: string) => {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          mode,
          role: selectedRole,
          ...extraPayload,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('invalid-response');
      }

      const data = await res.json();

      if (res.status === 206) {
        // New user — needs profile completion (phone, country, etc.)
        onNeedsProfile?.(data.googleData, idToken);
        return;
      }

      if (!data.success) {
        toast.error(data.message || 'Erreur Google');
        return;
      }

      if (data.token) setToken(data.token);
      if (data.user) setUser(data.user);

      const u = data.user;
      if (u) {
        if (!u.hasCompletedOnboarding && u.role !== 'seller') {
          navigateTo('onboarding');
        } else if (u.role === 'agent') {
          navigateTo('agent-dashboard');
        } else if (u.role === 'seller') {
          if (u.validationStatus !== 'validated' || u.suspended) navigateTo('seller-pending');
          else navigateTo('seller-dashboard');
        } else {
          navigateTo('home');
        }
      }

      toast.success(data.isNewUser ? 'Compte créé avec Google !' : 'Connecté avec Google !');
      onSuccess?.(data);
    },
    [mode, selectedRole, extraPayload, setUser, setToken, navigateTo, onSuccess, onNeedsProfile]
  );

  // Check for redirect result on mount (mobile flow)
  useEffect(() => {
    completeGoogleRedirect().then((result) => {
      if (result) {
        setLoading(true);
        handleBackendCall(result.idToken).finally(() => setLoading(false));
      }
    }).catch(() => {});
  }, [handleBackendCall]);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result) {
        await handleBackendCall(result.idToken);
      }
      // If null, redirect was initiated (mobile) — will be handled on return
    } catch (err: any) {
      handleGoogleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`relative flex items-center justify-center gap-3 w-full h-12 rounded-xl border-2 border-border bg-background hover:bg-muted/50 text-foreground font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none cursor-pointer ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Connexion en cours...</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>{mode === 'login' ? 'Continuer avec Google' : "S'inscrire avec Google"}</span>
        </>
      )}
    </button>
  );
}

function handleGoogleError(err: any) {
  const code = err?.code || '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    toast.info('Connexion annulée');
  } else if (code === 'auth/account-exists-with-different-credential') {
    toast.error('Ce compte existe déjà avec une autre méthode.');
  } else if (err?.message === 'invalid-response') {
    toast.error('Problème de connexion. Veuillez réessayer.');
    console.error('Google auth: non-JSON response from /api/auth/google');
  } else {
    toast.error('Problème de connexion. Veuillez réessayer.');
    if (code) console.error('Google auth error:', code, err);
  }
}
