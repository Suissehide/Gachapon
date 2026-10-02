-- Raid plus facile : PV du boss baissés de 30 %, et la carte épique du
-- palier 100 % réservée aux niveaux >= 3 (RAID_EPIC_CARD_MIN_LEVEL).
--
-- Migration de DONNÉES : le bootstrap de `GlobalConfig` est create-only. Les
-- gardes sur les anciennes valeurs la rendent idempotente et laissent
-- survivre un ajustement manuel. Les raids déjà créés gardent leurs PV
-- figés : la baisse vaut à partir du prochain raid de chaque équipe.
UPDATE "GlobalConfig" SET value = '113400' WHERE key = 'raid.baseHpPerMember' AND value = '162000';

-- Ligne de base (niveau 0) du palier 100 % : plus de carte.
UPDATE "Rewards" SET "cardRarity" = NULL
WHERE "cardRarity" = 'EPIC'
  AND id IN (SELECT "rewardId" FROM "RaidTier" WHERE pct = 100 AND level = 0);

-- Paliers dérivés (niveaux > 0) : régénérés à la demande avec la nouvelle
-- règle (raid.repository#ensureTiersForLevel). On supprime les LIGNES de
-- palier, jamais les `Reward`, pointés par des `UserReward` déjà versés ; la
-- clé de versement est `<raidId>:<pct>`, donc rien n'est versé deux fois.
DELETE FROM "RaidTier" WHERE level > 0;
