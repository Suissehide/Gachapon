-- Bonus d'equipe au plafond (rang 10) : loot +40 %, xp +30 %, forge -30 %.
--
-- Migration de DONNEES : le bootstrap de `GlobalConfig` est create-only. Le
-- garde sur l'ancienne valeur la rend idempotente et laisse survivre un
-- ajustement manuel.
UPDATE "GlobalConfig" SET value = '4' WHERE key = 'teamPerk.loot.perRank' AND value = '1';
UPDATE "GlobalConfig" SET value = '3' WHERE key = 'teamPerk.xp.perRank' AND value = '0.4';
UPDATE "GlobalConfig" SET value = '3' WHERE key = 'teamPerk.forge.perRank' AND value = '0.5';
