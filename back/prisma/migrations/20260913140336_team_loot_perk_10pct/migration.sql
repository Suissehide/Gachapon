-- Le bonus « Flux de jetons » redescend de +15 % a +10 % au plafond
-- (1,5 -> 1 par rang, sur dix rangs) : +2,4 jetons par jour et par membre,
-- dix-sept sur la semaine.
--
-- Migration de DONNEES : le bootstrap de `GlobalConfig` est create-only. Le
-- garde sur l'ancienne valeur la rend idempotente et laisse survivre un
-- ajustement manuel.
UPDATE "GlobalConfig" SET value = '1' WHERE key = 'teamPerk.loot.perRank' AND value = '1.5';
