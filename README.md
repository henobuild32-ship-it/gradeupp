# TRAIT

TRAIT est une application fintech mobile/web de gestion de wallet, de paiements, de transferts et de services financiers, pensée pour le marché francophone et panafricain. Elle combine une interface client moderne, des flux de vérification OTP, des notifications push, un tableau de bord agent/admin, et des fonctionnalités e-commerce/commerce local.

## Ce que fait l'application

TRAIT permet à un utilisateur de :

- créer un compte avec inscription par téléphone/email
- vérifier son identité via code OTP envoyé par email
- gérer un solde réel et un solde bonus
- envoyer de l'argent, faire des transferts et organiser des paiements
- demander ou émettre des liens de paiement
- consulter son historique de transactions
- gérer ses objectifs d'épargne et ses microcrédits
- utiliser des services de factures, bundles, cartes, etc.
- recevoir des notifications en temps réel et des alertes push
- visiter un marketplace et un module de troc/barter
- accéder à une partie admin/agent pour la validation et la supervision

## Stack technique

- Next.js 16
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL / Supabase
- Nodemailer pour les emails OTP
- Web Push / Service Worker pour les notifications
- Capacitor pour l'app Android / PWA

## Interfaces principales

### 1. Authentification
- écran de bienvenue
- sélection du rôle : client, agent, vendeur, admin
- écran de connexion
- écran OTP de vérification
- création de profil après inscription
- configuration PIN / 2FA

### 2. Dashboard et navigation utilisateur
- accueil avec bilan et actions rapides
- envoi d'argent
- retrait
- dépôt
- historique
- transfert international
- profil, paramètres, notifications

### 3. Services financiers
- paquets de données / bundles
- factures
- cartes de paiement
- liens de paiement
- paiements récurrents
- microcrédit
- objectifs d'épargne
- parrainage et récompenses

### 4. Commerce et communauté
- marketplace
- produits vendeur
- QR code de paiement
- annonces de troc/barter
- messages et support

### 5. Back-office / admin / agent
- dashboard admin
- gestion des utilisateurs, agents, vendeurs
- validation des demandes KYC
- activités et transactions
- bonus et campagnes de fidélisation
- notifications globales

## Sécurité et notification

- OTP envoyé par email avec expiration de 5 minutes
- JWT pour l'authentification des sessions
- cookies sécurisés pour les tokens
- notifications push via VAPID + service worker
- app update detection via API de version et popup d'installation mise à jour

## Démarrage rapide

1. Installer les dépendances :
   npm install

2. Configurer les variables d'environnement dans un fichier .env :
   DATABASE_URL, DIRECT_URL, JWT_SECRET, SMTP_EMAIL, SMTP_PASSWORD, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, etc.

3. Synchro Prisma :
   npx prisma db push

4. Générer le client Prisma :
   npx prisma generate

5. Démarrer le projet :
   npm run dev

6. Construire pour production :
   npm run build

## Production et mise à jour

- l'API /api/app/version permet de comparer la version active et d'afficher une notice de mise à jour
- le script scripts/send-update-push.js envoie une notification push aux appareils abonnés pour informer de la nouvelle version
- le service worker /public/sw.js gère les notifications et l'ouverture lors d'un clic

## Description fonctionnelle rapide

TRAIT est une plateforme financière complète destinée aux utilisateurs qui veulent gérer leur argent, payer, recevoir, sécuriser leurs opérations et accéder à des services digitaux (marketplace, bonus, messages, outils de vente). Le produit est construit pour un usage mobile-first et multi-rôles, avec un accès client, agent, vendeur et administrateur dans la même application.
