# TRAIT — audit technique initial (28 octobre 2026)

Ce document enregistre le diagnostic de départ et sépare les constats statiques des tests réellement exécutés. Il sera complété au fil des phases.

## Architecture constatée

- Application web/PWA Next.js 16, React 19 et TypeScript. La majorité des espaces est un client SPA : `src/app/page.tsx` rend des écrans depuis un store Zustand, tandis que les pages fichier servent surtout l'accueil public, les conditions, les liens de paiement et la vérification de reçus.
- API Next.js en handlers `route.ts`; base PostgreSQL gérée par Prisma et hébergée sur Supabase. Le script `npm run build` lance les migrations avant Next.js : il ne faut pas l'exécuter localement contre l'URL distante sans base de test.
- Authentification par cookies HttpOnly, profil vérifié par `/api/auth/profile`; Zustand ne conserve qu'un indice de session réduit et des préférences. Les soldes et rôles ne doivent pas provenir du stockage navigateur.
- Déploiement Vercel lié au dépôt GitHub. Les transferts internationaux ont une interface, les routes `/api/transfers/*` et un registre d'adaptateurs, mais aucun adaptateur fournisseur n'est enregistré par défaut. Aucun transfert bancaire/mobile réel n'est donc validé.
- Le dépôt ne contient pas de configuration Playwright/Cypress ni de suite E2E existante. Les tests présents sont des tests Node ciblés.

## Inventaire des routes et espaces

État initial au commit `2a5d84b` : 5 pages Next fichier, 153 handlers API, 64 écrans client/agent, 25 composants administrateur et 3 composants TRAIT dédiés aux cartes/QR. Les handlers se répartissaient ainsi :

| Groupe API | Routes |
|---|---:|
| admin | 30 |
| agent | 9 |
| auth | 18 |
| biometric | 7 |
| cards | 12 |
| transfer | 5 |
| autres 29 groupes | 72 |
| **Total** | **153** |

Principaux parcours identifiés : accueil/authentification; portefeuille et transferts internes; transfert international; agent; KYC; cartes; notifications/push; historique/reçus; marketplace/commandes/vendeurs; troc et chat; support; admin, utilisateurs, vendeurs, KYC et signalements; paramètres, thèmes, biométrie et 2FA. Les routes API sont listées directement dans `src/app/api`; leur présence ne prouve pas à elle seule que chaque action d'interface a été testée.

## Régressions et défauts vérifiés dans le code

- L'ancien `PUT /api/agent/withdrawal/[id]` a été remplacé par une réponse `410`. L'ancien handler débitait le portefeuille et écrivait retrait, transaction et notification dans des appels séparés, sans contrôle PIN. Aucun écran actuel ne l'appelle; la validation d'un retrait par l'agent passe par `/api/agent/validate-withdrawal`. La rupture concerne d'éventuels clients externes anciens et est documentée par la réponse de retrait de route.
- L'interface hors ligne annonçait des « transactions » à synchroniser, alors que sa file ne pouvait synchroniser que des favoris et refusait les opérations financières. Le message pouvait induire l'utilisateur en erreur; la Phase 2 remplace cette bannière par un avertissement hors ligne sans action de synchronisation.
- Les réglages utilisateur dédiés à l'ancien menu téléphonique n'étaient utilisés que par celui-ci et son seed. Aucune autre route ou écran n'utilisait le modèle de réglages.
- L'ancien sélecteur agent dans le formulaire de retrait utilisait une route appartenant à l'ancien menu. La Phase 2 le relie à `/api/agent/lookup`, dont la réponse a le format consommé par l'écran.

## Contrôles réellement exécutés sur l'état initial

| Contrôle | Résultat |
|---|---|
| `npm test` | 10 réussis, 0 échoué (pays/téléphones, calcul USD/CDF, registre fournisseurs) |
| `npx tsc --noEmit` | Réussi |
| `npm run lint -- --no-cache` | Réussi |
| Build Vercel du code initial | Réussi; 153 pages/routes générées, migrations annoncées à jour |
| Démarrage local `npm run dev` | Démarré; accueil et `/api/health` répondent `200` après la compilation initiale |
| Navigateur / parcours visuels | Non validés : l'autorisation d'observer l'onglet local a été refusée; aucune voie de contournement n'est utilisée |

## État des intégrations et limites initiales

- Le registre de transfert n'annonce aucun prestataire tant qu'un adaptateur réel n'est pas enregistré. Contrat API, contrats commerciaux, secrets et sandbox partenaires restent à fournir.
- KYC, reçus PDF, push, upload média, Marketplace, rôles et actions administrateur existent en code, mais leur parcours complet n'a pas encore été vérifié avec des comptes isolés.
- Aucun compte de test n'a été créé dans la base distante. Aucune transaction financière ni migration de schéma n'a été exécutée sur la production pendant ce chantier.
- Le téléphone i5C+ et les autres appareils réels restent à vérifier par l'utilisateur; l'inspection responsive visuelle n'a pas pu être effectuée sans accès navigateur.

## Phase 2 — retrait du module USSD et stabilisation (28 octobre 2026)

- Les écrans, 11 handlers API, la route de réglages/favoris dédiée, le stockage local, la file hors ligne et le raccourci PWA du module USSD sont retirés. L'ancienne entrée persistée est migrée vers l'accueil afin d'éviter une route vide après mise à jour.
- Les deux tables qui ne servaient qu'à l'ancien menu sont archivées par renommage dans une migration dédiée; aucune ligne n'est supprimée. Un rollback de renommage est fourni. La migration SQL n'a pas été appliquée à la base distante.
- Les anciens types de transactions d'agent restent lisibles dans l'historique, sans réactiver le module retiré. Les anciennes copies hors ligne sont effacées au démarrage client.
- Le formulaire de retrait par agent utilise maintenant le handler actif `/api/agent/lookup` plutôt qu'un handler retiré.
- `npx next build`: réussi, 142 routes générées. `npx tsc --noEmit`: réussi. `npm run lint -- --no-cache`: réussi. `npm test`: 10 réussis, 0 échec. `npx prisma validate`: réussi. `git diff --check`: réussi (avertissements de fin de ligne seulement).
- `scripts/e2e-smoke.ts` a perdu son nettoyage d'un modèle Prisma supprimé; le script lui-même n'a pas été exécuté, car son accès DB avec `.env` n'est pas isolé.
- Contrôle statique: aucune fonctionnalité USSD active ne reste dans `src`, `public`, `prisma/seed.ts`, le SQL de déploiement, les tests ou scripts. Les seules références d'exécution conservées sont le nettoyage d'une ancienne clé/cache, la migration de routes persistées et le rendu de vieux libellés de transactions.
- Le build a généré 142 routes contre 153 au départ, soit les 11 handlers API supprimés. La suppression des noms de tables du schéma Prisma n'a pas fait perdre leurs données archivées.

## Phase 3 — comptes supprimés, sessions et exposition de numéros

- Un compte supprimé est maintenant anonymisé dans sa ligne `User` (`deletedAt`, numéro de remplacement non téléphonique, profil, identifiants, KYC et soldes effacés) au lieu d'un `DELETE` qui risquait d'échouer sur les références financières. Les transactions historiques restent reliées pour la comptabilité.
- La suppression et le révocation des informations de carte/KYC, abonnements push et authentifiants biométriques, liens de paiement, paiements récurrents, demandes en attente, contenus de messages et coordonnées associées se font dans une transaction DB. Les cartes sont révoquées et les produits du vendeur supprimé désactivés.
- `requireUser` et `getAuthUser` vérifient désormais l'existence active du compte en base, pas seulement la signature du JWT. Le login, les recherches par téléphone, les contacts, l'aperçu public, les destinataires récurrents, les listes admin, l'export, l'historique et les reçus excluent ou masquent les comptes supprimés.
- La route admin de recherche d'agent rejetait auparavant un appel sans session car elle ignorait la valeur de `getAuthUser`; elle renvoie désormais 401. Les requêtes de cette recherche excluent également les comptes supprimés.
- Migration `20261028160000_anonymize_deleted_users`: champ/index `deletedAt`. Elle est créée mais n'a pas été appliquée à la base distante.
- Test ajouté sur la normalisation téléphone et l'exclusion des comptes supprimés. `npm test`: 12 réussis, 0 échec. `npx tsc --noEmit`: réussi. `npm run lint -- --no-cache`: réussi. `npx prisma validate`: réussi. `npx next build`: réussi avec 142 routes.
- La suppression n'a pas été déclenchée sur un compte réel : ce scénario requiert une base de test isolée afin de vérifier les écritures transactionnelles et les relations, indisponible dans cet environnement. Le comportement SQL de la migration n'a pas été exécuté.

## Phase 4 — thème Blanc sur l'accueil client

- L'accueil ne respectait pas le thème Blanc : son fond, ses surfaces, ses titres et ses lignes d'historique avaient des couleurs sombres codées en dur. Il lit maintenant la variante de thème persistée et adapte l'arrière-plan, l'en-tête, le solde, les raccourcis, les services, les cartes et les transactions récentes; les dégradés de marque gardent leur contraste.
- `npx tsc --noEmit`: réussi. `npx eslint src/components/screens/HomeScreen.tsx --no-cache`: réussi. `npm test`: 12 réussis, 0 échec.
- Limite : l'onglet navigateur local n'a pas été accessible après le refus d'autorisation précédent. Le contraste visuel de l'accueil, et les autres écrans utilisant encore des couleurs en dur, restent à parcourir en mode Blanc sur navigateur/appareil avant de déclarer le thème entièrement harmonisé.

## Phase 5 — état réel des rails externes et effacement des formulaires

- Le formulaire de transfert international conserve les parcours Wallet Trait et Carte Trait existants. Il présente aussi des aperçus non interactifs pour Mobile Money international et virement bancaire, avec les champs attendus et la mention « Bientôt disponible ». L'écran précise qu'aucun partenaire n'est raccordé et qu'aucun débit ni transfert externe ne peut être effectué.
- Le store vide téléphone, mot de passe d'inscription et OTP lors de l'authentification d'un compte et des déconnexions client/admin, pour qu'un formulaire précédent ne reparaisse pas au changement de session.
- `npm test`: 12 réussis, 0 échec. `npx tsc --noEmit`: réussi. ESLint ciblé des écrans modifiés et du store: réussi sans avertissement après retrait d'un attribut ARIA inadapté.
- Les intégrations restent non opérationnelles sans adaptateur/partenaire. Aucun paiement simulé ou réel n'est déclaré réussi.

## Phase 6 — soumission et stockage KYC

- La soumission KYC vérifie désormais sur le serveur le type MIME, l'encodage base64 canonique, la taille et la signature JPEG/PNG/WebP des deux images. La validation se fait aussi au POST final, donc un client ne peut pas contourner le contrôle de l'endpoint d'upload en forgeant directement la requête.
- Les images sont compressées jusqu'à 1,5 Mo chacune; cette limite garde les deux data URLs sous la limite de taille habituelle d'une requête de fonction hébergée. La compression réessaie avec une qualité puis une résolution plus faibles au lieu d'échouer au premier dépassement. Les colonnes Prisma deviennent `TEXT`, car le chiffrement base64 agrandit les documents au-delà de `VARCHAR(255)`.
- La demande, le journal de sécurité et la notification sont maintenant écrits dans une seule transaction DB. Un statut déjà en attente ou vérifié bloque atomiquement une resoumission concurrente. Le mode de vérification stocké décrit une revue administrative manuelle; aucune reconnaissance automatisée n'est prétendue.
- Migration `20261028170000_kyc_document_text` créée, mais non appliquée. Elle doit être exécutée sur une base isolée avant de tester la persistance KYC; aucune base distante n'a été touchée.
- `npm test`: 15 réussis, 0 échec, dont trois scénarios de validation KYC. `npx tsc --noEmit`: réussi. ESLint ciblé des quatre fichiers KYC: réussi. `npx prisma validate`: réussi. `npx next build`: réussi, 142 routes générées. `git diff --check`: réussi.
- Non couvert dans cette phase : parcours KYC avec compte connecté et vraie écriture/lecture admin sur une base de test isolée, et contrôle visuel mobile. La validation des fichiers et la compilation sont automatisées, mais elles ne remplacent pas ces tests d'intégration.

## Phase 7 — activation et isolation des notifications push

- L'endpoint authentifié `/api/notifications/push` expose maintenant un état privé sans secret : présence des deux clés VAPID côté serveur et association de l'abonnement de cet appareil au compte courant. Une tentative d'abonnement est refusée en `503` avec un code explicite si la configuration VAPID serveur manque; l'interface ne confond plus cette situation avec une permission navigateur en attente.
- Le parcours paramètre la clé publique avant de demander la permission, attend la sauvegarde côté serveur avant d'afficher « activées », donne des résultats distincts (permission, configuration, erreur réseau) et permet aussi de désactiver l'abonnement de l'appareil. Les textes sont disponibles en français et anglais.
- Lors d'un changement de compte, le même abonnement navigateur est réassocié à l'utilisateur connecté lors de la synchronisation. Le nettoyage des abonnements expirés est limité à l'utilisateur qui possédait la ligne lue, afin qu'une erreur tardive d'envoi ne supprime pas un abonnement réaffecté entre-temps.
- `npm test`: 15 réussis, 0 échec. `npx tsc --noEmit`: réussi. ESLint ciblé: réussi. `npx next build`: réussi avec 142 routes. `git diff --check`: réussi.
- Limites : l'envoi push quand l'application est fermée dépend des clés VAPID de production, du navigateur, et, sur iOS, des règles PWA/installations de la plateforme. La réception réelle n'a pas été testée sur appareil ni contre une base isolée; chaque événement métier n'a pas encore été audité pour vérifier qu'il déclenche une notification push.

## Phase 8 — génération du reçu PDF

- Le bouton « Télécharger le PDF » produit maintenant un fichier PDF via jsPDF, avec logo TRAIT, date/heure et fuseau local, référence, expéditeur et bénéficiaire/pays, devise, montant, frais, taux, montant reçu et QR de vérification. « Imprimer / PDF » reste une action distincte. Les données de parties supprimées restent anonymisées par l'API.
- La route source n'autorise un reçu qu'aux parties à une transaction `completed` ou à un administrateur autorisé. La vérification publique renvoie les montants et le statut sans exposer les noms, téléphones ni autres données personnelles.
- Le PDF est recalculé à partir de la transaction enregistrée et garde une référence stable; le PDF et un instantané des noms/coordonnées ne sont pas persistés séparément. L'API renvoie toujours un horodatage `generatedAt` variable, qui n'est pas imprimé dans le document. Les documents réémis ne constituent donc pas encore un instantané comptable immuable.
- jsPDF 4.2.1 est ajouté; le dépôt officiel documente l'API `addImage`/`save` et indique que la version 4.2.1 corrige deux problèmes de sécurité. [Notes de version officielles jsPDF](https://github.com/parallax/jsPDF/releases).
- `npm test`: 16 réussis, 0 échec, dont un test qui génère un PDF avec PNG de logo/QR et vérifie son en-tête/terminaison. `npx tsc --noEmit`: réussi. ESLint ciblé: réussi. `npx prisma validate`: réussi. `npx next build`: réussi, 142 routes. `git diff --check`: réussi.
- `npm audit --omit=dev`: 30 alertes de dépendances de production (7 modérées, 20 hautes, 3 critiques : `@capacitor/android`, `next`, `next-auth`). `npm audit fix` sans forçage n'a pas rendu la main après plusieurs minutes et a été interrompu; l'installation a ensuite été restaurée avec `npm ci`. Aucun upgrade massif n'a été conservé. Tant que ces alertes critiques ne sont pas corrigées et revalidées, aucun déploiement ne doit être présenté comme prêt pour la production.

## Phase 9 — dépendances, biométrie native et durcissement de la compilation (29 octobre 2026)

- Les dépendances applicatives inutilisées ont été retirées; Firebase client importe maintenant directement les modules App/Auth nécessaires. `jose` est déclaré explicitement puisqu'il est utilisé par le code. Next.js, Capacitor, Nodemailer et `deepmerge-ts` ont été mis à jour vers des versions corrigées/compatibles avec le runtime Node 22 du dépôt. `npm audit --json`: 0 vulnérabilité sur 928 dépendances. La mise à niveau n'a pas utilisé `--force`.
- Le plugin biométrique natif obsolète, incompatible avec Capacitor 8, est remplacé par `@capgo/capacitor-native-biometric`. Le secret local utilise l'accès biométrique protégé du Keystore/Keychain; l'ancienne donnée locale peut être migrée après une authentification système réussie. L'aléa ne retombe plus sur `Math.random`. Les échecs et l'absence de secret donnent une voie de repli vers PIN TRAIT/mot de passe.
- Le mot de passe et la clé privée de signature Android qui étaient codés dans `android/app/build.gradle` ont été retirés du code. La signature release lit `android/key.properties` (ignoré par Git) ou les variables `TRAIT_ANDROID_*`; un exemple sans secret est fourni. Les anciennes valeurs ont été exposées dans l'historique Git : elles doivent être renouvelées avant toute signature de production. Aucun keystore local n'a été modifié ou ajouté au dépôt.
- Les redirections internes des liens de paiement utilisent le routeur Next. `src/middleware.ts` a été migré vers `src/proxy.ts` pour supprimer l'avertissement de convention dépréciée de Next 16, en conservant les en-têtes, règles d'origine/CSRF et comportement de cache existants.
- Contrôles exécutés : `npx next build` réussi (142 routes); `npx cap sync android` réussi; `android\\gradlew.bat assembleDebug` réussi (APK debug compilé); `npm test` réussi (18/18); `npx tsc --noEmit` réussi; `npm run lint` réussi; `npm audit --json` sans vulnérabilité; `npm ls --depth=0` valide; `git diff --check` réussi (avertissements de conversion CRLF seulement). Un test unitaire couvre les messages de repli biométrique.
- Après compilation, `npm run dev -- --port 2398` a démarré. `GET /api/health` et `GET /` ont répondu HTTP 200; la page publique a renvoyé 61 747 octets. Cela vérifie le démarrage et le rendu HTTP, pas les interactions visuelles ou l'authentification des différents rôles.
- La compilation Android ne vérifie pas l'affichage réel du dialogue biométrique. Aucun répertoire iOS ni appareil/émulateur validé n'était disponible; le déverrouillage doit encore être essayé sur l'appareil réel. L'APK Capacitor cible l'URL configurée dans `capacitor.config.ts`, ce qui n'en fait pas une préversion web isolée. Les tests DB, les migrations, les push et les parcours visuels restent à réaliser dans des environnements de test et sur appareils autorisés.
