# Guide de l'application TRAIT

TRAIT est une application de services financiers et commerciaux. Elle permet aux clients, agents et vendeurs de gérer des paiements, transferts, dépôts, retraits, cartes, marketplace, troc et vérification d'identité.

## Client

Le client utilise TRAIT pour gérer son argent et payer des services.

Fonctionnalités principales :

- Accueil : affiche les soldes, les actions rapides et les dernières activités.
- Inscription et connexion : création de compte par téléphone, OTP, profil et code PIN.
- Dépôt : permet d'ajouter de l'argent sur son solde via mobile money, banque, carte ou agent.
- Retrait : permet de retirer de l'argent avec le code ou le numéro complet d'un agent TRAIT.
- Transfert local : envoi d'argent vers un autre utilisateur par numéro de téléphone.
- Transfert international : envoi vers wallet, mobile money, banque, carte, marchand, API ou QR Code, avec frais et suivi.
- KYC : vérification d'identité avec document officiel et selfie pour activer les services sensibles.
- Carte TRAIT : demande, affichage et paiement avec une carte virtuelle ou physique associée à un QR Code.
- Historique : consultation des dépôts, retraits, paiements et transferts.
- Notifications : suivi des validations, paiements, messages et alertes de sécurité.
- Marketplace : achat de produits ou services proposés dans l'application.
- Troc : publication d'offres, consultation et échange avec d'autres utilisateurs.
- Support : contact et assistance en cas de problème.
- Paramètres : gestion du profil, langue, thème, sécurité et préférences.

## Agent

L'agent accompagne les clients pour les opérations de dépôt et retrait.

Fonctionnalités principales :

- Tableau de bord agent : résumé des dépôts, retraits, clients actifs et volume traité.
- Code ou numéro agent : identifiant unique utilisé par les clients pour les retraits auprès d’un agent.
- Dépôt client : crédit du compte d'un client à partir de son numéro de téléphone, avec choix USD ou FC.
- Validation retrait : consultation des retraits en attente, validation ou refus quand une opération nécessite confirmation.
- Activité agent : historique des opérations traitées pour les clients.
- Messages : réception des informations importantes liées au service agent.
- Sécurité : compte agent vérifié, possibilité de suspension en cas de risque, et opérations tracées.

## Vendeur

Le vendeur utilise TRAIT pour vendre et encaisser les paiements des clients.

Fonctionnalités principales :

- Tableau de bord vendeur : vue des ventes, produits et paiements.
- Produits : création et gestion des articles ou services vendus.
- Scanner QR : lecture du QR Code d'une carte TRAIT avec la caméra du téléphone ou saisie manuelle du code.
- Paiement QR : débit du solde du client et crédit du solde vendeur après vérification de la carte active.
- Devise : paiements possibles en USD ou FC selon le solde et le type de carte.
- Suivi : les opérations réussies sont enregistrées et visibles dans l'activité.

## Fonctionnalités transversales

- Solde réel : argent utilisable pour les paiements, retraits et transferts.
- Solde bonus : avantages promotionnels utilisables selon les règles du service.
- Frais : calcul automatique des frais avant confirmation.
- Code PIN : confirmation sécurisée des opérations sensibles.
- Vérification KYC : document et selfie pour activer les transferts internationaux.
- Journalisation sécurité : suivi des opérations sensibles et des blocages.
- Multi-devise : prise en charge USD et FC sur plusieurs opérations.
- PWA : l'application peut être installée sur mobile comme une application web.

## Parcours typiques

1. Client : créer un compte, définir un PIN, déposer de l'argent, vérifier son identité, envoyer ou payer.
2. Agent : recevoir son identifiant, accéder au tableau de bord, effectuer un dépôt client, suivre son activité.
3. Vendeur : créer ses produits, scanner la carte TRAIT du client, confirmer le montant, recevoir le paiement.

