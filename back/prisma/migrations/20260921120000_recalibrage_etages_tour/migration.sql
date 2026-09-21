-- Recalibrage de la difficulte des 10 etages de tour.
--
-- POURQUOI. L'ancienne courbe ([1, 2.2, ... 16.9]) avait ete ancree sur la
-- JAUGE affichee (`campaign-power.ts`) et non sur les stats. La jauge applique
-- une prime de menace x7 aux attaques AOE_3, et l'etage 10 en alignait TROIS :
-- il atteignait donc les 50 943 points du boss 8-10 avec les stats reelles du
-- stage 5-1. Mesure au simulateur, une equipe niveau 20 en epique niveau 12
-- franchissait les etages 1 a 9 a ~100 %, et le seul mur du jeu etait le
-- changement de pattern au sommet (98 % a l'etage 9, 0 % a l'etage 10).
--
-- Les nouvelles echelles sont FITTEES etage par etage sur le joueur que
-- chaque etage doit accueillir (`prisma/seed/tower-calibration.ts`,
-- TOWER_FLOOR_PROFILES), et `src/test/unit/tower-seed.test.ts` remesure le
-- couple a chaque execution.
--
-- L'etage 10 passe de TROIS unites AOE_3 a UNE. Trois unites qui frappent
-- toute l'equipe, c'est neuf fois les degats entrants d'un trio normal : aux
-- memes stats, une equipe epique n12 gagne 100 % contre trois BASIC et 0 %
-- contre trois AOE_3. Ce n'etait pas un cran de difficulte, c'etait un
-- interrupteur.
--
-- Le BUTIN n'est pas touche : `towerFloorLoot` lit desormais une courbe
-- separee, gelee sur les valeurs d'avant le recalibrage (LOOT_SCALE). Aucun
-- champ `lootTable` n'est ecrit ici.
--
-- Migration de DONNEES parce que le deploiement ne rejoue jamais le seed :
-- `start:migrate:production` = `prisma migrate deploy && node lib/main/index.js`
-- (package.json). Meme raison que 20260916154500_sprites_monstres_tours et
-- 20260908191242_seed_raid_content.
--
-- Chirurgical : seuls les cinq champs de puissance et `attackPattern` sont
-- reecrits. `appearance`, `element`, `level` et `palier` sont conserves tels
-- quels, ainsi que l'ordre des trois ennemis. Idempotent : rejouer la
-- migration recrit les memes valeurs.
--
-- La progression des joueurs n'est PAS reinitialisee : `highestFloor` est
-- conserve, et le balayage d'un etage deja franchi ne rejoue pas le combat.

UPDATE "TowerFloor" f
SET "enemyTeam" = (
  SELECT jsonb_agg(
           e.elem || jsonb_build_object(
             'baseHp', v.hp,
             'baseAtk', v.atk,
             'baseDef', v.def,
             'baseSpd', v.spd,
             'mitigationScale', v.scale,
             'attackPattern',
               CASE WHEN e.ord <= v.aoe THEN 'AOE_3' ELSE 'BASIC' END
           )
           ORDER BY e.ord
         )
  FROM jsonb_array_elements(f."enemyTeam") WITH ORDINALITY AS e(elem, ord)
)
FROM (VALUES
  (1, 845, 155, 43, 102, 2.5, 0),
  (2, 1825, 335, 92, 104, 5.4, 0),
  (3, 3211, 589, 162, 106, 9.5, 0),
  (4, 4563, 837, 230, 108, 13.5, 0),
  (5, 8957, 1643, 451, 110, 26.5, 0),
  (6, 13351, 2449, 672, 112, 39.5, 0),
  (7, 15210, 2790, 765, 114, 45, 0),
  (8, 17238, 3162, 867, 116, 51, 0),
  (9, 19942, 3658, 1003, 118, 59, 0),
  (10, 22815, 4185, 1148, 120, 67.5, 1)
) AS v(idx, hp, atk, def, spd, scale, aoe)
WHERE f."index" = v.idx;
