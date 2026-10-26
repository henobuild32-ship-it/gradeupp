import type { PageName, User } from '@/lib/store';

type Navigate = (page: PageName, params?: Record<string, any>) => void;

/**
 * Routage centralisé après authentification — la procédure normale :
 * 1. code PIN obligatoire (transactions) — pour TOUT utilisateur, tous rôles
 * 2. slides d'onboarding si jamais vues
 * 3. écran selon le rôle (dashboard agent, statut vendeur, accueil client)
 */
export function routeAfterAuth(navigateTo: Navigate, u: Partial<User> | null): void {
  if (!u) {
    navigateTo('auth-profile');
    return;
  }
  // PIN non configuré → configuration forcée, quelle que soit la voie d'entrée
  if (u.pinSet === false) {
    navigateTo('pin-setup');
    return;
  }
  if (!u.hasCompletedOnboarding && u.role !== 'seller') {
    navigateTo('onboarding');
    return;
  }
  if (u.role === 'agent') {
    navigateTo('agent-dashboard');
    return;
  }
  if (u.role === 'seller') {
    navigateTo(
      u.validationStatus !== 'validated' || u.suspended ? 'seller-pending' : 'seller-dashboard'
    );
    return;
  }
  navigateTo('home');
}
