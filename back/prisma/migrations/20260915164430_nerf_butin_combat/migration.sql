-- Nerf de la branche Combat de l'arbre de competences : les trois noeuds de
-- butin voient leur rendement divise par ~3. Un joueur niveau 100 dispose de
-- 109 points pour un arbre qui en coute 126 : il maxait donc les trois sans
-- arbitrage reel, et sortait avec +40 % d'or, +50 % d'XP et +120 % de chance
-- de butin.
--
--   Butin dore       (GOLD_BONUS)       10/20/30/40         -> 3/6/10/13
--   Veteran          (COMBAT_XP_BONUS)  10/20/30/40/50      -> 3/7/10/14/17
--   Apogee de Combat (DROP_BONUS)       20/40/60/80/100/120 -> 7/13/20/27/33/40
--
-- Migration de DONNEES : `prisma/seed.ts` recree l'arbre en repartant d'un
-- deleteMany qui emporte aussi battleResult / userCard / userSkill. Rejouer le
-- seed pour trois valeurs effacerait la progression des joueurs, d'ou ces
-- UPDATE cibles. Le garde sur l'ancienne valeur les rend idempotents et laisse
-- survivre un reglage manuel, comme pour 20260913140336_team_loot_perk_10pct.
--
-- Les points DEJA investis ne sont pas rembourses : le nombre de niveaux par
-- noeud ne change pas, seul l'effet de chaque niveau baisse.

UPDATE "SkillNodeLevel" l SET effect = v.new
FROM "SkillNode" n,
     (VALUES
       ('GOLD_BONUS',      1,  10,   3),
       ('GOLD_BONUS',      2,  20,   6),
       ('GOLD_BONUS',      3,  30,  10),
       ('GOLD_BONUS',      4,  40,  13),
       ('COMBAT_XP_BONUS', 1,  10,   3),
       ('COMBAT_XP_BONUS', 2,  20,   7),
       ('COMBAT_XP_BONUS', 3,  30,  10),
       ('COMBAT_XP_BONUS', 4,  40,  14),
       ('COMBAT_XP_BONUS', 5,  50,  17),
       ('DROP_BONUS',      1,  20,   7),
       ('DROP_BONUS',      2,  40,  13),
       ('DROP_BONUS',      3,  60,  20),
       ('DROP_BONUS',      4,  80,  27),
       ('DROP_BONUS',      5, 100,  33),
       ('DROP_BONUS',      6, 120,  40)
     ) AS v(effect_type, level, old, new)
WHERE l."nodeId" = n.id
  AND n."effectType" = v.effect_type::"SkillEffectType"
  AND l.level = v.level
  AND l.effect = v.old;

-- La description du noeud suit le changement de portee : `dropBonus` ne
-- multiplie plus la chance de CARTE, seulement celle d'equipement.
UPDATE "SkillNode"
SET description = 'Bonus de chance d''équipement en combat'
WHERE "effectType" = 'DROP_BONUS'
  AND description = 'Bonus de butin en combat';
