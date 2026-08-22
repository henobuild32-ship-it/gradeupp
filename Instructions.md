Tu es l'IA chargée d'auditer, corriger, compléter, connecter et finaliser intégralement l'application **TRAIT**.

Le dépôt contient une application fintech mobile/web construite avec :

- Next.js
- React 19
- TypeScript
- Tailwind CSS
- Shadcn UI
- Radix UI
- Framer Motion
- Lucide
- Prisma ORM
- PostgreSQL
- NextAuth / système d'authentification personnalisé
- Socket.io / temps réel
- Push Notifications
- PWA
- Capacitor Android

Ta mission n'est PAS uniquement de modifier l'interface.

Tu dois faire fonctionner **l'ensemble du produit**, de l'authentification jusqu'aux transactions, en passant par les API, la base PostgreSQL, les notifications, la sécurité, les rôles, les interfaces web/PWA et l'application Android Capacitor.

---

# 2. RÈGLE ABSOLUE : NE RIEN CASSER

Avant toute modification :

1. Lire l'architecture complète du projet.
2. Identifier le framework et les versions réellement utilisées.
3. Examiner `package.json`.
4. Examiner la configuration Next.js.
5. Examiner Prisma et le schéma PostgreSQL.
6. Examiner toutes les routes API.
7. Examiner les systèmes d'authentification.
8. Examiner les middlewares.
9. Examiner les guards de rôles.
10. Examiner les stores/contextes/hooks.
11. Examiner les composants communs.
12. Examiner la configuration Capacitor.
13. Examiner les variables d'environnement.
14. Examiner les notifications.
15. Examiner les WebSockets / Socket.io.
16. Examiner les services externes.
17. Examiner les migrations Prisma.
18. Examiner les erreurs TypeScript.
19. Examiner les erreurs runtime.
20. Examiner les erreurs de build.

Ne pas supprimer une fonctionnalité existante simplement parce qu'elle présente une erreur.

Ne pas créer de fausses données pour masquer une fonctionnalité cassée.

Ne pas mettre de `TODO`, `FIXME`, `coming soon`, écran vide ou bouton sans logique à la place d'une fonctionnalité.

---

# 3. PROBLÈME CRITIQUE À CORRIGER

## ERREUR : "Non authentifié"

Certaines ou toutes les fonctionnalités/modules peuvent actuellement afficher :

> Non authentifié

alors que l'utilisateur est connecté.

Cette situation doit être entièrement corrigée.

### Règle

Après une authentification réussie :

- la session doit être réellement créée ;
- le token/session doit être conservé correctement ;
- le frontend doit pouvoir récupérer l'utilisateur connecté ;
- les appels API doivent transmettre les informations d'authentification nécessaires ;
- les routes API doivent correctement reconnaître la session ;
- les guards doivent reconnaître le rôle de l'utilisateur ;
- les pages protégées doivent être accessibles ;
- les données de l'utilisateur doivent être chargées ;
- les modules doivent fonctionner sans afficher inutilement "Non authentifié".

---

# 4. AUDIT COMPLET DE L'AUTHENTIFICATION

Inspecter et corriger :

- Login
- Register
- OTP
- PIN
- 2FA
- Session
- Cookies
- JWT
- NextAuth
- Auth middleware
- API authentication
- Role authorization
- User context
- Zustand / Context / stores
- localStorage/sessionStorage si utilisés
- Capacitor storage
- Android WebView
- API requests
- CORS
- HTTPS
- production URLs

Créer une architecture d'authentification cohérente.

## Vérification obligatoire

Tester réellement :

```text
Inscription
→ Connexion
→ Création de session
→ Récupération du profil
→ Accès Dashboard
→ Appel API authentifié
→ Accès module protégé
→ Actualisation de page
→ Session conservée
→ Déconnexion
→ Session détruite
→ Accès protégé refusé
5. NE PAS CONTOURNER LA SÉCURITÉ

Ne jamais résoudre "Non authentifié" en supprimant les protections.

Ne pas faire :

if (!session) return true;

uniquement pour faire fonctionner l'interface.

Ne pas supprimer les middlewares.

Ne pas rendre les routes privées publiques.

Ne pas mettre un utilisateur fictif.

Ne pas utiliser un token fixe.

Ne pas utiliser un compte administrateur codé en dur.

La correction doit être réelle.

6. SYSTÈME DE RÔLES

Les rôles doivent être correctement séparés.

Client

Accès uniquement aux fonctionnalités client.

Agent

Accès uniquement aux fonctionnalités agent autorisées.

Vendeur

Accès uniquement aux fonctionnalités vendeur autorisées.

Administrateur

Accès aux fonctionnalités d'administration.

Développeur

Accès à l'espace développeur et aux fonctionnalités d'intégration autorisées.

Chaque API doit également vérifier le rôle côté serveur.

Ne jamais faire confiance uniquement au frontend.

7. MODULES CLIENT À RENDRE OPÉRATIONNELS

Vérifier et faire fonctionner complètement :

HomeScreen
SendScreen
WithdrawScreen
DepositScreen
HistoryScreen
USSDScreen
NotificationsScreen
SettingsScreen
ProfileScreen
SupportScreen
MyQrCodeScreen
ReceiptScreen
ContactPayScreen

Chaque écran doit :

charger les données réelles ;
afficher un état de chargement ;
gérer les erreurs ;
utiliser les API réelles ;
respecter l'authentification ;
respecter les permissions ;
être responsive ;
fonctionner sur mobile ;
fonctionner sur desktop ;
fonctionner dans l'APK.
8. MODULES FINANCIERS

Faire fonctionner complètement :

PaymentLinksScreen
PaymentRequestScreen
RecurringPaymentsScreen
BundleCatalogScreen
BillsScreen
MicroCreditScreen
SavingsGoalsScreen
ReferralScreen
AnalyticsScreen
InternationalTransferScreen

Chaque opération financière doit avoir :

Validation frontend.
Validation backend.
Vérification de session.
Vérification du rôle.
Vérification du solde.
Calcul des frais.
Transaction PostgreSQL atomique.
Création de l'historique.
Création de notification.
Gestion des erreurs.
Confirmation utilisateur.
Reçu si nécessaire.
9. PORTEFEUILLE

Le wallet doit être réellement fonctionnel.

Support :

USD
FC

Gérer séparément :

solde disponible ;
solde bonus ;
transactions ;
frais ;
dépôts ;
retraits ;
transferts ;
paiements.

Les calculs financiers doivent être réalisés côté serveur.

Ne jamais faire confiance à un montant envoyé par le frontend.

10. TRANSACTIONS

Chaque transaction doit avoir au minimum :

identifiant unique ;
utilisateur ;
type ;
montant ;
devise ;
frais ;
montant final ;
statut ;
référence ;
date ;
description ;
contrepartie si applicable ;
métadonnées nécessaires.

Les états doivent être cohérents :

PENDING
SUCCESS
FAILED
CANCELLED
REVERSED

Éviter les doubles transactions.

Une requête répétée ne doit pas débiter deux fois le même portefeuille.

Utiliser des mécanismes d'idempotence lorsque nécessaire.

11. DÉPÔT

Faire fonctionner :

Mobile Money
Banque
Carte
Agent

Si une intégration externe n'est pas encore disponible, construire une architecture propre permettant son branchement futur.

Ne jamais simuler une transaction comme réussie si aucun paiement réel n'a été confirmé.

12. RETRAIT

Faire fonctionner :

retrait via agent ;
code de retrait ;
validation ;
expiration du code ;
confirmation ;
débit du portefeuille ;
historique ;
notification.

Les opérations sensibles doivent être confirmées côté serveur.

13. TRANSFERTS

Faire fonctionner :

transfert entre utilisateurs ;
transfert local ;
transfert international si l'intégration est disponible ;
vérification du destinataire ;
frais ;
confirmation ;
historique ;
notification.

Prévenir :

solde insuffisant ;
destinataire inexistant ;
montant invalide ;
devise invalide ;
compte suspendu ;
double soumission.
14. QR CODE

Faire fonctionner :

génération du QR utilisateur ;
lecture du QR ;
paiement via QR ;
vérification du destinataire ;
montant ;
confirmation ;
transaction ;
reçu.

Le QR ne doit jamais permettre de contourner les contrôles serveur.

15. KYC

Faire fonctionner :

KYCVerificationScreen
upload document ;
selfie ;
informations personnelles ;
statut KYC ;
validation admin ;
refus ;
demande de correction ;
notification du changement de statut.

Statuts recommandés :

NOT_STARTED
PENDING
VERIFIED
REJECTED
NEEDS_CORRECTION

Les documents doivent être protégés.

16. CARTES

Faire fonctionner :

CardRequestScreen
CardPaymentScreen
CardScreen

Gérer :

demande ;
statut ;
activation ;
blocage ;
historique ;
paiements ;
notifications.

Ne jamais afficher de données sensibles complètes inutilement.

17. MARKETPLACE

Faire fonctionner :

MarketplaceScreen
MarketplaceDetailScreen

Fonctionnalités :

liste des produits ;
recherche ;
catégories ;
détails ;
prix ;
vendeur ;
achat ;
historique ;
notifications ;
statut de commande.

Les stocks et prix doivent être vérifiés côté serveur au moment de l'achat.

18. TROC

Faire fonctionner :

BarterScreen
BarterDetailScreen
BarterCreateScreen

Gérer :

création d'offre ;
proposition ;
acceptation ;
refus ;
annulation ;
statut ;
notifications ;
historique.
19. AGENTS

Faire fonctionner complètement :

AgentDashboardScreen
AgentDepositScreen
AgentWithdrawValidateScreen
AgentActivityScreen
AgentMessagesScreen
AgentRegisterScreen
AgentPendingScreen

Les opérations agent doivent vérifier :

identité ;
statut de validation ;
permissions ;
disponibilité ;
limites ;
historique.
20. VENDEURS

Faire fonctionner :

SellerRegisterScreen
SellerPendingScreen
SellerDashboard
SellerProductsScreen
SellerQRScannerScreen

Gérer :

inscription ;
validation ;
produits ;
prix ;
stocks ;
QR ;
paiements ;
ventes ;
historique ;
notifications.
21. ADMINISTRATION

Faire fonctionner :

AdminLoginScreen
AdminDashboard
AdminUsersScreen
AdminAgentsScreen
AdminTransactionsScreen
AdminMarketScreen
AdminBarterScreen
AdminNotificationsScreen
AdminActivityLogScreen
AdminBonusScreen
AdminBonusAdjustScreen
AdminBonusHistoryScreen
AdminBonusCampaignsScreen
AdminAgentValidationScreen
AdminMessagesScreen
AdminDevelopersScreen
AdminCardRequestsScreen
AdminCardsScreen
AdminClientMessagesScreen
AdminSellerValidationScreen
AdminSellersScreen
AdminChildrenScreen
AdminKycScreen
AdminSupportScreen

L'admin doit pouvoir gérer réellement les données.

Chaque action administrative importante doit être journalisée.

22. BONUS

Faire fonctionner :

solde bonus ;
ajustement ;
historique ;
campagnes ;
attribution ;
retrait/consommation selon les règles définies.

Toute modification manuelle d'un bonus doit laisser une trace.

23. NOTIFICATIONS

Le système de notifications doit être entièrement fonctionnel.

Types :

notification de bienvenue ;
connexion ;
transaction ;
dépôt ;
retrait ;
transfert ;
paiement ;
KYC ;
validation ;
refus ;
achat ;
vente ;
sécurité ;
messages ;
campagnes ;
support.

Lorsqu'une fonctionnalité crée un événement important :

Action
→ Enregistrement DB
→ Notification interne
→ Push notification si disponible
→ Mise à jour temps réel si disponible
Permission de notification

Sur Android :

Vérifier la permission.
Demander l'autorisation si nécessaire.
Enregistrer le token push.
Associer le token à l'utilisateur.
Envoyer la notification.
Gérer les tokens invalides.

L'application ne doit pas planter si l'utilisateur refuse les notifications.

24. SOCKET.IO / REALTIME

Vérifier :

connexion ;
authentification ;
reconnexion ;
déconnexion ;
événements ;
notifications ;
messages ;
mise à jour des transactions.

Éviter les connexions multiples inutiles.

Nettoyer correctement les listeners.

25. BASE POSTGRESQL + PRISMA

Auditer complètement :

prisma/schema.prisma
prisma/migrations/

Vérifier :

relations ;
contraintes ;
indexes ;
unique ;
foreign keys ;
enums ;
types ;
timestamps ;
cascade ;
transactions.

La base PostgreSQL doit être la source de vérité.

Corriger les incohérences entre :

Frontend
API
Prisma
PostgreSQL

Ne pas supprimer les données existantes sans nécessité.

26. API

Auditer toutes les routes API.

Pour chaque endpoint :

méthode HTTP correcte ;
authentification ;
autorisation ;
validation ;
traitement ;
DB ;
erreurs ;
réponse JSON cohérente ;
codes HTTP corrects.

Format d'erreur cohérent :

{
  "success": false,
  "message": "Message explicite",
  "code": "ERROR_CODE"
}

Format de succès :

{
  "success": true,
  "data": {}
}
27. GESTION DES ERREURS

Ne jamais afficher des erreurs techniques brutes à l'utilisateur.

Mauvais :

PrismaClientKnownRequestError

Correct :

Impossible de terminer l'opération. Veuillez réessayer.

Mais les erreurs techniques doivent rester disponibles dans les logs développeur.

28. FRONTEND

Toutes les interfaces doivent être :

responsive ;
propres ;
cohérentes ;
accessibles ;
rapides ;
sans débordement ;
sans boutons inutilisables ;
sans texte coupé ;
sans écran blanc ;
sans erreurs console inutiles.

Tester :

petit téléphone ;
grand téléphone ;
tablette ;
ordinateur.
29. ÉTATS UI

Chaque écran connecté doit gérer :

Loading
Success
Empty
Error
Unauthorized
Forbidden
Offline

Ne pas afficher "Non authentifié" pendant un simple chargement de session.

Utiliser une séquence similaire :

Session loading
↓
Session resolved
↓
Authenticated ?
↓
YES → charger les données
NO → rediriger vers login
30. APK ANDROID / CAPACITOR

L'application doit fonctionner correctement dans l'APK.

Vérifier :

Capacitor ;
AndroidManifest ;
permissions ;
réseau ;
HTTPS ;
API URL ;
Socket URL ;
notifications ;
stockage ;
caméra ;
QR scanner ;
fichiers ;
deep links si utilisés ;
splash screen ;
icône ;
navigation ;
authentification ;
session ;
retour Android ;
clavier ;
WebView.

Attention particulière aux URLs.

Une configuration du type :

NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3000

ne doit PAS être utilisée comme URL d'API distante dans l'APK de production.

127.0.0.1 dans l'APK désigne l'appareil lui-même, pas le serveur.

Utiliser les véritables URLs HTTPS de production.

31. PWA

Vérifier :

manifest ;
service worker ;
icônes ;
installation ;
offline fallback ;
cache ;
mise à jour ;
notifications ;
responsive.

Éviter de mettre en cache des informations financières sensibles de manière dangereuse.

32. VARIABLES D'ENVIRONNEMENT

Auditer toutes les variables.

Identifier clairement :

DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_SOCKET_URL=

ainsi que toutes les clés externes réellement utilisées.

Ne jamais exposer une clé secrète dans une variable NEXT_PUBLIC_*.

Créer/maintenir un .env.example propre.

33. SÉCURITÉ

Auditer :

authentification ;
autorisation ;
PIN ;
2FA ;
sessions ;
cookies ;
CSRF ;
CORS ;
validation des entrées ;
rate limiting si nécessaire ;
SQL injection ;
XSS ;
IDOR ;
upload de fichiers ;
permissions ;
logs ;
secrets.

Les opérations financières sensibles doivent être vérifiées côté serveur.

34. SUPPORT ET MESSAGERIE

Faire fonctionner :

SupportScreen
AdminSupportScreen
AdminMessagesScreen
AdminClientMessagesScreen
AgentMessagesScreen

Les messages doivent avoir :

auteur ;
destinataire ;
contenu ;
statut ;
date ;
lecture/non-lu.

Ajouter les notifications correspondantes.

35. HISTORIQUE

HistoryScreen doit afficher les transactions réelles.

Fonctions :

filtrage ;
recherche ;
type ;
devise ;
statut ;
date ;
détails ;
reçu.

ReceiptScreen doit générer un reçu cohérent avec la transaction réelle.

36. TESTS

Après les corrections, exécuter au minimum :

npm install
npm run lint
npm run typecheck
npm run build

Si les scripts diffèrent, identifier les scripts réels dans package.json.

Tester également :

Authentication
Authorization
Client
Agent
Seller
Admin
Developer
Wallet
Deposit
Withdraw
Transfer
Payment
QR
KYC
Cards
Marketplace
Barter
Notifications
Support
Realtime
PWA
Android
37. TESTS DE NON-RÉGRESSION

Créer ou corriger les tests nécessaires.

Tester notamment :

Utilisateur non connecté
→ accès refusé

Utilisateur connecté
→ accès autorisé

Client
→ accès admin refusé

Agent
→ accès admin refusé

Vendeur
→ accès client/admin refusé selon permissions

Admin
→ accès administration autorisé

Session expirée
→ reconnexion demandée

Utilisateur suspendu
→ opérations bloquées

Solde insuffisant
→ transaction refusée

Transaction répétée
→ pas de double débit
38. VÉRIFICATION DE CHAQUE INTERFACE

Créer une checklist de toutes les interfaces du dépôt.

Pour chaque interface :

[ ] Page accessible
[ ] Authentification correcte
[ ] Autorisation correcte
[ ] API connectée
[ ] Données réelles
[ ] Loading
[ ] Empty state
[ ] Error state
[ ] Actions fonctionnelles
[ ] Notifications
[ ] Responsive
[ ] Android
[ ] Console propre

Aucune interface ne doit être considérée comme terminée uniquement parce qu'elle s'affiche.

39. DÉTECTION DES FAUSSES FONCTIONNALITÉS

Rechercher dans tout le projet :

TODO
FIXME
coming soon
Not implemented
Non authentifié
Unauthorized
console.log
mock
dummy
fake
placeholder
setTimeout
alert(
return null
return []
return {}

Pour chaque résultat :

Déterminer s'il est volontaire.
S'il correspond à une vraie fonctionnalité, la connecter.
Supprimer les mocks inutiles.
Ne pas supprimer un fallback légitime sans le remplacer.
40. NETTOYAGE DU CODE

Corriger :

erreurs TypeScript ;
imports inutilisés ;
composants morts ;
routes mortes ;
API mortes ;
appels incohérents ;
types incohérents ;
doublons ;
erreurs React ;
problèmes de hydration ;
problèmes Prisma ;
problèmes de session.

Ne pas refactorer massivement sans nécessité.

Priorité :

Fonctionnement
→ Sécurité
→ Cohérence
→ Stabilité
→ Performance
→ Nettoyage
41. PERFORMANCE

Optimiser uniquement après avoir rendu les fonctionnalités stables.

Vérifier :

appels API inutiles ;
requêtes DB ;
N+1 queries ;
re-renders ;
images ;
bundles ;
listeners Socket.io ;
polling ;
chargement des pages.
42. MODE PRODUCTION

L'application doit être prête pour une vraie compilation de production.

Vérifier :

npm run build

Puis vérifier que :

les variables d'environnement sont correctes ;
PostgreSQL est accessible ;
Prisma fonctionne ;
les migrations sont appliquées ;
les API fonctionnent ;
l'auth fonctionne ;
les notifications fonctionnent ;
les URLs sont correctes ;
l'APK utilise les URLs de production.
43. MIGRATIONS PRISMA

Ne pas modifier directement la production de manière destructive.

Avant migration :

Vérifier le schéma.
Vérifier l'état des migrations.
Identifier le drift.
Vérifier les données existantes.
Préparer une migration propre.

Après migration :

npx prisma generate

et appliquer les migrations avec la procédure adaptée à l'environnement.

44. DONNÉES RÉELLES

Toutes les fonctionnalités principales doivent fonctionner avec les données PostgreSQL réelles.

Ne pas utiliser :

fake balance
fake transaction
fake user
fake payment
fake notification
fake KYC

pour donner l'impression que le système fonctionne.

Les mocks ne doivent être utilisés que dans les tests.

45. LOGS

Ajouter des logs utiles côté serveur pour :

authentification ;
transactions ;
erreurs ;
webhooks ;
notifications ;
actions administratives ;
erreurs externes.

Ne jamais logger :

mot de passe ;
PIN ;
token secret ;
données de carte sensibles ;
documents KYC complets.
46. WEBHOOKS ET SERVICES EXTERNES

Pour chaque service externe :

Vérifier la configuration.
Vérifier les credentials.
Vérifier les URLs.
Vérifier les callbacks.
Vérifier les webhooks.
Vérifier les signatures.
Gérer les erreurs.
Gérer les retries.
Empêcher les doubles traitements.

Une transaction externe ne doit être considérée comme réussie que si le système externe confirme réellement son succès.

47. AJOUT DE NOUVELLES FONCTIONNALITÉS

Quand je demande une nouvelle fonctionnalité :

Comprendre exactement le besoin.
Vérifier l'architecture existante.
Vérifier les modèles Prisma nécessaires.
Vérifier les API nécessaires.
Vérifier l'authentification.
Vérifier les rôles.
Créer/modifier le backend.
Créer/modifier le frontend.
Ajouter les notifications.
Ajouter les validations.
Ajouter les états d'erreur.
Ajouter les migrations si nécessaires.
Ajouter les tests.
Vérifier PWA.
Vérifier Android.
Vérifier le build.

Une fonctionnalité n'est terminée que lorsqu'elle fonctionne de bout en bout.

48. MÉTHODE DE TRAVAIL OBLIGATOIRE

Toujours travailler dans cet ordre :

PHASE 1 — ANALYSE

Lire le projet.

Ne rien modifier immédiatement.

Identifier :

architecture ;
problèmes ;
dépendances ;
auth ;
DB ;
API ;
interfaces ;
Android ;
PWA.
PHASE 2 — AUTHENTIFICATION

Résoudre définitivement :

Non authentifié

PHASE 3 — BACKEND

Corriger les API et Prisma.

PHASE 4 — FRONTEND

Connecter toutes les interfaces aux vraies API.

PHASE 5 — NOTIFICATIONS

Corriger notifications internes, push et realtime.

PHASE 6 — RÔLES

Tester Client / Agent / Seller / Admin / Developer.

PHASE 7 — FINANCE

Tester wallet, dépôts, retraits, transferts, paiements et frais.

PHASE 8 — MODULES

Marketplace, troc, cartes, KYC, support, etc.

PHASE 9 — ANDROID

Tester l'application Capacitor.

PHASE 10 — PRODUCTION

Build final + vérification complète.

49. RAPPORT FINAL OBLIGATOIRE

À la fin du travail, fournir un rapport clair :

TRAIT — RAPPORT DE FINALISATION

AUTHENTIFICATION
✅ Corrigé

CLIENT
✅ Corrigé

AGENT
✅ Corrigé

VENDEUR
✅ Corrigé

ADMIN
✅ Corrigé

DEVELOPPEUR
✅ Corrigé

WALLET
✅ Corrigé

TRANSACTIONS
✅ Corrigé

KYC
✅ Corrigé

CARTES
✅ Corrigé

MARKETPLACE
✅ Corrigé

TROC
✅ Corrigé

NOTIFICATIONS
✅ Corrigé

SOCKET / REALTIME
✅ Corrigé

PWA
✅ Corrigé

ANDROID / APK
✅ Corrigé

POSTGRESQL
✅ Corrigé

PRISMA
✅ Corrigé

BUILD
✅ Réussi

Pour chaque problème non résolu, indiquer précisément :

PROBLÈME
CAUSE
FICHIER
SOLUTION POSSIBLE
BLOCAGE EXTERNE éventuel

Ne jamais déclarer une fonctionnalité "fonctionnelle" simplement parce qu'elle compile.

50. CRITÈRE FINAL DE RÉUSSITE

TRAIT doit arriver à cet état :

Utilisateur
    ↓
Inscription
    ↓
OTP
    ↓
PIN
    ↓
Session
    ↓
Dashboard
    ↓
API authentifiées
    ↓
PostgreSQL
    ↓
Opération
    ↓
Validation serveur
    ↓
Transaction
    ↓
Historique
    ↓
Notification
    ↓
Realtime
    ↓
Reçu

Et le même système doit fonctionner sur :

Web
PWA
Android APK

avec la même logique métier et les mêmes données.

51. RÈGLE FINALE

Ne considère jamais TRAIT comme terminé uniquement parce que :

l'écran s'affiche ;
le bouton fonctionne visuellement ;
le build passe ;
une donnée mock apparaît ;
une API répond 200;
l'erreur "Non authentifié" a simplement été masquée.

TRAIT doit fonctionner réellement de bout en bout.

Objectif final : une application TRAIT stable, cohérente, sécurisée, connectée à PostgreSQL, authentifiée correctement, fonctionnelle sur Web/PWA/Android, avec tous les modules opérationnels et aucune fonctionnalité principale laissée en état fictif ou inachevé.