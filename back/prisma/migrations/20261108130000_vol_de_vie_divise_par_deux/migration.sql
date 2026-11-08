-- Vol de vie divisé par deux : set.sangsueLifestealPct 16 -> 8,
-- equip.substatLifestealPct 1-4 -> 1-2 (config.service.ts, DEFAULTS).
-- GlobalConfig est create-only, et les sous-stats déjà tirées sont divisées
-- par deux (plancher 1). Gardé par « config encore à l'ancienne valeur ».

UPDATE "UserEquipment" ue
SET substats = (
  SELECT jsonb_agg(
    CASE
      WHEN e->>'key' = 'lifestealPct'
        THEN jsonb_set(e, '{value}', to_jsonb(GREATEST(1, round((e->>'value')::numeric / 2))))
      ELSE e
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(ue.substats) WITH ORDINALITY AS a(e, ord)
)
WHERE ue.substats @> '[{"key": "lifestealPct"}]'::jsonb
  AND COALESCE((SELECT value::numeric FROM "GlobalConfig" WHERE key = 'equip.substatLifestealPctMin'), 1) = 1
  AND COALESCE((SELECT value::numeric FROM "GlobalConfig" WHERE key = 'equip.substatLifestealPctMax'), 4) = 4;

UPDATE "GlobalConfig" SET value = '2', "updatedAt" = now()
WHERE key = 'equip.substatLifestealPctMax' AND value::numeric = 4;

UPDATE "GlobalConfig" SET value = '8', "updatedAt" = now()
WHERE key = 'set.sangsueLifestealPct' AND value::numeric = 16;
