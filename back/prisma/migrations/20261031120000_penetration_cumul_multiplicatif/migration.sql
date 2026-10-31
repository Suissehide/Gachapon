-- Pénétration d'armure cumulée par source, à la LoL : 1 − Π(1 − pᵢ) au lieu
-- d'une somme (stackArmorPen, combat-stats.domain.ts). Le cumul rendant moins
-- qu'avant, la stat principale armorPenPct du catalogue est relevée d'environ
-- 12 % : 7/11/17/26/40 -> 8/12/19/29/45 (campaign-balance.test.ts).
--
-- Migration de DONNÉES : le déploiement ne rejoue jamais le seed. Garde sur
-- l'ancienne valeur : idempotent.

UPDATE "Equipment" e
SET "bonuses" = jsonb_build_object('armorPenPct', v.nouveau)
FROM (VALUES
  ('COMMON', 7, 8),
  ('UNCOMMON', 11, 12),
  ('RARE', 17, 19),
  ('EPIC', 26, 29),
  ('LEGENDARY', 40, 45)
) AS v(rarity, ancien, nouveau)
WHERE e."mainStat" = 'armorPenPct'
  AND e."rarity"::text = v.rarity
  AND (e."bonuses"->>'armorPenPct')::numeric = v.ancien;
