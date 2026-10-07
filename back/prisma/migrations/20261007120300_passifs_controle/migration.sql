-- Famille contrôle / affaiblissement : STUN (Étourdissement), WEAKEN
-- (Affaiblissement) et SUNDER (Brise-armure) prennent des cartes à
-- Exécution, Vengeance et Précision. Migration de données : le déploiement
-- ne seede jamais. Cartes reconnues par leur image (`<dossier>/<ID>.png`),
-- chaque UPDATE vérifie l'ancien passif pour ne rien écraser d'autre.

UPDATE "Card" SET "passiveKey" = 'STUN'
WHERE ("passiveKey" = 'EXECUTION' AND "imageUrl" LIKE '%/DRE-033.png')
   OR ("passiveKey" = 'NEMESIS' AND "imageUrl" LIKE '%/HUM-037.png');

UPDATE "Card" SET "passiveKey" = 'WEAKEN'
WHERE ("passiveKey" = 'NEMESIS' AND "imageUrl" LIKE '%/LAM-031.png')
   OR ("passiveKey" = 'EXECUTION' AND "imageUrl" LIKE '%/FEE-033.png');

UPDATE "Card" SET "passiveKey" = 'SUNDER'
WHERE "passiveKey" = 'CRIT'
  AND ("imageUrl" LIKE '%/TAB-029.png' OR "imageUrl" LIKE '%/ELF-033.png');
