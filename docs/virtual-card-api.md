# Schéma des appels API — Carte virtuelle TRAIT

> **Principe** : Trait ne génère, ne stocke et ne journalise **jamais** un numéro de carte (PAN), une date d'expiration ou un CVV réels.  
> En mode démonstration / maquette : uniquement **SPÉCIMEN** `0000 0000 0000 0000`.  
> Les champs marqués **[À CONFIRMER ÉMETTEUR]** doivent être alignés sur la documentation officielle de l'émetteur / réseau avant toute intégration live.

---

## 1. Statut de la carte (affichage écran)

### `GET /api/cards/my-cards?userId={id}`  
*(existant — `src/app/api/cards/my-cards/route.ts`)*

| Élément | Détail |
|--------|--------|
| Auth | `requireUser` (cookie `trait_token` ou `Authorization: Bearer`) |
| Réponse `cards[]` | `id`, `cardType`, `cardNumber` (à masquer côté serveur en `****last4` en prod), `expiryDate`, `status`, `createdAt` |
| Réponse `pendingRequests[]` | `id`, `cardType`, `status`, `rejectReason`, `createdAt` |
| **Ne pas renvoyer** | `cvv`, PAN complet en clair dans les logs |

**Statuts `TraitCard.status` observés :**

| Valeur | Écran UI |
|--------|----------|
| `active` | Carte virtuelle active |
| `frozen` *(nouveau)* / `suspended` | Carte gelée |
| `blocked` | Carte bloquée / perdue |
| `pending` *(CardRequest)* | Demande en cours |
| `pending_retrieval` / `delivered` | Carte physique (suivi enfant / livraison) |

**[À CONFIRMER ÉMETTEUR]** : mapping exact des statuts issuer → statuts Trait (ex. `issuerStatus`, `cardLifeCycleState`).

---

## 2. Révélation sécurisée des détails

### `GET /api/cards/reveal?cardId={id}`  
*(nouveau — `src/app/api/cards/reveal/route.ts`)*

Prérequis client : **PIN vérifié** (`POST /api/auth/verify-pin`) ou **biométrie** (WebAuthn / FLAG_SECURE natif).

**Réponse maquette (spécimen) :**

```json
{
  "success": true,
  "mode": "specimen",
  "last4": "0000",
  "pan": null,
  "expiry": null,
  "cvv": null,
  "expiresInSec": 30,
  "message": "… SDK émetteur …"
}
```

**Réponse production attendue (schéma à confirmer) :**

| Champ | Type | Origine | Remarque |
|-------|------|---------|----------|
| `issuerSession` / `displayToken` | string | Émetteur | Jeton éphémère ≤ 30 s **[À CONFIRMER ÉMETTEUR]** |
| `last4` | string | Émetteur / Trait | Seuls 4 chiffres affichables hors SDK |
| `pan` | — | **SDK émetteur uniquement** | Ne doit **jamais** transiter par le stockage app Trait |
| `expiry` | string | SDK émetteur | Format **[À CONFIRMER ÉMETTEUR]** |
| `cvv` | — | SDK émetteur | Souvent **interdit** hors flux 3DS **[À CONFIRMER ÉMETTEUR]** |

**Règles :**
- TTL max 30 s ; masquage auto côté UI + `visibilitychange` / `blur`.
- Copie presse-papiers → effacement à 60 s.
- `logSecurityEvent({ action: 'card_reveal' })` sans PAN.

---

## 3. Gel / dégel

### `POST /api/cards/freeze`  
*(nouveau — `src/app/api/cards/freeze/route.ts`)*

```json
{ "action": "freeze" | "unfreeze" }
```

| Élément | Détail |
|--------|--------|
| Auth | `requireUser` |
| Effet DB | `TraitCard.status` → `frozen` / `active` |
| Notification | Oui (in-app) |
| **Issuer** | Propagation du gel à l'émetteur **[À CONFIRMER ÉMETTEUR]** (webhook, `PUT /cards/{id}/status`, etc.) |

---

## 4. Limites de paiement

### `GET /api/cards/limits?cardId=` · `PUT /api/cards/limits`  
*(à implémenter — placeholders)*

```json
{
  "online": true,
  "contactless": true,
  "atm": true,
  "amountOnline": null,
  "amountContactless": null,
  "amountAtm": null
}
```

| Champ | Statut |
|-------|--------|
| Canaux on/off | UI prête ; API Trait **à créer** |
| Plafonds monétaires | **[À CONFIRMER ÉMETTEUR]** — champs et unités issuer |
| Persistance | Table dédiée ou colonnes sur `TraitCard` **[À CONFIRMER SCHÉMA]** |

---

## 5. Paiements en ligne on/off

Regroupé avec les limites (`online: boolean`) **ou** endpoint dédié :

### `POST /api/cards/online-toggle`  
`{ "enabled": true }` → DB + **[À CONFIRMER ÉMETTEUR]** (merchant channel control).

---

## 6. Transactions récentes

### `GET /api/transfer/history` ou liste `cardPayment`  
*(existant via `my-cards` → `recentPayments`)*  

Jamais de PAN dans `description` — utiliser `****last4`.

---

## 7. Signalement perte / vol + remplacement

### `POST /api/cards/report-lost`  
*(à implémenter)*

```json
{ "cardId": "…", "reason": "lost" | "stolen" }
```

| Étape | Détail |
|-------|--------|
| 1 | `status` → `blocked` (irréversible côté carte) |
| 2 | **[À CONFIRMER ÉMETTEUR]** blocage / révocation PAN |
| 3 | Création carte virtuelle de remplacement (nouvelle demande ou `POST /api/cards/reissue`) |
| 4 | Notification + journal sécurité |

---

## 8. Carte virtuelle à usage unique (jetable)

### `POST /api/cards/one-time`  
*(à implémenter)*

```json
{ "currency": "USD", "singleUse": true }
```

**[À CONFIRMER ÉMETTEUR]** : support cartes single-use / virtual card scopes, durée de vie, frais.

---

## 9. Activation carte physique à réception

### `POST /api/cards/activate-physical`  
`{ "cardId": "…", "activationCode": "…" }`  

**[À CONFIRMER ÉMETTEUR]** : code d'activation, CVV ré-impression, changement de statut `pending_retrieval` → `active`.

---

## 10. Apple Pay / Google Pay (tokenisation)

| Étape | Responsable |
|-------|-------------|
| Provisioning | **SDK émetteur** / réseau (VISA VTS, MDES) **[À CONFIRMER ÉMETTEUR]** |
| App | Ouvrir flow issuer ; ne jamais manipuler le PAN |
| Soutien | `GET` / `POST /api/cards/wallet-provision` → redirige vers session issuer |

---

## 11. 3-D Secure (paiement en ligne)

| Étape | Responsable |
|-------|-------------|
| Challenge 3DS2 | Émetteur / MPI |
| Confirmation in-app | Biométrie + `POST /api/auth/verify-pin` ou WebAuthn |
| Callback | **[À CONFIRMER ÉMETTEUR]** (`challengeId`, `challengeStatus`) |

---

## Récapitulatif : ce qu'il ne faut **jamais** faire côté Trait

| Interdit | Raison |
|----------|--------|
| Générer un PAN / CVV « plausibles » | Fraude, violation réseau |
| Stocker PAN complet ou CVV en DB / localStorage / logs | PCI DSS |
| Afficher un faux numéro qui ressemble à un vrai | Confusion utilisateur |
| Dessiner un logo réseau à la main | Règles Visa/MC — placeholder until assets officiels |
| Révéler les détails sans auth | Vol de données |

---

*Document à relire avec l'émetteur et le DPO avant mise en production.*
