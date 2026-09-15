-- Toute valeur de stat devient entiere : `rollValue` et `scaleBaseBonuses`
-- arrondissent desormais a l'unite cote domaine, mais les pieces deja tirees
-- portent encore des sous-stats a la decimale (5.3, 42.5). Sans ce rattrapage,
-- deux pieces identiques afficheraient des valeurs de formes differentes.
--
-- `baseBoost` est un Float et vaut 0 partout aujourd'hui ; on l'arrondit avec,
-- pour que la colonne ne puisse plus reintroduire de decimale.

UPDATE "UserEquipment" ue
SET substats = (
  SELECT jsonb_agg(
    jsonb_build_object('key', e->>'key', 'value', round((e->>'value')::numeric))
    ORDER BY ord
  )
  FROM jsonb_array_elements(ue.substats) WITH ORDINALITY AS a(e, ord)
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(ue.substats) AS e
  WHERE (e->>'value')::numeric <> round((e->>'value')::numeric)
);

UPDATE "UserEquipment"
SET "baseBoost" = round("baseBoost"::numeric)
WHERE "baseBoost" <> round("baseBoost"::numeric);
