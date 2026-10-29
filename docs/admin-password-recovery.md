# Récupération du mot de passe administrateur

Cette procédure est réservée à un opérateur disposant d'un accès autorisé à la base TRAIT. Elle ne crée aucun accès de secours dans l'écran de connexion.

1. Vérifier explicitement que `DATABASE_URL` pointe vers l'environnement à récupérer.
2. Depuis le dépôt, exécuter `npm run admin:reset-password -- --username=admin` (remplacer `admin` par le compte visé).
3. Le script génère un mot de passe aléatoire, le hache avec bcrypt, efface le verrouillage et augmente `authVersion`, ce qui invalide les sessions admin existantes.
4. Copier le mot de passe temporaire depuis la sortie protégée du terminal et le transmettre à l'administrateur par un canal sûr. Ne pas l'ajouter à un ticket, un commit ou un journal partagé.
5. Se connecter puis remplacer immédiatement le mot de passe temporaire par un mot de passe unique d'au moins 12 caractères.

Le script ne doit pas être lancé pendant un build ou un déploiement. Il modifie immédiatement le compte de l'environnement désigné.
