-- Vitesse alignee sur le bareme des stats en % : la base d'une carte (~100)
-- ne suit pas le niveau, donc un point de VIT plate vaut un point de %, et le
-- banc (scripts/tower-sim.ts) donne a +10 % de VIT la valeur de +10 % d'ATQ.
--   stat principale spdFlat : 2/3/5/8/12 -> 6/9/13/18/24 (MAIN_STAT_SCALE)
--   sous-stat spdFlat       : 1-3        -> 3-8          (x2,75, arrondi)
--
-- Migration de DONNEES : le deploiement ne rejoue jamais le seed et le
-- bootstrap de GlobalConfig est create-only. Chaque bloc est garde par
-- l'ancienne valeur : idempotent, et un reglage admin n'est pas ecrase.

-- Catalogue : les pieces des joueurs pointent sur ces lignes, rien a copier.
UPDATE "Equipment" e
SET "bonuses" = jsonb_build_object('spdFlat', v.nouveau)
FROM (VALUES
  ('COMMON', 2, 6),
  ('UNCOMMON', 3, 9),
  ('RARE', 5, 13),
  ('EPIC', 8, 18),
  ('LEGENDARY', 12, 24)
) AS v(rarity, ancien, nouveau)
WHERE e."mainStat" = 'spdFlat'
  AND e."rarity"::text = v.rarity
  AND (e."bonuses"->>'spdFlat')::numeric = v.ancien;

-- Sous-stats des pieces existantes, puis config.
UPDATE "UserEquipment" ue
SET substats = (
  SELECT jsonb_agg(
    CASE
      WHEN e->>'key' = 'spdFlat'
        THEN jsonb_set(e, '{value}', to_jsonb(round((e->>'value')::numeric * 2.75)))
      ELSE e
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(ue.substats) WITH ORDINALITY AS a(e, ord)
)
WHERE ue.substats @> '[{"key": "spdFlat"}]'::jsonb
  AND COALESCE((SELECT value::numeric FROM "GlobalConfig" WHERE key = 'equip.substatSpdFlatMin'), 1) = 1
  AND COALESCE((SELECT value::numeric FROM "GlobalConfig" WHERE key = 'equip.substatSpdFlatMax'), 3) = 3;

UPDATE "GlobalConfig" SET value = '3', "updatedAt" = now()
WHERE key = 'equip.substatSpdFlatMin' AND value::numeric = 1;
UPDATE "GlobalConfig" SET value = '8', "updatedAt" = now()
WHERE key = 'equip.substatSpdFlatMax' AND value::numeric = 3;
