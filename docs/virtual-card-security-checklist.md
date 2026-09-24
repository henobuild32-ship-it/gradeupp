# Checklist sécurité & conformité — Carte virtuelle TRAIT

> À valider avec **l'émetteur**, le **réseau** (Visa/Mastercard) et le **DPO / RSSI** avant toute mise en production.  
> Statut : `☐` à faire · `☑` fait · `⚠` partiel / en attente émetteur

---

## 1. Données de carte (PCI DSS)

| # | Contrôle | Statut | Notes |
|---|----------|--------|-------|
| 1.1 | Jamais de génération de PAN/CVV/date côté app | ☑ | Mode SPÉCIMEN `0000 0000 0000 0000` uniquement en démo |
| 1.2 | PAN complet non stocké (DB, cache, logs, analytics) | ⚠ | Legacy `TraitCard.cardNumber` / `cvv` en clair **à migrer** vers émetteur + masque `last4` |
| 1.3 | CVV non stocké, non journalisé, non transmis après 3DS | ⚠ | Idem — hors scope si émetteur affiche et Trait ne stocke pas |
| 1.4 | Révélation = auth forte (PIN + biométrie) | ☑ UI / ⚠ biométrie native | WebAuthn / `FLAG_SECURE` Android à brancher côté Capacitor |
| 1.5 | Masquage auto ≤ 30 s + arrière-plan | ☑ | `setTimeout` 30 s + `visibilitychange` / `blur` |
| 1.6 | Presse-papiers effacé ≤ 60 s après copie | ☑ | `clipboard.writeText('')` après 60 s |
| 1.7 | Seuls `last4` affichés par défaut | ☑ | `•••• •••• •••• 1234` |
| 1.8 | Nom titulaire = profil KYC vérifié | ☑ | `user.name` / `pseudo` — lier KYC `verified` avant prod |
| 1.9 | SAQ PCI applicatif déterminé (SAQ A / A-EP / D) | ☑ | Objectif **SAQ A** si iframe/SDK émetteur (Trait hors flux PAN) |
| 1.10 | Tokenisation Apple Pay / Google Pay via émetteur | ☐ | **[À CONFIRMER ÉMETTEUR]** |

---

## 2. Transport & session

| # | Contrôle | Statut | Notes |
|---|----------|--------|-------|
| 2.1 | HTTPS uniquement (HSTS) | ☑ | Vercel TLS |
| 2.2 | Certificate pinning (mobile) | ☐ | Capacitor / OkHttp pinning **à configurer** |
| 2.3 | Jeton d'accès court (reveal ≤ 30 s) | ☑ | `expiresInSec: 30` |
| 2.4 | Cookies `HttpOnly` + `SameSite` | ☑ | `trait_token` |
| 2.5 | Rate-limit sur `reveal` / `freeze` | ⚠ | `requireUser` ok ; rate-limit dédié **à ajouter** |
| 2.6 | Journalisation sécurité sans secrets | ☑ | `logSecurityEvent` sans PAN |

---

## 3. Affichage & anti-capture

| # | Contrôle | Statut | Notes |
|---|----------|--------|-------|
| 3.1 | `FLAG_SECURE` Android sur écran détails | ☐ | Plugin Capacitor **à ajouter** |
| 3.2 | Protection capture iOS (`isSecureTextEntry` / obscuring) | ☐ | Équivalent WKWebView **à évaluer** |
| 3.3 | Watermark optionnel (userId + horodatage) | ☐ | UX anti-fraude |
| 3.4 | Pas de capture dans le flux de partage OS | ☐ | Masquer du switcher récent si possible |

---

## 4. Logo réseau & branding

| # | Contrôle | Statut | Notes |
|---|----------|--------|-------|
| 4.1 | Emplacement réservé logo réseau (Visa/MC) | ☑ | Zone UI ; **ne pas dessiner** un logo réel |
| 4.2 | Assets officiels réseau reçus et licenciés | ☐ | En attente fichiers officiels |
| 4.3 | Wordmark « Trait » conforme charte | ☑ | Haut gauche carte `#0f1b2d` / accent `#3ddc97` |
| 4.4 | Mention SPÉCIMEN obligatoire en démo | ☑ | `NEXT_PUBLIC_CARD_MODE !== 'live'` |

---

## 5. Flux métier carte

| # | Contrôle | Statut | Notes |
|---|----------|--------|-------|
| 5.1 | Demande → suivi (KYC, création, prête) | ☑ UI | États `pending` |
| 5.2 | Activation carte physique à réception | ☑ UI / ☐ API | `POST /cards/activate-physical` **[ÉMETTEUR]** |
| 5.3 | Gel / dégel utilisateur | ☑ | `POST /api/cards/freeze` + propagation issuer **[ÉMETTEUR]** |
| 5.4 | Blocage perte/vol + remplacement virtuel | ☑ UI / ☐ API | `report-lost` **[ÉMETTEUR]** |
| 5.5 | Limites en ligne / sans contact / DAB | ☑ UI / ☐ API | Champs plafonds **[ÉMETTEUR]** |
| 5.6 | Toggle paiements en ligne | ☑ UI | Idem |
| 5.7 | Carte à usage unique / jetable | ☑ UI / ☐ API | Support issuer **[ÉMETTEUR]** |
| 5.8 | 3DS2 challenge in-app (biométrie) | ☐ | **[ÉMETTEUR]** |
| 5.9 | Transactions récentes sans PAN | ☑ | `****last4` dans descriptions |

---

## 6. Conformité & gouvernance

| # | Contrôle | Statut | Notes |
|---|----------|--------|-------|
| 6.1 | Revue DPO / consentement traitement données carte | ☐ | |
| 6.2 | PB (preuve bancaire) / KYC avant émission | ⚠ | Flux KYC existant ; couverture **à valider émetteur** |
| 6.3 | Conditions générales carte (fees, gel, perte) | ☐ | |
| 6.4 | Test de charge / pénétration avant prod | ☐ | |
| 6.5 | Runbook incident (fuite PAN, fraude) | ☐ | |
| 6.6 | Validation finale émetteur + réseau | ☐ | **Gate de mise en production** |

---

## 7. Dette technique à traiter avant live

1. **Migrer** `TraitCard.cardNumber` / `cvv` hors base Trait (ou chiffrement fort + accès minimale) — aujourd'hui stockés en clair pour l'app legacy.  
2. Masquer systématiquement le PAN dans `GET /api/cards/my-cards` (réponse `****last4` uniquement).  
3. Brancher `GET /api/cards/reveal` sur le **SDK émetteur** (remplacer `mode: specimen`).  
4. Propagation gel/blocage vers l'issuer API.  
5. Certificate pinning + `FLAG_SECURE`.  
6. Rate-limit et audit trail sur toutes les actions carte sensibles.

---

## Sign-offs

| Rôle | Nom | Date | Signature |
|------|-----|------|-----------|
| Émetteur (product) | | | |
| Émetteur (sécurité / PCI) | | | |
| RSSI Trait | | | |
| DPO Trait | | | |
| Tech lead front | | | |

*Dernière mise à jour : 2026-09-24*
