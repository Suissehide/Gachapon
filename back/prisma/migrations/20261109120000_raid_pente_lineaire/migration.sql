-- Raid : montée en difficulté linéaire et bien plus raide. Le boss est le
-- même pour toutes les équipes et un membre de fin de jeu tuait seul le boss
-- de base le premier jour ; à +10 % composés par victoire, le niveau mettait
-- des dizaines de semaines à suivre. Désormais le niveau n vaut (1 + n) boss
-- de base, et les lots suivent à moitié (invariant raid-rules.test.ts).
--
-- Migration de DONNÉES : le bootstrap de `GlobalConfig` est create-only. Les
-- gardes sur les anciennes valeurs la rendent idempotente et laissent
-- survivre un ajustement manuel. Les raids déjà créés gardent leurs PV
-- figés : la pente vaut à partir du prochain raid de chaque équipe.
UPDATE "GlobalConfig" SET value = '100' WHERE key = 'raid.levelHpBonusPct' AND value = '10';
UPDATE "GlobalConfig" SET value = '50' WHERE key = 'raid.levelRewardPct' AND value = '5';
-- Base comptée pour 3 attaques par jour (bonus d'équipe `raid` au rang 2,
-- vite obtenu) : 16,5 attaques par membre et par semaine au lieu de 11.
UPDATE "GlobalConfig" SET value = '246000' WHERE key = 'raid.baseHpPerMember' AND value = '164000';

-- Paliers dérivés (niveaux > 0) : régénérés à la demande avec la nouvelle
-- pente (raid.repository#ensureTiersForLevel). On supprime les LIGNES de
-- palier, jamais les `Reward`, pointés par des `UserReward` déjà versés ; la
-- clé de versement est `<raidId>:<pct>`, donc rien n'est versé deux fois.
DELETE FROM "RaidTier" WHERE level > 0;
