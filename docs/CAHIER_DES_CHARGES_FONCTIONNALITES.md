# Cahier des Charges — Nouvelles Fonctionnalités TRAIT v2.0

> Document détaillant l'ensemble des fonctionnalités récemment ajoutées à la plateforme TRAIT (Transfert, Paiement QR, Marketplace & Troc).

---

## Table des matières

1. [Paiement par QR Code](#1-paiement-par-qr-code)
2. [Liens de Paiement](#2-liens-de-paiement)
3. [Demandes de Paiement](#3-demandes-de-paiement)
4. [Paiements Récurrents](#4-paiements-récurrents)
5. [Catalogue de Recharge (Bundles)](#5-catalogue-de-recharge-bundles)
6. [Paiement de Factures (Bills)](#6-paiement-de-factures-bills)
7. [Micro-Crédit](#7-micro-crédit)
8. [Objectifs d'Épargne](#8-objectifs-dépargne)
9. [Authentification Biométrique](#9-authentification-biométrique)
10. [Double Facteur (2FA/TOTP)](#10-double-facteur-2fatotp)
11. [Cartes TRAIT (Virtuelles/Physiques)](#11-cartes-trait-virtuellesphysiques)
12. [Transferts Internationaux](#12-transferts-internationaux)
13. [Parrainage (Référencement)](#13-parrainage-référencement)
14. [Analytiques](#14-analytiques)
15. [Reçus de Transaction](#15-reçus-de-transaction)
16. [Paiement par Contact](#16-paiement-par-contact)
17. [Marketplace](#17-marketplace)
18. [Système de Troc (Barter)](#18-système-de-troc-barter)
19. [Comptes Enfants/Parrainage](#19-comptes-enfantsparrainage)
20. [KYC (Know Your Customer)](#20-kyc-know-your-customer)
21. [Plateforme Développeur (API)](#21-plateforme-développeur-api)
22. [Support Technique (Tickets)](#22-support-technique-tickets)
23. [Notifications Push](#23-notifications-push)
24. [Système de Bonus](#24-système-de-bonus)
25. [Comptes Fournisseur (Seller)](#25-comptes-fournisseur-seller)
26. [Paiement de Recharge (Airtime Direct)](#26-paiement-de-recharge-airtime-direct)
27. [Services Agent](#27-services-agent)

---

## 1. Paiement par QR Code

### Description
Génération et scan de QR codes pour les paiements entre utilisateurs. Chaque utilisateur possède un QR code personnel lié à son ID.

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/payment/qr?userId={id}` | Générer le QR code d'un utilisateur |
| POST | `/api/payment/qr` | Payer via QR code scanné |

### Flux
1. **Payeur** scanne le QR code du bénéficiaire via l'appareil photo
2. L'écran `ContactPayScreen` s'ouvre avec le bénéficiaire pré-rempli
3. Le payeur saisit le montant et confirme avec son code PIN
4. La transaction est créée et les soldes sont mis à jour

### Écran
- `ContactPayScreen.tsx` — Formulaire de paiement par contact/QR
- `MyQrCodeScreen.tsx` — Affichage du QR code personnel

---

## 2. Liens de Paiement

### Description
Génération de liens de paiement partageables. Un utilisateur peut créer un lien avec un montant fixe, le partager via WhatsApp, SMS, etc., et le payeur peut régler via plusieurs méthodes (wallet TRAIT, M-Pesa, Orange Money, Airtel Money, AfriMoney).

### Modèle (`PaymentLink`)
| Champ | Type | Description |
|-------|------|-------------|
| id | String | PK |
| userId | String | Créateur du lien |
| amount | Float | Montant à payer |
| currency | String | "FC" par défaut |
| description | String? | Description du paiement |
| code | String | Code unique (generated) |
| status | String | "active" \| "used" \| "expired" |
| maxUses | Int | 0 = illimité |
| useCount | Int | Nombre d'utilisations |
| allowedMethods | String | Méthodes acceptées (ex: "wallet,mpesa,orange,airtel,afrimoney") |
| expiresAt | DateTime? | Date d'expiration |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/payments/links` | Lister ses liens |
| POST | `/api/payments/links` | Créer un lien |
| PUT | `/api/payments/links/[code]` | Modifier un lien |
| DELETE | `/api/payments/links/[code]` | Supprimer un lien |
| GET | `/api/payments/links/[code]` | Payer via un lien (page publique) |

### Flux
1. **Créateur** définit montant, description, méthodes acceptées
2. Un code unique est généré → URL `https://trait.app/pay/link?code=XXXX`
3. Le créateur partage le lien via les outils de partage du téléphone
4. **Payeur** ouvre le lien → page publique avec les infos du paiement
5. Le payeur choisit une méthode de paiement (wallet TRAIT, M-Pesa, Orange Money, etc.)
6. Pour wallet TRAIT : connexion requise, confirmation par PIN
7. Pour les autres méthodes : instructions de paiement affichées
8. Le créateur reçoit une notification de paiement réussi

### Pages publiques
- `/pay/link` — Page de paiement via lien
- `/pay/[userId]` — Page de paiement direct par ID utilisateur

### Écran
- `PaymentLinksScreen.tsx` — Gestion des liens de paiement

---

## 3. Demandes de Paiement

### Description
Un utilisateur peut demander de l'argent à un autre utilisateur (par ID ou numéro de téléphone). Le destinataire reçoit une notification et peut accepter ou refuser.

### Modèle (`PaymentRequest`)
| Champ | Type | Description |
|-------|------|-------------|
| id | String | PK |
| requesterId | String | Celui qui demande |
| targetId | String? | Destinataire cible (connu) |
| targetPhone | String? | Destinataire par téléphone |
| amount | Float | Montant |
| currency | String | "FC" par défaut |
| description | String? | Motif |
| status | String | "pending" \| "paid" \| "cancelled" |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/payments/request` | Lister ses demandes (envoyées + reçues) |
| POST | `/api/payments/request` | Créer une demande |
| PUT | `/api/payments/request/[id]` | Marquer comme payée/annuler |

### Écran
- `PaymentRequestScreen.tsx` — Gestion des demandes de paiement

---

## 4. Paiements Récurrents

### Description
Configuration de virements automatiques programmés (quotidien, hebdomadaire, mensuel). Le système exécute automatiquement le transfert à la fréquence définie.

### Modèle (`RecurringPayment`)
| Champ | Type | Description |
|-------|------|-------------|
| id | String | PK |
| userId | String | Payeur |
| recipientId | String | Bénéficiaire |
| amount | Float | Montant |
| currency | String | "FC" par défaut |
| frequency | String | "daily" \| "weekly" \| "monthly" |
| description | String? | Motif |
| status | String | "active" \| "paused" \| "completed" \| "cancelled" |
| nextRun | DateTime | Prochaine exécution |
| lastRun | DateTime? | Dernière exécution |
| maxRuns | Int | 0 = illimité |
| runCount | Int | Nombre d'exécutions |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/payments/recurring` | Lister ses récurrents |
| POST | `/api/payments/recurring` | Créer un récurrent |
| PUT | `/api/payments/recurring/[id]` | Modifier/pause/reprendre |
| DELETE | `/api/payments/recurring/[id]` | Supprimer |

### Écran
- `RecurringPaymentsScreen.tsx` — Gestion des paiements récurrents

---

## 5. Catalogue de Recharge (Bundles)

### Description
Achat de forfaits airtime, data, et TV (DSTV, Canal+) auprès des opérateurs (Orange, Airtel, Africell). Catalogue avec catégories et produits pré-définis. Achat pour soi-même ou pour un autre numéro.

### Modèles
**BundleCategory**
| Champ | Type |
|-------|------|
| id, name, slug (unique), icon? |

**BundleProduct**
| Champ | Type |
|-------|------|
| id, categoryId, name, operator?, type ("airtime"\|"data"\|"tv"), amount, currency ("FC"), price, description?, active (default true), createdAt |

**BundlePurchase**
| Champ | Type |
|-------|------|
| id, userId, productId, phoneNumber?, amount, currency ("FC"), status ("completed"), reference?, createdAt |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/bundles?category={slug}` | Lister les produits (avec seed auto si vide) |
| POST | `/api/bundles/purchase` | Acheter un bundle |

### Écran
- `BundleCatalogScreen.tsx` — Catalogue avec catégories, achat, confirmation

---

## 6. Paiement de Factures (Bills)

### Description
Paiement de factures utilitaires (électricité, eau, etc.) via un catalogue de fournisseurs.

### Modèle (`BillPayment`)
| Champ | Type |
|-------|------|
| id, userId, billType, reference, amount, currency ("USD"), status ("completed"), createdAt |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/bills/catalog` | Liste des fournisseurs disponibles |
| POST | `/api/bills/pay` | Payer une facture |
| GET | `/api/bills/history` | Historique des paiements de factures |

### Écran
- `BillsScreen.tsx` — Sélection du fournisseur, saisie de la référence, paiement

---

## 7. Micro-Crédit

### Description
Système de petits prêts avec intérêt. L'utilisateur peut demander un micro-crédit, qui est approuvé manuellement par un administrateur. Le remboursement peut être effectué en une ou plusieurs fois.

### Modèle (`MicroCredit`)
| Champ | Type | Description |
|-------|------|-------------|
| id | String | PK |
| userId | String | Emprunteur |
| amount | Float | Montant emprunté |
| currency | String | "FC" par défaut |
| interestRate | Float | 0.05 (5%) par défaut |
| totalDue | Float | Total à rembourser (montant + intérêts) |
| paidSoFar | Float | Déjà remboursé |
| status | String | "pending" \| "approved" \| "active" \| "completed" \| "defaulted" |
| duration | String | "30" jours par défaut |
| dueDate | DateTime? | Date d'échéance |
| approvedAt | DateTime? | |
| approvedBy | String? | Admin qui a approuvé |
| completedAt | DateTime? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/microcredit` | Lister ses crédits |
| POST | `/api/microcredit` | Demander un crédit |
| POST | `/api/microcredit/repay` | Rembourser (partiellement ou totalement) |

### Écran
- `MicroCreditScreen.tsx` — Demande, suivi, remboursement

---

## 8. Objectifs d'Épargne

### Description
Création d'objectifs d'épargne avec suivi de progression. Possibilité de virements automatiques programmés vers l'objectif.

### Modèles
**SavingsGoal**
| Champ | Type | Description |
|-------|------|-------------|
| id | String | PK |
| userId | String | |
| name | String | Nom de l'objectif |
| targetAmount | Float | Montant cible |
| currency | String | "FC" par défaut |
| currentAmount | Float | 0 par défaut |
| autoTransfer | Boolean | false par défaut |
| autoAmount | Float? | Montant du virement auto |
| autoFrequency | String? | "daily" \| "weekly" \| "monthly" |
| autoNextRun | DateTime? | Prochain virement auto |
| status | String | "active" \| "completed" \| "cancelled" |
| deadline | DateTime? | Date butoir |
| completedAt | DateTime? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**SavingsContribution**
| Champ | Type |
|-------|------|
| id, goalId, amount, currency ("FC"), type ("manual" \| "auto"), createdAt |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/savings` | Lister ses objectifs |
| POST | `/api/savings` | Créer un objectif |
| PUT | `/api/savings` | Modifier un objectif |
| DELETE | `/api/savings` | Supprimer un objectif |
| POST | `/api/savings/contribute` | Ajouter une contribution |

### Écran
- `SavingsGoalsScreen.tsx` — Création, suivi, contributions

---

## 9. Authentification Biométrique

### Description
Authentification par empreinte digitale (fingerprint) ou reconnaissance faciale (Face ID) via WebAuthn. Permet de se connecter sans mot de passe après configuration initiale.

### Modèle (champs sur `User`)
- `biometricEnabled` (Boolean, defaut false)
- `biometricPublicKey` (String?)
- `faceIdEnabled` (Boolean, defaut false)
- `fingerprintEnabled` (Boolean, defaut false)

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/biometric?action=register` | Enregistrer une clé biométrique |
| POST | `/api/biometric?action=verify` | Vérifier une clé biométrique |
| DELETE | `/api/biometric` | Désactiver la biométrie |

### Flux
1. L'utilisateur active la biométrie dans les paramètres
2. Le navigateur/mobile demande l'authentification (Face ID / fingerprint)
3. La clé publique est enregistrée sur le serveur
4. Lors de la connexion suivante, l'utilisateur peut choisir "Connexion avec empreinte"
5. L'appareil vérifie localement l'empreinte/visage et envoie la clé publique au serveur
6. Si la clé correspond, l'utilisateur est connecté

### Écrans
- `BiometricSetupScreen.tsx` — Activation/désactivation
- `AuthLoginScreen.tsx` — Bouton de connexion biométrique

---

## 10. Double Facteur (2FA/TOTP)

### Description
Authentification à deux facteurs basée sur TOTP (Time-based One-Time Password). L'utilisateur peut lier une application d'authentification (Google Authenticator, Authy, etc.).

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/auth/2fa/setup` | Obtenir le secret + QR code |
| POST | `/api/auth/2fa/setup` | Activer 2FA après vérification |
| POST | `/api/auth/2fa/verify` | Vérifier un code TOTP |

### Écran
- `TwoFactorScreen.tsx` — Configuration et vérification 2FA

---

## 11. Cartes TRAIT (Virtuelles/Physiques)

### Description
Gestion de cartes virtuelles et physiques TRAIT. L'utilisateur peut demander une carte, qui est approuvée par un administrateur. La carte possède un numéro, CVV, date d'expiration, et QR code.

### Modèles
**CardRequest**
| Champ | Type |
|-------|------|
| id, userId, cardType ("USD" \| "FC"), status ("pending" \| "approved" \| "rejected"), rejectReason?, adminId?, createdAt, updatedAt |

**TraitCard**
| Champ | Type |
|-------|------|
| id, userId, cardRequestId, cardType, cardNumber (unique), cvv, qrCode, expiryDate, status ("active" \| "blocked"), createdAt, updatedAt |

**CardPayment**
| Champ | Type |
|-------|------|
| id, cardId, userId, amount, currency ("USD"), description?, status ("pending"), createdAt |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/cards/my-cards` | Liste des cartes de l'utilisateur |
| POST | `/api/cards/request` | Demander une nouvelle carte |
| GET | `/api/cards/request` | Statut des demandes |
| POST | `/api/cards/pay` | Payer avec une carte |
| POST | `/api/cards/child/create` | Créer une carte pour enfant |
| POST | `/api/cards/child/recharge` | Recharger une carte enfant |

### Écrans
- `CardScreen.tsx` — Gestion des cartes (détails, blocage)
- `CardRequestScreen.tsx` — Demander une carte
- `CardPaymentScreen.tsx` — Payer avec une carte

---

## 12. Transferts Internationaux

### Description
Envoi d'argent à l'international vers des comptes bancaires (SWIFT/IBAN), portefeuilles mobiles, ou cartes. Validation par OTP requise.

### Modèle (`InternationalTransfer`)
| Champ | Type | Description |
|-------|------|-------------|
| id | String | PK |
| userId | String | Expéditeur |
| type | String | "wallet" \| "mobile_money" \| "bank" \| "card" \| "merchant" \| "qr_code" |
| recipientName | String | Nom du bénéficiaire |
| recipientPhone | String? | Téléphone |
| recipientAccount | String? | Numéro de compte |
| recipientBank | String? | Banque |
| swiftBic | String? | Code SWIFT/BIC |
| iban | String? | IBAN |
| country | String | Pays de destination |
| currency | String | "USD" par défaut |
| amount | Float | Montant envoyé |
| fee | Float | Frais (0 par défaut) |
| commission | Float | Commission (0 par défaut) |
| exchangeRate | Float? | Taux de change |
| amountReceived | Float? | Montant reçu |
| status | String | "pending" \| "completed" \| "failed" |
| otpVerified | Boolean | false |
| description | String? | |
| createdAt | DateTime | |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/transfers/international` | Historique des transferts |
| POST | `/api/transfers/international` | Initier un transfert |

### Écran
- `InternationalTransferScreen.tsx` — Formulaire de transfert international

---

## 13. Parrainage (Référencement)

### Description
Système de parrainage avec code unique. Chaque utilisateur peut générer un code de parrainage et gagner des récompenses lorsque les personnes parrainées s'inscrivent ou effectuent des transactions.

### Modèle (`ReferralReward`)
| Champ | Type | Description |
|-------|------|-------------|
| id | String | PK |
| userId | String | Bénéficiaire de la récompense |
| referredId | String? | Personne parrainée |
| amount | Float | Montant de la récompense |
| currency | String | "FC" par défaut |
| type | String | "signup" \| "transaction" |
| status | String | "pending" \| "paid" |
| createdAt | DateTime | |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/referral?userId={id}` | Infos parrainage (code, stats, récompenses) |
| POST | `/api/referral` | Générer un code |
| GET | `/api/referral/reward` | Historique des récompenses |

### Écran
- `ReferralScreen.tsx` — Code de parrainage, stats, récompenses, partage

---

## 14. Analytiques

### Description
Tableau de bord analytique personnel : dépenses par catégorie, destinataires fréquents, évolution du solde, transactions par jour.

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/analytics` | Données analytiques de l'utilisateur |

### Données retournées
```json
{
  "success": true,
  "analytics": {
    "totalSentThisMonth": 50000,
    "totalReceivedThisMonth": 30000,
    "spendingByCategory": {
      "transfers": 40000,
      "airtime": 5000,
      "payments": 5000
    },
    "topRecipients": [
      { "id": "...", "phone": "+243...", "name": "Alice", "totalSent": 25000 }
    ],
    "dailyTransactions": [
      { "date": "2026-07-01", "count": 3 }
    ],
    "balanceHistory": [
      { "date": "...", "balance": 15000 }
    ]
  }
}
```

### Écran
- `AnalyticsScreen.tsx` — Graphiques et statistiques

---

## 15. Reçus de Transaction

### Description
Génération de reçus détaillés pour chaque transaction. Affichage avec option de partage et d'impression.

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/receipt?transactionId={id}` | Générer un reçu |

### Écran
- `ReceiptScreen.tsx` — Affichage du reçu avec détails

---

## 16. Paiement par Contact

### Description
Permet de payer un contact du répertoire téléphonique. Recherche d'utilisateur par numéro et envoi d'argent directement.

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/contacts` | Liste des contacts utilisateur |
| GET | `/api/contacts/recent` | Contacts récents (basé sur historique) |

### Écran
- `ContactPayScreen.tsx` — Sélection d'un contact, montant, confirmation PIN

---

## 17. Marketplace

### Description
Place de marché intégrée où les vendeurs publient des produits et les acheteurs peuvent acheter avec leur solde réel ou bonus (y compris achat bonus-only).

### Modèle (`MarketplaceProduct`)
| Champ | Type | Description |
|-------|------|-------------|
| id | String | PK |
| name | String | Nom du produit |
| description | String? | |
| price | Float | Prix |
| currency | String | "USD" par défaut |
| category | String | |
| imageUrl | String? | |
| sellerId | String? | Vendeur |
| active | Boolean | true par défaut |
| bonusEnabled | Boolean | false |
| bonusOnly | Boolean | false |
| bonusPrice | Float? | Prix en bonus |
| bonusMaxQty | Int? | Quantité max avec bonus |
| bonusExpiryAt | DateTime? | Expiration offre bonus |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/marketplace/products` | Lister les produits |
| POST | `/api/marketplace/purchase` | Acheter un produit |

### Écrans
- `MarketplaceScreen.tsx` — Catalogue des produits
- `MarketplaceDetailScreen.tsx` — Détail du produit, achat

---

## 18. Système de Troc (Barter)

### Description
Système d'échange de biens et services entre utilisateurs. Les offres sont publiques, avec messagerie intégrée pour négocier.

### Modèles
**BarterOffer**
| Champ | Type |
|-------|------|
| id, title, description, category, offeredBy, wantedItem?, images?, status ("active" \| "reserved" \| "completed" \| "cancelled"), createdAt, updatedAt |

**BarterChat** — Session de discussion liée à une offre
**BarterChatParticipant** — Participants à une discussion
**BarterMessage** — Messages échangés

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/barter/offers` | Lister / filtrer les offres |
| POST | `/api/barter/offers` | Créer une offre |
| PUT | `/api/barter/offers` | Modifier une offre |
| DELETE | `/api/barter/offers` | Supprimer une offre |
| GET | `/api/barter/chat` | Lister les discussions |
| POST | `/api/barter/chat` | Créer une discussion |
| POST | `/api/barter/chat` | Envoyer un message (action chat dans query) |

### Écrans
- `BarterScreen.tsx` — Liste des offres
- `BarterDetailScreen.tsx` — Détail d'une offre + chat
- `BarterCreateScreen.tsx` — Création d'une offre

---

## 19. Comptes Enfants/Parrainage

### Description
Création de sous-comptes (enfants) liés au compte parent. Le parent peut fixer des limites de solde, créer des cartes pour les enfants, et suivre leurs transactions.

### Champs sur `User`
- `parentId` (String?, auto-référence)
- Limite de solde enfant : 1000 USD / 10 000 000 FC

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/admin/children` | Créer un compte enfant |
| GET | `/api/admin/children` | Lister les comptes enfants |
| POST | `/api/cards/child/create` | Créer une carte enfant |
| GET | `/api/cards/child/list` | Cartes des enfants |
| POST | `/api/cards/child/recharge` | Recharger une carte enfant |

### Écran
- `ChildSponsorshipScreen.tsx` — Gestion des comptes enfants

---

## 20. KYC (Know Your Customer)

### Description
Vérification d'identité par téléchargement de documents (pièce d'identité, selfie). Soumis pour approbation par un administrateur.

### Champs sur `User`
- `kycStatus` — "none" \| "pending" \| "approved" \| "rejected"
- `kycSubmittedAt`, `kycVerifiedAt`, `kycRejectReason`
- `kycDocumentType`, `kycDocumentUrl`, `kycSelfieUrl`, `kycData` (JSON)

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/upload-kyc` | Upload documents KYC |
| GET | `/api/kyc` | Statut KYC |

### Écran
- `KYCVerificationScreen.tsx` — Upload documents + selfie
- `AdminKycScreen.tsx` (admin) — Revue des demandes KYC

---

## 21. Plateforme Développeur (API)

### Description
Programme partenaire API. Les développeurs peuvent s'inscrire, obtenir des clés API (test et production), et intégrer les paiements TRAIT dans leurs applications. Commission automatique sur chaque transaction.

### Modèles
**Developer** — fullName, company?, email, phone, country, appName, projectType, status ("pending" \| "active" \| "suspended"), commissionRate (1.5%)

**DeveloperApiKey** — publicKey (unique), secretKey, webhookUrl?, mode ("test" \| "live"), isActive, expiresAt?

**ApiCommission** — developerId, amount, commission, status ("collected")

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/developers/register` | Inscription développeur |
| GET | `/api/developers` | Profil développeur |
| POST | `/api/developers/send-keys` | Envoi des clés par email |
| POST | `/api/developers/test-payment` | Paiement de test (sandbox) |

### Écrans
- `DeveloperDashboardScreen.tsx` — Tableau de bord développeur
- `DeveloperRegisterScreen.tsx` — Formulaire d'inscription
- `IntegrationGuideScreen.tsx` — Guide d'intégration API

---

## 22. Support Technique (Tickets)

### Description
Système de tickets de support. L'utilisateur peut créer un ticket (catégorie, priorité, message), l'administrateur répond, et l'utilisateur peut suivre la conversation.

### Modèles
**SupportTicket**
| Champ | Type |
|-------|------|
| id, userId, subject, category, message, priority ("low" \| "medium" \| "high"), status ("open" \| "waiting_response" \| "replied" \| "closed"), createdAt, updatedAt |

**SupportMessage**
| Champ | Type |
|-------|------|
| id, ticketId, senderId, message, createdAt |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/support` | Tickets de l'utilisateur |
| POST | `/api/support` | Créer un ticket |
| POST | `/api/support/reply` | Répondre à un ticket |

### Écrans
- `SupportScreen.tsx` — Liste des tickets, création, détail, réponses
- `AdminSupportScreen.tsx` (admin) — Gestion des tickets

---

## 23. Notifications Push

### Description
Notifications push web et mobile via service worker (Web Push API) et Capacitor Push Notifications. Les abonnements sont stockés pour envoi ciblé.

### Modèle (`PushSubscription`)
| Champ | Type |
|-------|------|
| id, userId, endpoint (unique), p256dh, auth, createdAt |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/notifications/push` | S'abonner aux notifications push |
| DELETE | `/api/notifications/push` | Se désabonner |
| POST | `/api/notifications/push/test` | Notification de test |

### Script
- `scripts/send-update-push.js` — Envoi de notification de mise à jour à tous les utilisateurs

---

## 24. Système de Bonus

### Description
Système de récompenses et campagnes promotionnelles. Les utilisateurs reçoivent des bonus (montant en USD et FC) qui peuvent être utilisés pour les transactions et les achats marketplace. Les administrateurs peuvent créer des campagnes.

### Modèles
**BonusCampaign**
| Champ | Type |
|-------|------|
| id, name, description?, bonusAmount, currency ("USD"), targetUsers ("all" \| "specific"), targetUserIds?, status ("active" \| "completed"), maxDistributions?, currentCount, startDate, endDate?, adminId |

**BonusHistory** — Historique des transactions de bonus

### Routes API (6 routes)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/bonus/user` | Infos bonus de l'utilisateur |
| GET | `/api/bonus/history` | Historique des bonus |
| GET | `/api/bonus/stats` | Statistiques des bonus |
| POST | `/api/bonus/adjust` | Ajuster le bonus d'un utilisateur (admin) |
| POST | `/api/bonus/block` | Bloquer/débloquer l'utilisation du bonus |
| GET/POST | `/api/bonus/campaigns` | Gestion des campagnes (admin) |

---

## 25. Comptes Fournisseur (Seller)

### Description
Les commerçants peuvent s'inscrire en tant que "Service" (fournisseur), gérer leurs produits, et accepter les paiements via QR code.

### Champs sur `User`
- `businessName`, `businessType`, `location`, `address`

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/seller/register` | Inscription fournisseur |
| GET | `/api/seller/products` | Produits du fournisseur |
| POST | `/api/seller/products` | Ajouter/modifier un produit |

### Écrans
- `SellerRegisterScreen.tsx` — Formulaire d'inscription (12 champs)
- `SellerDashboard.tsx` — Tableau de bord fournisseur
- `SellerProductsScreen.tsx` — Gestion des produits
- `SellerPendingScreen.tsx` — Attente de validation
- `SellerQRScannerScreen.tsx` — Scan de QR pour paiements

---

## 26. Paiement de Recharge (Airtime Direct)

### Description
Achat direct de crédit de communication (airtime) auprès des opérateurs. Différent du catalogue bundles, celui-ci permet un achat simple par montant et réseau.

### Modèle (`CreditPurchase`)
| Champ | Type |
|-------|------|
| id, userId, network, phoneNumber, amount, currency ("USD"), status ("completed"), createdAt |

### Routes API
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/bills/pay` | Achat de crédit (via bills) |

---

## 27. Services Agent

### Description
Les agents TRAIT peuvent effectuer des dépôts et valider des retraits pour les clients qui n'ont pas de compte ou qui préfèrent le cash.

### Routes API (7 routes)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/agent/deposit` | Dépôts effectués par l'agent |
| POST | `/api/agent/deposit` | Effectuer un dépôt |
| GET | `/api/agent/pending-withdrawals` | Retraits en attente de validation |
| POST | `/api/agent/validate-withdrawal` | Valider un retrait |
| GET | `/api/agent/lookup?phone={phone}` | Rechercher un client |
| GET | `/api/agent/activity` | Activité récente de l'agent |
| GET | `/api/agent/withdrawal/[id]` | Détails d'un retrait |

### Écrans
- `AgentDashboardScreen.tsx` — Tableau de bord agent
- `AgentDepositScreen.tsx` — Dépôt client
- `AgentWithdrawValidateScreen.tsx` — Validation de retrait
- `AgentActivityScreen.tsx` — Activité
- `AgentMessagesScreen.tsx` — Messages de l'admin

---

## Notes Techniques

### Stack utilisé
- **Framework** : Next.js 16 (App Router) + Turbopack
- **Base de données** : PostgreSQL via Prisma ORM
- **Mobile** : Capacitor v8 (Android APK)
- **Auth** : JWT + OTP + PIN + Biometrics + 2FA (TOTP)
- **État** : Zustand v5 (persisted)
- **UI** : Tailwind CSS v4 + shadcn/ui
- **Notifications** : Web Push API + Capacitor Push Notifications
- **Temps réel** : Socket.IO
- **Internationalisation** : next-intl

### Dépendances clés
- zod — Validation des schémas
- jose — JWT (signing/verification)
- bcryptjs — Hachage des mots de passe
- nodemailer — Envoi d'emails (SMTP Gmail)
- web-push — Notifications push web

### Sécurité
- Rate limiting sur les routes sensibles (login, OTP)
- Cookies HTTP-only pour les tokens JWT
- PIN à 4-6 chiffres pour les transactions
- OTP à 6 chiffres pour validation email/phone
- Logs de sécurité (SecurityLog)
- Hachage bcrypt des mots de passe et PIN
