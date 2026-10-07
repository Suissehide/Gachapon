-- Famille provocation / ciblage : VAMPIRISM devient TAUNT (Provocation),
-- et deux nouvelles clés, GUARDIAN (Garde du corps) et HUNT (Marque du
-- chasseur), prennent des cartes à Précision, Vengeance et Exécution.
-- Migration de données : le déploiement ne seede jamais. Les cartes sont
-- reconnues par leur image (`<dossier>/<ID>.png`, voir import-cards.mjs),
-- et chaque UPDATE vérifie l'ancien passif pour ne rien écraser d'autre.

UPDATE "Card" SET "passiveKey" = 'TAUNT' WHERE "passiveKey" = 'VAMPIRISM';

UPDATE "Card" SET "passiveKey" = 'TAUNT'
WHERE "passiveKey" = 'CRIT'
  AND ("imageUrl" LIKE '%/DEM-030.png' OR "imageUrl" LIKE '%/ORC-029.png');

UPDATE "Card" SET "passiveKey" = 'GUARDIAN'
WHERE "passiveKey" = 'CRIT'
  AND ("imageUrl" LIKE '%/DRA-027.png' OR "imageUrl" LIKE '%/CEN-034.png');

UPDATE "Card" SET "passiveKey" = 'HUNT'
WHERE ("passiveKey" = 'NEMESIS' AND "imageUrl" LIKE '%/MOR-031.png')
   OR ("passiveKey" = 'EXECUTION' AND "imageUrl" LIKE '%/SIR-035.png');

-- Ennemis stockés en JSON (enemySpecSchema accepte toute clé de passif).
UPDATE "CampaignStage"
SET "enemyTeam" = replace("enemyTeam"::text,
  '"passiveKey": "VAMPIRISM"', '"passiveKey": "TAUNT"')::jsonb
WHERE "enemyTeam"::text LIKE '%"passiveKey": "VAMPIRISM"%';

UPDATE "TowerFloor"
SET "enemyTeam" = replace("enemyTeam"::text,
  '"passiveKey": "VAMPIRISM"', '"passiveKey": "TAUNT"')::jsonb
WHERE "enemyTeam"::text LIKE '%"passiveKey": "VAMPIRISM"%';

UPDATE "RaidBoss"
SET "spec" = replace("spec"::text,
  '"passiveKey": "VAMPIRISM"', '"passiveKey": "TAUNT"')::jsonb
WHERE "spec"::text LIKE '%"passiveKey": "VAMPIRISM"%';
