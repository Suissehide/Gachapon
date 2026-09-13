-- Allonge considerablement la progression d'equipe : `teamLevel.xpBase` passe
-- de 175 a 1050. Voir le commentaire de `DEFAULTS` dans config.service.ts pour
-- l'arithmetique (niveau 18 = fin de la progression utile, ~3 semaines avant,
-- ~17 apres, pour une equipe de 35 membres actifs).
--
-- Migration de DONNEES, sans changement de schema : `prisma migrate diff` n'en
-- produit aucune, elle ne peut donc qu'etre ecrite. Elle est necessaire parce
-- que le bootstrap de `GlobalConfig` est CREATE-ONLY — il remplit ce qui manque
-- et n'ecrase jamais — donc changer `DEFAULTS` ne touche que les bases neuves.
-- L'ecran d'administration, lui, n'expose pas les reglages d'equipe.
--
-- Le garde `value = '175'` rend l'operation idempotente et ne deplace que les
-- bases restees sur l'ancienne valeur : une valeur ajustee a la main survit.
UPDATE "GlobalConfig"
SET value = '1050'
WHERE key = 'teamLevel.xpBase' AND value = '175';
