-- Le bonus de lot par niveau devient un POURCENTAGE de la base de chaque
-- palier. Les trois montants plats faisaient croître les petits paliers plus
-- vite que les PV du boss, ce qui rendait la montée en difficulté plus
-- rentable par point d'effort au lieu de moins.
DELETE FROM "GlobalConfig"
WHERE key IN (
  'raid.levelRewardTokens',
  'raid.levelRewardGold',
  'raid.levelRewardDust'
);

-- Le bootstrap est create-only : il créerait bien cette clé au prochain
-- démarrage, mais on ne laisse pas une instance déjà lancée sans elle.
INSERT INTO "GlobalConfig" (key, value, "updatedAt")
VALUES ('raid.levelRewardPct', '5', now())
ON CONFLICT (key) DO NOTHING;

-- Barème de jetons du raid revu à la baisse (5/10/15/25 -> 3/5/8/13). Le
-- déploiement ne lance jamais le seed : sans cette migration, les instances
-- existantes garderaient l'ancien barème.
UPDATE "Rewards" r
SET tokens = v.tokens
FROM "RaidTier" rt
JOIN (VALUES (25, 3), (50, 5), (75, 8), (100, 13)) AS v(pct, tokens)
  ON v.pct = rt.pct
WHERE rt."rewardId" = r.id AND rt.level = 0;

-- Les paliers dérivés reposaient sur l'ancienne base ET l'ancienne formule :
-- ils se régénéreront au prochain franchissement. On supprime les LIGNES de
-- palier, jamais les `Reward` — ceux-là sont pointés par des `UserReward`
-- déjà distribués, et un lot distribué est de l'historique.
DELETE FROM "RaidTier" WHERE level > 0;
