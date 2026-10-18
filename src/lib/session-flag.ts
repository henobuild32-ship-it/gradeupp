/**
 * Marqueur de session vivante : true quand l'utilisateur vient de
 * s'authentifier (login / OTP / biométrie) DANS cette session JavaScript.
 * Sur un rechargement ou une réouverture d'app, la valeur repart à false
 * → l'écran de verrouillage s'affiche.
 */
let freshAuth = false;

export function markFreshAuth(): void {
  freshAuth = true;
}

export function isFreshAuth(): boolean {
  return freshAuth;
}
