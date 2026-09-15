-- Retrait de la sous-stat %VIT (`spdPct`) du pool d'equipement.
--
-- La cle disparait de SUBSTAT_KEYS, donc de l'enum Zod qui valide les reponses
-- de /equipment : une piece portant encore l'ancienne cle ferait echouer la
-- serialisation de l'inventaire entier. Chaque ligne `spdPct` est donc rerollee
-- sur une autre cle du pool, EN PLACE : la position et le nombre de sous-stats
-- de la piece ne bougent pas, seule la cle et sa valeur changent.
--
-- Les bornes sont lues dans GlobalConfig, avec les DEFAULTS de
-- config.service.ts en repli : sur une base fraiche les migrations tournent
-- avant le bootstrap qui remplit la table.

WITH plages(cle, borne_min, borne_max) AS (
  SELECT
    r.cle,
    COALESCE(
      (SELECT g.value::numeric FROM "GlobalConfig" g WHERE g.key = r.cle_min),
      r.defaut_min
    ),
    COALESCE(
      (SELECT g.value::numeric FROM "GlobalConfig" g WHERE g.key = r.cle_max),
      r.defaut_max
    )
  FROM (VALUES
    ('hpFlat',       'equip.substatHpFlatMin',       'equip.substatHpFlatMax',       20::numeric, 60::numeric),
    ('atkFlat',      'equip.substatAtkFlatMin',      'equip.substatAtkFlatMax',       5,          15),
    ('defFlat',      'equip.substatDefFlatMin',      'equip.substatDefFlatMax',       5,          15),
    ('spdFlat',      'equip.substatSpdFlatMin',      'equip.substatSpdFlatMax',       1,           3),
    ('hpPct',        'equip.substatPctMin',          'equip.substatPctMax',           3,           8),
    ('atkPct',       'equip.substatPctMin',          'equip.substatPctMax',           3,           8),
    ('defPct',       'equip.substatPctMin',          'equip.substatPctMax',           3,           8),
    ('critRatePct',  'equip.substatCritRatePctMin',  'equip.substatCritRatePctMax',   2,           5),
    ('critDmgPct',   'equip.substatCritDmgPctMin',   'equip.substatCritDmgPctMax',    4,          10),
    ('armorPenPct',  'equip.substatArmorPenPctMin',  'equip.substatArmorPenPctMax',   2,           6),
    ('lifestealPct', 'equip.substatLifestealPctMin', 'equip.substatLifestealPctMax',  1,           4)
  ) AS r(cle, cle_min, cle_max, defaut_min, defaut_max)
),
cibles AS (
  SELECT
    ue.id,
    ARRAY(SELECT e->>'key' FROM jsonb_array_elements(ue.substats) AS e) AS cles_prises
  FROM "UserEquipment" ue
  WHERE ue.substats @> '[{"key": "spdPct"}]'::jsonb
),
-- Une cle au hasard parmi celles que la piece ne porte pas deja. Le pool compte
-- 11 cles et une piece en porte au plus 4 : le LATERAL renvoie toujours une
-- ligne.
tirage AS (
  SELECT
    c.id,
    p.cle AS nouvelle_cle,
    -- Arrondi a 0,1 comme `rollValue` cote domaine ; `round(numeric, 1)` fixe
    -- l'echelle, la division par 10 laisserait 16 decimales dans le JSON.
    round(p.borne_min + random()::numeric * (p.borne_max - p.borne_min), 1) AS valeur
  FROM cibles c
  CROSS JOIN LATERAL (
    SELECT pl.cle, pl.borne_min, pl.borne_max
    FROM plages pl
    WHERE NOT (pl.cle = ANY(c.cles_prises))
    ORDER BY random()
    LIMIT 1
  ) p
)
UPDATE "UserEquipment" ue
SET substats = (
  SELECT jsonb_agg(
    CASE
      WHEN e->>'key' = 'spdPct'
        THEN jsonb_build_object('key', t.nouvelle_cle, 'value', t.valeur)
      ELSE e
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(ue.substats) WITH ORDINALITY AS a(e, ord)
)
FROM tirage t
WHERE t.id = ue.id;
