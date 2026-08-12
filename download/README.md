# TRAIT — Application fintech mobile/web

Ce dépôt contient une application de services financiers et commerciaux nommée TRAIT. Il s'agit d'une plateforme multi-rôles permettant à des clients, agents, vendeurs, administrateurs et développeurs de gérer un portefeuille numérique, des paiements, des transferts, des achats et des opérations de sécurité depuis une interface unique.

Le projet est construit avec Next.js, React, Tailwind CSS, Prisma et une base PostgreSQL. Il intègre aussi une version Android via Capacitor, ainsi que des fonctionnalités de notifications, de QR Code, de KYC et de PWA.

## Objet du projet

TRAIT est conçu pour couvrir le parcours complet d'une solution fintech moderne :

- créer un compte utilisateur
- vérifier son identité
- recharger son portefeuille
- envoyer de l'argent
- retirer de l'argent
- payer des biens et services
- acheter dans un marketplace
- participer à des échanges de troc
- gérer des cartes de paiement
- suivre l'historique et les notifications
- administrer les utilisateurs, agents et transactions

En résumé, c'est une application de banque mobile / wallet / super-app pour des opérations de paiement et de gestion de compte.

## Rôles et usages

### 1) Client
Le client utilise TRAIT comme un portefeuille mobile complet.

Fonctionnalités principales :
- accueil avec solde et actions rapides
- inscription et connexion par téléphone, OTP et PIN
- dépôt d'argent via mobile money, banque, carte ou agent
- retrait via agent ou code de retrait
- transfert local et international
- paiements QR / paiement à un contact / demandes de paiement
- suivi d'historique de transactions
- vérification KYC
- carte TRAIT et paiements associés
- marketplace, troc, factures, micro-crédit, épargne, parrainage
- notifications, support et paramètres

### 2) Agent TRAIT
Les agents accompagnent les clients dans les opérations physiques et de validation.

Fonctionnalités principales :
- tableau de bord agent
- dépôt client
- validation des retraits
- historique d'activités
- gestion des messages et validation des comptes
- aide à la distribution d'argent et au support clientèle

### 3) Vendeur / Marchand
Le vendeur utilise TRAIT pour vendre et recevoir des paiements.

Fonctionnalités principales :
- tableau de bord vendeur
- gestion des produits
- scanner QR Code
- confirmation de paiement
- suivi des ventes et des encaissements

### 4) Administrateur
L'admin supervise la plateforme et les comportements de sécurité.

Fonctionnalités principales :
- tableau de bord global
- gestion des utilisateurs, agents, transactions, ventes, KYC
- validation d'agents et de vendeurs
- gestion des messages clients
- gestion des bonus, campagnes et notifications
- supervision des achats sur la marketplace et du troc
- journalisation d'activités et contrôle du système

### 5) Développeur / intégration
La plateforme inclut aussi un espace développeur pour intégration d'API et gestion des liens de paiement.

## Interfaces utilisateur principales

Le projet contient une grande variété d'écrans et d'interface, notamment :

### Authentification et onboarding
- WelcomeScreen
- AuthRoleScreen
- AuthPhoneScreen
- AuthLoginScreen
- AuthOtpScreen
- AuthProfileScreen
- PinSetupScreen
- PinVerifyScreen
- OnboardingScreen
- ForgotPasswordScreen
- AuthScreen
- TwoFactorScreen
- ChangePinScreen

### Espace client
- HomeScreen
- SendScreen
- WithdrawScreen
- DepositScreen
- HistoryScreen
- USSDScreen
- NotificationsScreen
- SettingsScreen
- ProfileScreen
- SupportScreen
- MyQrCodeScreen
- ReceiptScreen
- ContactPayScreen

### Finance / paiement / marché
- PaymentLinksScreen
- PaymentRequestScreen
- RecurringPaymentsScreen
- BundleCatalogScreen
- BillsScreen
- MicroCreditScreen
- SavingsGoalsScreen
- ReferralScreen
- AnalyticsScreen
- InternationalTransferScreen

### Marketplace et troc
- MarketplaceScreen
- MarketplaceDetailScreen
- BarterScreen
- BarterDetailScreen
- BarterCreateScreen

### Cartes / KYC / sécurité
- CardRequestScreen
- CardPaymentScreen
- CardScreen
- KYCVerificationScreen
- ChildSponsorshipScreen
- IntegrationGuideScreen

### Espace agent
- AgentDashboardScreen
- AgentDepositScreen
- AgentWithdrawValidateScreen
- AgentActivityScreen
- AgentMessagesScreen
- AgentRegisterScreen
- AgentPendingScreen

### Espace vendeur
- SellerRegisterScreen
- SellerPendingScreen
- SellerDashboard
- SellerProductsScreen
- SellerQRScannerScreen

### Espace admin
- AdminLoginScreen
- AdminDashboard
- AdminUsersScreen
- AdminAgentsScreen
- AdminTransactionsScreen
- AdminMarketScreen
- AdminBarterScreen
- AdminNotificationsScreen
- AdminActivityLogScreen
- AdminBonusScreen
- AdminBonusAdjustScreen
- AdminBonusHistoryScreen
- AdminBonusCampaignsScreen
- AdminAgentValidationScreen
- AdminMessagesScreen
- AdminDevelopersScreen
- AdminCardRequestsScreen
- AdminCardsScreen
- AdminClientMessagesScreen
- AdminSellerValidationScreen
- AdminSellersScreen
- AdminChildrenScreen
- AdminKycScreen
- AdminSupportScreen

### Développeur / intégration
- DeveloperDashboardScreen
- DeveloperRegisterScreen

## Fonctionnalités transverses

- portefeuille multi-devise (USD / FC)
- solde réel et solde bonus
- frais automatiques sur les transactions
- sécurité par PIN, 2FA et logs de sécurité
- notifications push et messages internes
- KYC avec document et selfie
- QR Code pour paiements et cartes
- support, assistance et historique détaillé
- accessibilité mobile via PWA / Capacitor
- architecture orientée API et données centralisées

## Stack technique

- Frontend : Next.js, React 19, TypeScript, Tailwind CSS
- UI : Shadcn UI, Radix UI, Framer Motion, Lucide icons
- Backend API : routes Next.js API
- Base de données : PostgreSQL via Prisma ORM
- Authentification : NextAuth / système personnalisé de login + PIN
- Notifications : push notifications, realtime, Socket.io
- Mobile : Capacitor Android
- Sécurité : validation KYC, 2FA, logs, gestion des suspensions

## Exemple de parcours utilisateur

1. Un client s'inscrit et crée son compte.
2. Il configure un PIN et valide son profil.
3. Il dépose de l'argent sur son portefeuille.
4. Il vérifie son identité via KYC.
5. Il envoie un transfert, paie un service ou achète un produit.
6. Il consulte son historique et reçoit des notifications.
7. Un agent ou un vendeur peut ensuite traiter ses demandes ou paiements.

## Conclusion

TRAIT est une application fintech complète, pensée comme une super-app de gestion financière et commerciale. Elle couvre à la fois les besoins d'un client mobile, d'un agent de terrain, d'un vendeur et d'un administrateur système, dans une même plateforme.

Le dépôt est donc bien plus qu'une simple interface bancaire : c'est un écosystème de paiement, de monnaie digitale, de sécurité, de gestion commerciale et d'administration centralisée.
