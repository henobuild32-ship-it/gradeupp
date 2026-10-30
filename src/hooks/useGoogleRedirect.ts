'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { completeGoogleRedirect, isGoogleAuthConfigured } from '@/lib/firebase';
import { useAppStore } from '@/lib/store';
import { routeAfterAuth } from '@/lib/route-after-auth';
import { markFreshAuth } from '@/lib/session-flag';

/**
 * Consomme le résultat du flux Google en redirect (mobile / popup bloquée) au
 * niveau de l'application, quel que soit l'écran affiché au retour de Google.
 * Sans ça, l'utilisateur atterrit sur « welcome » (currentPage non persisté)
 * et le résultat redirect n'est jamais traité.
 */
export function useGoogleRedirect() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !isGoogleAuthConfigured()) return;
    started.current = true;
    let cancelled = false;

    const run = async () => {
      let result: { idToken: string; uid: string } | null = null;
      try {
        result = await completeGoogleRedirect();
      } catch (error) {
        console.error('Google redirect result unavailable', error);
        return;
      }
      if (cancelled || !result) return;

      const store = useAppStore.getState();
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: result.idToken, mode: 'login' }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) throw new Error('invalid-response');
        const data = await res.json();
        if (cancelled) return;

        // Nouveau compte Google → écran d'inscription prérempli (complétion du profil)
        if (res.status === 206 || data.needsProfile) {
          store.navigateTo('auth-login', {
            googleSignup: { googleData: data.googleData, idToken: result.idToken },
          });
          return;
        }

        if (data.requiresTwoFactor) {
          if (typeof data.challengeToken === 'string' && data.challengeToken) {
            store.navigateTo('auth-login', { twoFactorChallenge: data.challengeToken });
            toast.info('Saisissez votre code de vérification pour terminer la connexion Google.');
          } else {
            toast.error('La vérification en deux étapes n’a pas pu démarrer. Réessayez.');
          }
          return;
        }

        if (!res.ok || !data.success) {
          toast.error(data.message || 'Connexion Google impossible pour le moment. Réessayez.');
          return;
        }

        // Compte existant → connexion directe, procédure normale (PIN → onboarding → écran du rôle)
        if (data.token) store.setToken(data.token);
        if (data.user) {
          markFreshAuth();
          store.setUser(data.user);
          routeAfterAuth(store.navigateTo, data.user);
          toast.success(data.isNewUser ? 'Compte créé avec Google !' : 'Connecté avec Google !');
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Google redirect sign-in failed', error);
          toast.error('Problème de connexion. Veuillez réessayer.');
        }
      }
    };

    // Ne jamais muter la session avant l'hydratation du store persisté
    // (sinon la restauration écraserait l'utilisateur fraîchement connecté).
    const persistence = useAppStore.persist;
    if (!persistence || persistence.hasHydrated()) {
      run();
    } else {
      const unsubscribe = persistence.onFinishHydration(() => {
        if (!cancelled) run();
      });
      return () => {
        cancelled = true;
        unsubscribe();
      };
    }

    return () => {
      cancelled = true;
    };
  }, []);
}
