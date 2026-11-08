-- Realignement des sous-stats plates ATQ et PV sur le rapport plat/% de la
-- stat principale (config.service.ts, DEFAULTS) :
--   atkFlat 5-15  -> 13-38  (x2,55)
--   hpFlat  20-60 -> 60-180 (x3)
--
-- Le bootstrap de GlobalConfig est create-only : sans cette migration, une
-- base existante garderait les anciennes bornes. Les pieces deja tirees sont
-- rescalees du meme facteur, sinon tout l'inventaire existant serait
-- strictement inferieur aux nouveaux drops.
--
-- Chaque bloc est garde par « la config est encore a l'ancienne valeur par
-- defaut » : une valeur reglee a la main par un admin n'est pas touchee, et
-- les pieces ne sont pas rescalees si les bornes n'etaient pas celles-la.
-- Sur une base fraiche, GlobalConfig et UserEquipment sont vides : no-op.

-- ATQ plate : pieces, puis config.
UPDATE "UserEquipment" ue
SET substats = (
  SELECT jsonb_agg(
    CASE
      WHEN e->>'key' = 'atkFlat'
        THEN jsonb_set(e, '{value}', to_jsonb(round((e->>'value')::numeric * 2.55)))
      ELSE e
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(ue.substats) WITH ORDINALITY AS a(e, ord)
)
WHERE ue.substats @> '[{"key": "atkFlat"}]'::jsonb
  AND COALESCE((SELECT value::numeric FROM "GlobalConfig" WHERE key = 'equip.substatAtkFlatMin'), 5) = 5
  AND COALESCE((SELECT value::numeric FROM "GlobalConfig" WHERE key = 'equip.substatAtkFlatMax'), 15) = 15;

UPDATE "GlobalConfig" SET value = '13', "updatedAt" = now()
WHERE key = 'equip.substatAtkFlatMin' AND value::numeric = 5;
UPDATE "GlobalConfig" SET value = '38', "updatedAt" = now()
WHERE key = 'equip.substatAtkFlatMax' AND value::numeric = 15;

-- PV plats : pieces, puis config.
UPDATE "UserEquipment" ue
SET substats = (
  SELECT jsonb_agg(
    CASE
      WHEN e->>'key' = 'hpFlat'
        THEN jsonb_set(e, '{value}', to_jsonb(round((e->>'value')::numeric * 3)))
      ELSE e
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(ue.substats) WITH ORDINALITY AS a(e, ord)
)
WHERE ue.substats @> '[{"key": "hpFlat"}]'::jsonb
  AND COALESCE((SELECT value::numeric FROM "GlobalConfig" WHERE key = 'equip.substatHpFlatMin'), 20) = 20
  AND COALESCE((SELECT value::numeric FROM "GlobalConfig" WHERE key = 'equip.substatHpFlatMax'), 60) = 60;

UPDATE "GlobalConfig" SET value = '60', "updatedAt" = now()
WHERE key = 'equip.substatHpFlatMin' AND value::numeric = 20;
UPDATE "GlobalConfig" SET value = '180', "updatedAt" = now()
WHERE key = 'equip.substatHpFlatMax' AND value::numeric = 60;
