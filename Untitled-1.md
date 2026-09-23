
Tu dois finaliser et rendre **complètement fonctionnelle** la plateforme **TRAIT**, en corrigeant les fonctionnalités existantes et en ajoutant toutes les fonctionnalités décrites ci-dessous.

Le résultat attendu est une plateforme **réellement opérationnelle**, pas une simple maquette. Toutes les fonctionnalités doivent fonctionner de bout en bout : inscription, connexion, OTP, paiement, QR codes, marketplace, commandes, cartes prépayées/cadeaux, transferts d’argent, troc, rôles, administration, PWA et déploiement.

Ne crée pas de fausses données, de faux boutons ou de fonctionnalités simulées. Chaque bouton, formulaire, API, page et action doit être relié au véritable système.

---

# 1. Gestion des utilisateurs et des rôles
Le système doit supporter au minimum les rôles suivants :

### Client
Le client peut :

- créer un compte ;
- se connecter ;
- recevoir et valider son OTP ;
- récupérer son mot de passe ;
- envoyer de l’argent ;
- recevoir de l’argent ;
- générer son propre QR Code ;
- scanner le QR Code d’un autre utilisateur pour lui envoyer de l’argent ;
- créer une carte destinée à une autre personne ;
- déposer de l’argent dans cette carte ;
- choisir la devise de la carte : **CDF ou USD** ;
- consulter ses soldes, transactions et cartes ;
- acheter des produits ;
- vendre des produits ;
- publier des produits dans la marketplace ;
- consulter et gérer ses commandes ;
- participer au système de troc.

### Agent
L’agent doit disposer de son propre système :

- inscription ;
- connexion ;
- OTP ;
- mot de passe oublié ;
- tableau de bord agent ;
- gestion de ses opérations autorisées ;
- consultation des transactions qui lui sont liées ;
- historique de ses opérations ;
- système de sécurité adapté à son rôle.
# Inscription Agent depuis l’accueil

Lorsque l’utilisateur arrive sur l’interface d’accueil et clique sur **« Devenir agent »**, il doit être redirigé vers **exactement le même formulaire d’inscription** que celui utilisé lorsqu’il clique sur **« Créer un compte »**, puis sélectionne le rôle **« Agent »**.

Il ne doit pas y avoir deux formulaires d’inscription agent différents.

Le comportement attendu est :

**Accueil → Devenir agent → Formulaire d’inscription Agent**

Ce formulaire doit contenir **strictement les mêmes champs, validations, étapes, règles de sécurité et système d’OTP** que :

**Créer un compte → Choisir Agent → Formulaire d’inscription Agent**

Les deux parcours doivent utiliser **la même logique backend, les mêmes validations et le même workflow d’activation du compte**.

Toute modification future du formulaire d’inscription Agent doit automatiquement s’appliquer aux deux parcours.

Le bouton **« Devenir agent »** doit donc être uniquement un raccourci vers le parcours d’inscription Agent existant, et non une nouvelle implémentation indépendante.


### Fournisseur de service
Le fournisseur de service doit pouvoir :

- créer son compte ;
- se connecter ;
- recevoir les OTP ;
- récupérer son mot de passe ;
- gérer son profil ;
- enregistrer ses produits/services ;
- attribuer automatiquement ou manuellement les informations nécessaires à chaque produit ;
- générer un **QR Code pour chaque produit** ;
- consulter les ventes ;
- consulter les commandes ;
- publier des produits sur la marketplace ;
- gérer les produits disponibles et leur stock ;
- suivre les paiements liés à ses produits.

### Administrateur
L’administrateur doit avoir une interface complète permettant notamment :

- gestion des utilisateurs ;
- gestion des agents ;
- gestion des fournisseurs de service ;
- gestion des produits ;
- gestion des commandes ;
- gestion des transactions ;
- gestion de la marketplace ;
- contrôle des comptes ;
- consultation des journaux/audits ;
- gestion des paramètres de la plateforme ;
- contrôle des opérations sensibles.
et aussi quand il valide un agent il peut générer un code et aussi lui envoyer par son email et que quand il dis ça lui envoie automatiquement ou soit si pas envoyer l'utilisateur peut se connecter avec son mot de passe et verra son code générer meme si pas envoyé et que le code commence toujours pas AGT-puis un numéro à 6 chiffres pour tous qui ne se ressemble pas. et fait ça bien et aussi si un client met devenir fournisseur de service il doit remplir le formulaire et attendre la validation de l'admin et aussi le fournisseur de service doit etre validé par l'admin et bien fait et complet plus d'erreur. 
---

# 2. Inscription, connexion et OTP
Le système d’authentification doit être entièrement fonctionnel.

Corriger immédiatement tous les problèmes actuels liés à :

- inscription ;
- connexion ;
- déconnexion ;
- vérification OTP ;
- renvoi OTP ;
- expiration OTP ;
- mot de passe oublié ;
- nouveau mot de passe ;
- validation des nouveaux comptes ;
- gestion des sessions.

## OTP
L’OTP doit réellement être envoyé à tous les utilisateurs concernés :

- client ;
- agent ;
- fournisseur de service ;
- et tout autre rôle nécessitant une vérification.
Le problème actuel où **l’OTP ne s’envoie pas** doit être entièrement corrigé.

Le système doit permettre :

1. génération d’un OTP sécurisé ;
2. envoi réel ;
3. expiration après une durée définie ;
4. possibilité de demander un nouvel OTP ;
5. limitation des tentatives ;
6. vérification correcte ;
7. invalidation de l’ancien OTP lorsqu’un nouveau est généré ;
8. gestion propre des erreurs ;
9. fonctionnement également pour le **mot de passe oublié**.
Le workflow :

**Numéro/email → demande OTP → réception OTP → validation → suite de l’opération**

doit fonctionner réellement.

Ne pas contourner l’OTP avec une valeur fictive ou un code fixe.

Vérifie également les variables d’environnement nécessaires à l’envoi des OTP et corrige leur intégration.

---

# 3. Mot de passe administrateur
Le mot de passe initial de l’administrateur doit être contrôlé par la variable présente dans `.env`.

Utiliser exactement :

```
ADMIN_BOOTSTRAP_PASSWORD=...
```
Lors de l’initialisation du système :

- le compte administrateur doit utiliser cette valeur comme mot de passe initial ;
- le mot de passe doit être correctement hashé en base ;
- ne jamais enregistrer le mot de passe en clair dans la base ;
- si le compte administrateur existe déjà mais que le bootstrap doit être appliqué, gérer correctement la synchronisation selon une logique sécurisée ;
- ne jamais afficher le mot de passe dans l’interface ;
- ne jamais exposer cette variable côté client/browser.
Vérifie particulièrement que l’administrateur peut réellement se connecter avec le mot de passe défini dans `.env`.

---

# 4. QR Code du fournisseur de service
Lorsqu’un **fournisseur de service enregistre un produit**, le système doit automatiquement créer un QR Code associé à ce produit.

Chaque produit doit posséder un identifiant unique.

Le QR Code doit permettre au client de :

- scanner le produit ;
- voir le produit concerné ;
- voir son prix ;
- voir sa devise ;
- voir les informations utiles du vendeur/fournisseur ;
- accéder directement au processus d’achat/paiement ;
- confirmer le produit ;
- payer selon les moyens de paiement disponibles.
Le QR Code doit être unique par produit.

Prévoir également :

- régénération si nécessaire ;
- impression/téléchargement du QR Code ;
- affichage du QR Code dans l’espace fournisseur ;
- possibilité pour le fournisseur d’utiliser le QR comme étiquette du produit.

---

# 5. Paiement par QR Code
Lorsqu’un client scanne le QR Code d’un produit :

1. le produit est identifié ;
2. les informations du produit sont affichées ;
3. le prix est récupéré depuis les données réelles ;
4. le client peut lancer l’achat ;
5. le système affiche les moyens de paiement disponibles ;
6. le paiement est traité ;
7. la transaction est enregistrée ;
8. la commande est créée ;
9. le fournisseur voit la commande ;
10. le client voit son achat dans son historique.
Ne jamais faire confiance au prix envoyé par le navigateur.

Le prix final doit être récupéré et vérifié côté serveur.

---

# 6. QR Code personnel du client
Chaque utilisateur doit avoir un **QR Code personnel unique**.

Ce QR Code doit être accessible depuis son espace personnel.

Il doit permettre à un autre utilisateur ou à un vendeur de :

- scanner le QR Code ;
- identifier le destinataire ;
- saisir le montant ;
- choisir la devise ;
- confirmer ;
- envoyer l’argent.
Le système doit supporter au minimum :

- **CDF**
- **USD**
Le QR Code personnel ne doit pas exposer de données sensibles.

---

# 7. Transfert d’argent entre utilisateurs
Un client doit pouvoir envoyer de l’argent à un autre client.

Deux méthodes doivent fonctionner :

### Méthode 1 — QR Code
Scanner le QR Code du destinataire.

### Méthode 2 — identification manuelle
Rechercher/saisir l’identifiant approprié du destinataire.

Le workflow doit être :

**Destinataire → montant → devise → confirmation → sécurité/validation → transfert → reçu → historique**

Après confirmation :

- débiter correctement l’expéditeur ;
- créditer correctement le destinataire ;
- enregistrer une transaction unique ;
- empêcher le double débit ;
- afficher le statut de la transaction ;
- mettre à jour immédiatement les soldes.
Toutes les opérations financières doivent être atomiques et protégées contre les doubles soumissions.

---

# 8. Création d’une carte pour une autre personne
Ajouter une fonctionnalité permettant à un utilisateur de créer une **carte destinée à une autre personne**.

Exemple :

Utilisateur A crée une carte pour Utilisateur B.

Utilisateur A peut :

- nommer la carte ;
- associer la carte au bénéficiaire ;
- choisir **CDF ou USD** ;
- déposer de l’argent dessus ;
- consulter le solde ;
- consulter l’historique.
Le bénéficiaire peut ensuite utiliser cette carte selon les règles définies par la plateforme.

Prévoir une interface claire :

**Créer une carte → sélectionner bénéficiaire → choisir devise → alimenter → confirmer**

La carte doit posséder :

- un identifiant unique ;
- un statut ;
- une devise ;
- un solde ;
- un propriétaire/bénéficiaire clairement défini ;
- un historique des opérations.

---

# 9. Marketplace
Créer une véritable section :

# MARKETPLACE
Elle doit être accessible à **tous les utilisateurs autorisés**.

Chaque utilisateur doit pouvoir publier ses propres produits pour les vendre.

Un utilisateur doit pouvoir :

- créer une annonce ;
- ajouter un nom de produit ;
- description ;
- prix ;
- devise ;
- quantité ;
- photos ;
- catégorie ;
- état du produit ;
- informations utiles ;
- publier ;
- modifier ;
- supprimer.
La marketplace doit permettre :

- recherche ;
- filtres ;
- catégories ;
- détail du produit ;
- profil du vendeur ;
- achat ;
- commande.

---

# 10. Vente de produits par n’importe quel utilisateur
Ne pas limiter la marketplace aux fournisseurs professionnels.

Un utilisateur classique doit également pouvoir devenir vendeur pour ses propres produits.

Créer une logique claire séparant :

- acheteur ;
- vendeur ;
- fournisseur de service.
Un même compte peut pouvoir acheter et vendre.

Lorsqu’un utilisateur publie un produit, il doit automatiquement apparaître dans sa gestion vendeur et dans la marketplace après validation des règles nécessaires.

---

# 11. Interface de commandes
Ajouter un véritable module :

# COMMANDES
Chaque utilisateur doit retrouver les commandes qui le concernent.

### Pour l’acheteur
Afficher :

- produit ;
- vendeur ;
- quantité ;
- montant ;
- devise ;
- date ;
- statut ;
- paiement ;
- informations de livraison/remise si utilisées.

### Pour le vendeur
Afficher :

- les personnes qui ont acheté ;
- produit concerné ;
- quantité ;
- montant ;
- statut ;
- date ;
- état du paiement ;
- état de la commande.
Prévoir des statuts propres, par exemple :

**En attente → Payée → Confirmée → En préparation → Terminée**

avec possibilité d’annulation lorsque les règles métier l’autorisent.

---

# 12. Système de troc
Ajouter dans la marketplace une fonctionnalité appelée :

# TROC
Le troc doit permettre à **deux ou plusieurs utilisateurs** de négocier un échange de produits **sans utiliser d’argent**.

Exemple :

Utilisateur A propose :

- téléphone
Utilisateur B propose :

- ordinateur
Ils peuvent négocier un échange.

Le système doit permettre :

- créer une proposition de troc ;
- sélectionner le produit proposé ;
- sélectionner le produit recherché ;
- envoyer une proposition ;
- discuter/négocier selon les fonctionnalités prévues ;
- accepter ;
- refuser ;
- modifier ;
- annuler.
Le système doit également supporter les échanges à plusieurs participants lorsque la logique métier le permet.

Exemple :

A échange avec B,
B échange avec C,
C échange avec A.

Le troc doit être clairement séparé du paiement monétaire.

Lorsqu’un troc est accepté :

- générer une opération de troc ;
- enregistrer les produits concernés ;
- enregistrer les participants ;
- enregistrer la date ;
- changer l’état des annonces concernées ;
- empêcher qu’un produit déjà engagé dans un échange soit simultanément vendu ailleurs, selon les règles choisies.
Afficher clairement :

**Troc = échange de produits sans argent.**

---

# 13. Marketplace et paiement
La marketplace doit pouvoir fonctionner avec le système financier existant.

Lors d’un achat :

- vérifier le prix réel ;
- vérifier la devise ;
- vérifier le solde si paiement interne ;
- créer la transaction ;
- créer la commande ;
- mettre à jour le stock ;
- afficher le reçu ;
- enregistrer l’historique.
Aucune transaction ne doit être considérée comme réussie uniquement parce que l’utilisateur a cliqué sur un bouton.

---

# 14. Sécurité financière
Toutes les opérations financières doivent être sécurisées.

Implémenter notamment :

- validation serveur ;
- contrôle des permissions ;
- protection contre le double clic/double paiement ;
- idempotence des transactions ;
- vérification des montants ;
- vérification des devises ;
- contrôle du solde ;
- journalisation ;
- références uniques ;
- états de transaction cohérents ;
- contrôle des accès par rôle ;
- protection des endpoints sensibles.
Ne jamais faire confiance aux informations critiques venant uniquement du frontend.

---

# 15. Tableau de bord
Adapter les dashboards selon le rôle.

### Client
Afficher :

- solde CDF ;
- solde USD ;
- QR personnel ;
- transferts ;
- cartes ;
- marketplace ;
- achats ;
- ventes ;
- commandes ;
- troc ;
- historique.

### Fournisseur
Afficher :

- produits ;
- QR des produits ;
- ventes ;
- commandes ;
- marketplace ;
- historique financier ;
- stock.

### Agent
Afficher uniquement les fonctionnalités liées à ses autorisations.

### Administrateur
Afficher la supervision globale de la plateforme.

---

# 16. Architecture et qualité du code
Avant toute modification importante :

1. analyser l’architecture actuelle ;
2. identifier les fonctionnalités existantes ;
3. identifier les bugs ;
4. vérifier la base de données ;
5. vérifier les routes/API ;
6. vérifier l’authentification ;
7. vérifier les variables `.env` ;
8. vérifier les rôles et permissions.
Ne pas casser les fonctionnalités existantes qui fonctionnent déjà.

Chaque nouvelle fonctionnalité doit être intégrée à l’architecture actuelle proprement.

Éviter :

- duplication de logique ;
- données fictives ;
- logique financière uniquement côté client ;
- secrets dans le frontend ;
- routes non protégées ;
- contournement des permissions.

---

# 17. PWA Android et iOS
La plateforme doit être une **PWA réellement fonctionnelle**.

Lorsqu’une nouvelle version est déployée :

- le site web doit servir automatiquement la nouvelle version ;
- la PWA Android doit récupérer correctement la mise à jour ;
- la PWA iOS doit également récupérer correctement la mise à jour ;
- éviter les anciennes versions du frontend conservées par le cache ;
- mettre correctement à jour le service worker ;
- gérer le cache intelligemment ;
- prévenir les conflits entre ancienne interface et nouvelle API ;
- garantir que les assets critiques sont correctement renouvelés.
Le système doit gérer proprement :

**nouvelle release → nouveau build → nouveau service worker → invalidation/actualisation du cache → nouvelle version disponible**

La PWA doit rester fonctionnelle après déploiement.

Tester particulièrement :

- installation ;
- lancement hors navigateur ;
- reconnexion ;
- mise à jour ;
- cache ;
- service worker ;
- authentification ;
- navigation ;
- formulaires ;
- QR codes ;
- marketplace ;
- paiements.

---

# 18. Tests obligatoires
Ne considère pas la mission terminée simplement parce que le code compile.

Tester réellement tous les workflows principaux.

## Authentification

- inscription client ;
- inscription agent ;
- inscription fournisseur ;
- connexion ;
- OTP ;
- renvoi OTP ;
- OTP expiré ;
- OTP invalide ;
- mot de passe oublié ;
- réinitialisation du mot de passe ;
- déconnexion.

## Finance

- solde ;
- transfert ;
- réception ;
- QR personnel ;
- création de carte ;
- alimentation de carte ;
- CDF ;
- USD ;
- historique.

## Produits

- création produit ;
- génération QR ;
- scan QR ;
- paiement ;
- commande ;
- stock ;
- vente.

## Marketplace

- publication ;
- recherche ;
- achat ;
- commande ;
- vente ;
- gestion vendeur.

## Troc

- création proposition ;
- réception ;
- acceptation ;
- refus ;
- annulation ;
- échange de plusieurs produits/utilisateurs.

## Administration

- connexion admin ;
- mot de passe issu de `ADMIN_BOOTSTRAP_PASSWORD` ;
- accès aux fonctionnalités administratives ;
- permissions.

## PWA

- web ;
- Android ;
- iOS ;
- installation ;
- refresh ;
- nouvelle version ;
- cache ;
- service worker.

---

# 19. Vérification finale
À la fin du travail :

1. corriger les erreurs frontend ;
2. corriger les erreurs backend ;
3. corriger les erreurs de base de données ;
4. vérifier les variables d’environnement ;
5. vérifier tous les endpoints ;
6. vérifier les permissions ;
7. vérifier les OTP ;
8. vérifier les QR Codes ;
9. vérifier les transactions ;
10. vérifier les cartes ;
11. vérifier la marketplace ;
12. vérifier les commandes ;
13. vérifier le troc ;
14. vérifier l’administrateur ;
15. vérifier la PWA ;
16. vérifier le comportement après déploiement.
Tu dois ensuite fournir un résumé clair de :

- ce qui a été corrigé ;
- ce qui a été ajouté ;
- les migrations effectuées ;
- les variables `.env` nécessaires ;
- les tests réalisés ;
- les éventuels problèmes restant à résoudre.

# Règle essentielle
**Tout doit fonctionner réellement de bout en bout.**

Pas de mock, pas de données fictives, pas de bouton sans action, pas de paiement simulé, pas d’OTP fictif, pas de QR Code décoratif et pas de fonctionnalités seulement visuelles.

L’objectif est d’obtenir une version de TRAIT **fonctionnelle, cohérente, sécurisée, testée et déployable en production**, avec les fonctionnalités Client, Agent, Fournisseur de service, Administrateur, QR paiement, transferts, cartes, Marketplace, commandes et Troc intégrées dans un seul système.
