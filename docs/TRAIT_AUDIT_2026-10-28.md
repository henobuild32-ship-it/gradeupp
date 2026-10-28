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
