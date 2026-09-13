-- Le bonus `loot` passe de +2,5 % a +15 % de vitesse de regeneration au
-- plafond (0,25 -> 1,5 par rang, sur dix rangs).
--
-- L'ancienne valeur ne se sentait pas : intervalle de base 60 minutes, donc
-- 24 jetons par jour, et +2,5 % en ajoutait 0,6 — quatre par semaine. A +15 %
-- le membre gagne 3,6 jetons par jour, vingt-cinq sur la semaine.
--
-- Migration de DONNEES : le bootstrap de `GlobalConfig` est create-only. Le
-- garde sur l'ancienne valeur la rend idempotente.
UPDATE "GlobalConfig" SET value = '1.5' WHERE key = 'teamPerk.loot.perRank' AND value = '0.25';
