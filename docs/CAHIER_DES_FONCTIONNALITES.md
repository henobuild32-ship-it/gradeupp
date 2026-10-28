# Cahier des Fonctionnalités — TRAIT

> Application de transfert d'argent et marketplace RDC  
> Version : 1.0 — Juin 2026

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Rôles & permissions](#3-rôles--permissions)
4. [Parcours client](#4-parcours-client)
5. [Parcours agent](#5-parcours-agent)
6. [Parcours vendeur](#6-parcours-vendeur)
7. [Parcours développeur API](#7-parcours-développeur-api)
8. [Administration](#8-administration)
9. [Sécurité & conformité](#9-sécurité--conformité)
10. [Règles métier détaillées](#10-règles-métier-détaillées)
11. [Comptes de test](#11-comptes-de-test)
12. [Points de vigilance](#12-points-de-vigilance)

---

## 1. Vue d'ensemble

TRAIT est une plateforme financière unifiée pour la RDC qui regroupe :

| Domaine | Description |
|---------|-------------|
| Transfert P2P | Envoi/réception d'argent USD et FC entre utilisateurs |
| Retrait agent | Retrait physique auprès d'un agent agréé (frais 0,7 %) |
| Dépôt agent | Crédit de compte via un agent |
| Marketplace | Achat de produits avec bonus promo optionnel |
| Barter | Troc marchandise contre marchandise |
| Recharge crédit | Achat de crédit téléphonique toutes opérateurs |
| Paiement factures | Acquittement de factures diverses |
| Carte TRAIT | Demande et paiement par carte virtuelle |
| Transfert international | Envoi hors RDC (MTN/AIRTEL Money, virement…) |
| API publique | Intégration pour développeurs tiers, avec commission |

---

## 2. Architecture technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React / Next.js 14 (App Router) |
| State management | Zustand (persist localStorage) |
| Backend | Next.js API Routes |
| ORM | Prisma (PostgreSQL) |
| Auth | Mot de passe + PIN + vérification OTP/phone |
| Stockage sensible | Bcrypt (salt 10) pour mot de passe et PIN |

### Structure API

```
src/app/api/
├── admin/
│   ├── agents/…                     # CRUD agents
│   ├── stats/route.ts               # Dashboard admin (KPI + logs)
│   ├── seller-validation/route.ts   # Validation/rejet vendeurs
│   ├── agent-validation/route.ts    # Validation/rejet agents
│   └── … (bonus, cards, messages…)
├── transfer/
│   └── withdraw/route.ts            # Retrait via agent
├── agent/
│   └── withdrawal/[id]/route.ts     # Validation retrait par agent
└── … (dépôt, recharge, carte…)
```

### Store Zustand (`src/lib/store.ts`)

Le store centralise :

- `navigation` : pile de navigation (`goBack`, `navigateTo`)
- `auth` : utilisateur connecté, admin, rôle sélectionné
- `authForm` : téléphone, mot de passe, OTP
- `pin` : action différée après vérification PIN
- `notifications` : liste + compteur non lus
- `theme` : mode sombre
- `language` : `fr` / `en` / etc.

Persisté dans `localStorage` : user, thème, langue, rôle.  
Admin **jamais** persisté (saisie du mot de passe à chaque session).

---

## 3. Rôles & permissions

| Rôle | Code | Accès |
|------|------|-------|
| Client | `client` | Transfert, marketplace, barter, crédit, factures, carte, profil |
| Agent | `agent` | Valider retraits/dépôts clients, ses propres dépôts, son dashboard |
| Vendeur | `seller` | Créer/gérer produits marketplace, scanner QR paiement |
| Admin | `admin` | Tableau de bord, validation agents/vendeurs, bonus, campagnes, cartes, blocage utilisateurs |
| Super admin | `super_admin` | Comme admin + gestion admins |

### États additionnels

| Champ | Valeurs | Rôle |
|-------|---------|------|
| `validationStatus` | `pending` / `validated` / `rejected` | Agent, seller |
| `suspended` | `true` / `false` | Admin uniquement |
| `tempBlocked` | `true` / `false` | Verrouillage automatique (tentatives PIN épuisées) |
| `kycStatus` | `none` / `pending` / `approved` / `rejected` | Client |

---

## 4. Parcours client

### 4.1 Inscription / Connexion

1. **Choix du rôle** : client
2. **Authentification** : numéro de téléphone → OTP
3. **Profil** : nom, pseudo, genre, ville, pays
4. **Sécurité** : création PIN (4 chiffres)
5. **Onboarding** : tutoriel (marqué `hasCompletedOnboarding = true`)
6. **Connexion ultérieure** : téléphone + mot de passe **puis** PIN

### 4.2 Transfert d'argent (P2P)

- **Envoi** : destinaire par favori / recherche téléphone  
- Frais : **0,7 %** du montant, arrondi à 2 décimales  
- Double saisie PIN avant confirmation  
- Vérification solde `realBalance` (USD) ou `realBalanceFC` (FC)  
- **Statut** : `pending` → `completed` (sécurité serveur)  
- Notification envoyée au destinataire

> **Sécurité P2P** : ne pas valider automatiquement ; l'agent/expéditeur garde la responsabilité jusqu'à confirmation.

### 4.3 Retrait via agent

- L'utilisateur choisit un agent (code ou numéro)
- Montant + devise (USD ou FC)
- Frais : **0,7 %** (ex: 10 000 FC → frais 70 FC)
- **Débit immédiat du compte client** (balance Frozen jusqu'à validation agent)
- Statut enregistré : **`pending`** (pas `completed` au backend)
- Notification : "Retrait en cours de validation"
- Agent voit la demande dans `agent-dashboard`, valide ou rejette

> Le code `src/app/api/transfer/withdraw/route.ts` initialise le retrait en `pending`.  
> La validation est déclenchée par la route `GET /api/agent/withdrawal/[id]`.

### 4.4 Dépôt via agent

- Agent crée un dépôt pour le client  
- Méthode : mobile_money / cash  
- Dashboard agent → valide → crédite `realBalance` du client  

### 4.5 Marketplace

| Action | Règle |
|--------|-------|
| Créer produit | Vendeur uniquement |
| Achat | Client/seller (pas vendeur de son propre produit) |
| Bonus promo | `bonusEnabled = true` : prix réduit en bonus, plafond `bonusMaxQty`, date limite `bonusExpiryAt` |
| Paiement FB | `usedBonus` débité du `bonusBalance`, `usedReal` du `realBalance` |
| Produit inactif | `active = false` → non visible |

### 4.6 Barter (troc)

- Créer offre : titre, catégorie, description, item souhaité, photos
- Statut : `active` / `completed` / `cancelled`
- Chat intégré par offre
- Participants limités à `[chatId, userId]` unique

### 4.7 Solde double devise

| Champ | Devise |
|-------|--------|
| `realBalance` | USD |
| `realBalanceFC` | Franc congolais (FC) |
| `bonusBalance` | Bonus USD |
| `bonusBalanceFC` | Bonus FC |

Toutes les opérations P2P, retraits, marketplace respectent la devise de la transaction.  
L'incrément/décrément Prisma utilise `{ increment: x }` / `{ decrement: x }` pour éviter les race conditions.

### 4.8 Carte TRAIT

1. Demande de carte (`card-request`) : type USD, statut `pending`
2. Validation admin : génère `TraitCard` (numéro, CVV, QR code, expiry)
3. Paiement carte : `CardPayment` lié à la carte
4. Statut carte : `active` / `blocked` / `expired`

### 4.9 Recharge crédit & paiement factures

- `CreditPurchase` : réseau (Airtel/MTN/Vodacom…), numéro, montant
- `BillPayment` : type facture, référence, montant
- Les deux sont enregistrés en `completed` après action

---

## 5. Parcours agent

### 5.1 Enregistrement

- Rôle : `agent`
- Champs obligatoires : `agentCode` (unique, ex `AGT-000001`), `agentNumber`
- Statut initial : `pending` → validation admin
- `agentDeposits` : relation Deposit[] reçus
- `agentWithdrawals` : relation Withdrawal[] traités
- `agentTransactions` : relation Transaction[] concernés

### 5.2 Dashboard agent

- Retraits à valider (statut `pending`)
- Dépôt en attente
- Historique transactions (filtre par agent)
- Solde réel + bonus

### 5.3 Validation retrait

- Agent consulte la demande
- Confirme ou rejette avec remarque optionnelle
- Si confirmé : statut `completed`, notification client
- Si rejeté : rollback solde client, notification + raison

### 5.4 Dépôt pour client

- Agent saisit montant + client + méthode
- Confirme → mise à jour solde client
- Notification client

---

## 6. Parcours vendeur

### 6.1 Enregistrement

- Rôle : `seller`
- Formulaire : `businessName`, `businessType`, `location`, `photoId`
- Statut initial : `pending`
- Validation admin : `validated` / `rejected` / `hold` (attente)

### 6.2 Actions après validation

- Créer/modifier/supprimer produits
- Activer/désactiver produits
- Configurer bonus promo (prix promo, quantité max, date fin)
- Voir commandes reçues (`Purchase`)
- Scanner QR client pour paiement sur lieu de vente

### 6.3 Règles

| Règle | Raison |
|-------|--------|
| `photoId` requis à l'inscription | Vérification identité vendeur |
| Un seul `validationStatus` par vendeur | Cohérence administrative |
| `suspensionReason` en cas de blocage | Traçabilité |

---

## 7. Parcours développeur API

### 7.1 Inscription

- `Developer` : nom complet, société, email, téléphone, pays, appName, `projectType`, description
- Statut : `pending` → validation admin → `approved`
- `commissionRate` : taux par défaut **1,5 %** (configurable)
- `estimatedUsers` : estimation diffusion

### 7.2 Clés API

- `DeveloperApiKey` : `publicKey` + `secretKey`
- Modes : `test` / `production`
- `webhookUrl` : URL de callback optionnelle
- `expiresAt` : date d'expiration optionnelle
- Pivot : `apiKeys` (relation `DeveloperApiKey[]`)

### 7.3 Commission

- Chaque transaction API enregistre une ligne `ApiCommission`
- `amount` : montant transaction
- `commission` : montant reversé au développeur
- `status` : `collected` / `pending`
- Backfill par cron dans le dashboard admin (`totalApiCommission`, `ApiCommission` aggregate)

---

## 8. Administration

### 8.1 Dashboard (`/admin-dashboard`)

```
/stats (GET)
├── KPI temps réel (Promise.all)
│   ├── totalUsers / totalAgents / totalSellers
│   ├── pendingAgents / pendingSellers / pendingDevelopers
│   ├── totalTransactions / todayTransactions
│   ├── totalDeposits / totalWithdrawals
│   ├── totalVolume / sendVolume (sans doublon P2P)
│   ├── monthlyTransactions / monthlyDepositVolume / monthlyWithdrawalVolume
│   ├── totalApiCommission / internationalTransfers
│   ├── totalProducts / activeProducts
│   ├── totalBarterOffers / activeBarterOffers
│   └── suspendedUsers
├── recentLogs (10 dernières actions AdminActivityLog)
└── monthly stats (30 jours glissants)
```

### 8.2 Validation agents

POST → `validationStatus: validated` | `rejected`  
`isVerified = true` en cas de validation  
Notification + log admin obligatoires

### 8.3 Validation vendeurs

Actions : `validate` / `reject` / `hold`  
Chaque action :
- Met à jour `validationStatus`
- Stocke raison dans `validationRejectReason`
- Crée `AdminActivityLog`
- Crée `Notification` destinataire

### 8.4 Gestion bonus & campagnes

- `BonusCampaign` : nom, description, montant, devise, cible (`all` / ids), statut, limites
- `BonusHistory` : pistage distribution par user
- `bonusBlocked` / `bonusBlockedReason` : blocage manuel

### 8.5 Gestion cartes

- Voir demandes `CardRequest` (statut : `pending` / `approved` / `rejected`)
- Valider → créer `TraitCard` avec numéro, CVV, QR, expiry
- `admin.role` vérifié avant chaque action sensible

### 8.6 Blocage / suspension

| Niveau | Champ | Action |
|--------|-------|--------|
| Temporaire | `tempBlocked` | Verrouillage PIN tentatives |
| Définitif | `suspended` | Admin action, raison obligatoire |

---

## 9. Sécurité & conformité

| Aspect | Implémentation |
|--------|----------------|
| Mot de passe | Bcrypt salt=10, jamais en clair en DB |
| PIN | Bcrypt (pas stocké en clair) |
| Authentification admin | Mot de passe requis à chaque session (non persisté) |
| Transactions atomiques | `db.$transaction()` pour tous les virements/dépôts/retraits |
| Vérifications pré-opération | Vérification `suspended`, `tempBlocked`, solde avant action |
| Traçabilité | `AdminActivityLog` pour chaque action admin |
| Notifications | `Notification` créée systématiquement pour le user concerné |
| Logs sécurité | `SecurityLog` pour événements suspects (IP, user-agent, riskLevel) |
| Validation serveur | Toutes les routes API valident les droits avant mutation |

### Règles de sécurité applicables

1. Un agent **ne peut pas** valider son propre retrait
2. Un vendeur **ne peut pas** acheter son propre produit
3. Toute opération sensible exige **double vérification** (PIN ou admin)
4. Les montants passent par `$transaction` Prisma pour éviter les race conditions
5. Le délégataire admin n'est jamais stocké en localStorage
6. Les `or` multi-critères Prisma utilisent toujours des `mode: 'insensitive'` pour recherche textuelle

---

## 10. Règles métier détaillées

### 10.1 Transfert P2P

```
sender.realBalance         -= (montant + 0,7 %)
receiver.realBalance       += montant
plateforme (agentId)       += 0,7 %  (si agent impliqué)
Transaction sender         type: 'send', status: pending → completed
Transaction receiver       type: 'receive', status: completed
Notification receiver      type: 'transfer_received'
```

### 10.2 Retrait agent

```
client.realBalance[FC]     -= (montant + 0,7 %)
agent.realBalance[FC]      += montant  (commission agent, pas les frais)
Platform fee (0,7 %)        conservé par le système dans agent.commission
Withdrawal                 status: pending → (validé par agent) → completed
Transaction client         type: 'withdrawal', status: pending
Notification client        "Retrait en cours de validation"
```

### 10.3 Marketplace — Bonus promo

```
product.bonusEnabled       = true
product.bonusPrice         < product.price  (réduction)
product.bonusMaxQty        limite quantités
product.bonusExpiryAt      date limite
Achat => Purchase.usedBonus = bonusPrice * qty  (débit bonusBalance)
        Purchase.usedReal  = solde réel restant
Vendeur reçoit le montant  réel uniquement (hors bonus)
```

### 10.4 Solde double devise

- Chaque opération se fait dans sa devise d'origine
- `realBalanceFC` et `realBalanceFC` sont **indépendants**
- L'utilisateur peut avoir 0 USD et 50 000 FC simultanément sans erreur
- Les notifications précisent la devise pour éviter toute ambiguïté

### 10.5 Prisma `skipDuplicates`

- Tous les upserts utilisent `where` + `update/create` pour idempotence

---

## 11. Comptes de test

| Rôle | Téléphone | Mot de passe | PIN | Identifiant |
|------|-----------|--------------|-----|-------------|
| Admin | — | `admin1234` | — | `admin` |
| Client 1 | `+243810000001` | `1234` | `0000` | Jean Mukendi |
| Client 2 | `+243820000002` | `1234` | `0000` | Marie Kabongo |
| Client 3 | `+243830000003` | `1234` | `0000` | Pierre Nsimba |
| Agent | `+243840000004` | `1234` | `0000` | Code `AGT-000001` |

> **Sécurité** : les mots de passe et PIN sont hashés en base avec bcrypt (salt=10).  
> Les valeurs en clair ci-dessus sont fournies **uniquement pour le développement**.

---

## 12. Points de vigilance

| Problème | Solution appliquée |
|----------|-------------------|
| **Double comptabilisation volume P2P** | Volume net : sommé uniquement côté récepteur (`receiverId`) pour éviter le double-compte |
| **Retrait marqué `completed` dès la création** | Corrigé : status initial `pending` ; validation agent requise |
| **Devise FC non vérifiée** | Corrigé : validation stricte `currency ∈ {USD, FC}` |
| **PIN stocké en clair dans seed** | Corrigé : bcrypt.hash() appliqué à tous les upserts |
| **seed.ts — `update` utilisait valeurs non hashées** | Corrigé : chaque `update` re-hash avant update |
| **seed.ts — user2 copiait user1 dans create** | Corrigé : valeurs dédiées à chaque user |
| **TransactionType en DB large** | Ne pas inclure `type: 'send'` dans calcul volume 30j (déjà capté par `receive`) |
| **Missing `import type` pour `Language`** | Déjà correct dans `store.ts` |
| **`agentCode` manquant chez client** | `agentCode` nullable sur User, correct |

---

*Document rédigé dans le cadre de la correction et de la documentation du projet TRAIT.*
