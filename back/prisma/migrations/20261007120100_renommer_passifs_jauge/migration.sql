-- Famille jauge / vitesse : les clés de passif PIERCE et BLOODLUST changent
-- de mécanique et de nom (HAMPER = Entrave, MOMENTUM = Élan).
-- Migration de données : le déploiement ne seede jamais.

UPDATE "Card" SET "passiveKey" = 'HAMPER' WHERE "passiveKey" = 'PIERCE';
UPDATE "Card" SET "passiveKey" = 'MOMENTUM' WHERE "passiveKey" = 'BLOODLUST';

-- Ennemis stockés en JSON (enemySpecSchema accepte toute clé de passif).
UPDATE "CampaignStage"
SET "enemyTeam" = replace(replace("enemyTeam"::text,
  '"passiveKey": "PIERCE"', '"passiveKey": "HAMPER"'),
  '"passiveKey": "BLOODLUST"', '"passiveKey": "MOMENTUM"')::jsonb
WHERE "enemyTeam"::text LIKE '%"passiveKey": "PIERCE"%'
   OR "enemyTeam"::text LIKE '%"passiveKey": "BLOODLUST"%';

UPDATE "TowerFloor"
SET "enemyTeam" = replace(replace("enemyTeam"::text,
  '"passiveKey": "PIERCE"', '"passiveKey": "HAMPER"'),
  '"passiveKey": "BLOODLUST"', '"passiveKey": "MOMENTUM"')::jsonb
WHERE "enemyTeam"::text LIKE '%"passiveKey": "PIERCE"%'
   OR "enemyTeam"::text LIKE '%"passiveKey": "BLOODLUST"%';

UPDATE "RaidBoss"
SET "spec" = replace(replace("spec"::text,
  '"passiveKey": "PIERCE"', '"passiveKey": "HAMPER"'),
  '"passiveKey": "BLOODLUST"', '"passiveKey": "MOMENTUM"')::jsonb
WHERE "spec"::text LIKE '%"passiveKey": "PIERCE"%'
   OR "spec"::text LIKE '%"passiveKey": "BLOODLUST"%';
