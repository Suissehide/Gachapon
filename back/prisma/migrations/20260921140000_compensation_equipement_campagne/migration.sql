-- Compensation d'equipement de la campagne.
--
-- POURQUOI. `enemyScale` ne suivait que la progression en NIVEAU du joueur.
-- Or celui-ci s'equipe en jouant, et l'equipement pese lourd : mesure au
-- simulateur avec le VRAI catalogue (sous-stats, bonus de set, bloc
-- crit/penetration), la campagne ENTIERE se gagnait a 100 % -- boss 9-10
-- compris -- avec sept pieces rares niveau 3.
--
-- Le modele qui avait servi a la calibrer (`GEAR_PROFILES` dans
-- `scripts/balance-sim.ts`) reduit l'equipement a trois pourcentages
-- hp/atk/def et ignore le bloc crit / degats critiques / penetration, lequel
-- ne depend NI du niveau NI du palier -- d'ou l'ecart historique entre « le
-- modele annonce 0 % de victoire des le chapitre 3 » et « les joueurs
-- passent ».
--
-- La compensation est fittee par chapitre (deux bornes interpolees,
-- `GEAR_COMPENSATION_BY_CHAPTER`) plutot que par une formule lisse : le taux
-- de victoire est quasi binaire en fonction des stats (23 % d'ecart separent
-- 90 % et 10 % de victoire) et la compensation requise n'est pas monotone
-- d'un chapitre a l'autre, le joueur gagnant par paliers (7e piece, montee en
-- rarete). Les boss ont leur propre facteur (`BOSS_GEAR_COMPENSATION`) : leur
-- cible differe (70 % contre 88 %) et leurs multiplicateurs propres (PV
-- x3.25, AOE_3) ne tombent pas au meme endroit selon le chapitre.
--
-- Resultat mesure : etages normaux entre 80 % et 92 % (cible 88 %), les neuf
-- boss entre 64 % et 72 % (cible 70 %). Le chapitre 1 reste un tutoriel qu'on
-- gagne, et l'etage 1-1 est inchange au point pres.
--
-- Le BUTIN n'est pas touche : il passe par `difficultyMult` (CURVE_A/CURVE_B),
-- une courbe independante de `enemyScale`. Aucun champ `lootTable` n'est
-- ecrit ici, et un test verrouille les valeurs.
--
-- Migration de DONNEES parce que le deploiement ne rejoue jamais le seed :
-- `start:migrate:production` = `prisma migrate deploy && node lib/main/index.js`.
-- Meme raison que 20260921120000_recalibrage_etages_tour.
--
-- Chirurgical : seuls baseHp, baseAtk, baseDef et mitigationScale sont
-- reecrits. `baseSpd` (qui ne suit pas l'echelle), `attackPattern`,
-- `appearance`, `element`, `level` et `palier` sont conserves, ainsi que
-- l'ordre des ennemis. Idempotent.
--
-- La progression des joueurs n'est PAS reinitialisee.

UPDATE "CampaignStage" s
SET "enemyTeam" = (
  SELECT jsonb_agg(
           e.elem || jsonb_build_object(
             'baseHp', v.hp,
             'baseAtk', v.atk,
             'baseDef', v.def,
             'mitigationScale', v.scale
           )
           ORDER BY e.ord
         )
  FROM jsonb_array_elements(s."enemyTeam") WITH ORDINALITY AS e(elem, ord)
)
FROM (VALUES
  (1, 1, 98, 19, 5, 1),
  (1, 2, 110, 22, 5, 1.125471),
  (1, 3, 123, 24, 6, 1.257676),
  (1, 4, 137, 27, 7, 1.396837),
  (1, 5, 151, 30, 7, 1.543177),
  (1, 6, 166, 33, 8, 1.696929),
  (1, 7, 182, 36, 9, 1.858329),
  (1, 8, 199, 39, 10, 2.027621),
  (1, 9, 216, 43, 11, 2.205055),
  (1, 10, 647, 39, 12, 2.142813),
  (2, 1, 513, 110, 27, 3.916187),
  (2, 2, 540, 116, 28, 4.11808),
  (2, 3, 565, 121, 29, 4.311738),
  (2, 4, 589, 127, 31, 4.495453),
  (2, 5, 612, 131, 32, 4.667428),
  (2, 6, 633, 136, 33, 4.825777),
  (2, 7, 651, 140, 34, 4.968519),
  (2, 8, 668, 143, 35, 5.093575),
  (2, 9, 681, 146, 35, 5.198766),
  (2, 10, 2568, 170, 49, 6.363083),
  (3, 1, 1307, 272, 68, 7.013057),
  (3, 2, 1349, 281, 70, 7.237835),
  (3, 3, 1391, 290, 72, 7.460923),
  (3, 4, 1432, 298, 75, 7.68212),
  (3, 5, 1473, 307, 77, 7.90122),
  (3, 6, 1513, 315, 79, 8.118009),
  (3, 7, 1553, 324, 81, 8.332266),
  (3, 8, 1593, 332, 83, 8.543761),
  (3, 9, 1632, 340, 85, 8.752259),
  (3, 10, 4759, 305, 92, 8.288947),
  (4, 1, 3109, 570, 156, 9.473834),
  (4, 2, 3182, 584, 160, 9.693868),
  (4, 3, 3253, 597, 164, 9.910921),
  (4, 4, 3323, 610, 167, 10.124748),
  (4, 5, 3392, 622, 171, 10.335094),
  (4, 6, 3460, 635, 174, 10.541697),
  (4, 7, 3526, 647, 177, 10.744286),
  (4, 8, 3591, 659, 181, 10.94258),
  (4, 9, 3655, 670, 184, 11.13629),
  (4, 10, 11770, 664, 219, 11.64634),
  (5, 1, 13241, 2211, 677, 23.230637),
  (5, 2, 13519, 2257, 691, 23.718313),
  (5, 3, 13795, 2303, 705, 24.202985),
  (5, 4, 14069, 2349, 719, 24.684276),
  (5, 5, 14342, 2394, 733, 25.161795),
  (5, 6, 14611, 2439, 747, 25.635136),
  (5, 7, 14879, 2484, 760, 26.103882),
  (5, 8, 15143, 2528, 774, 26.5676),
  (5, 9, 15404, 2572, 787, 27.025841),
  (5, 10, 52376, 2691, 988, 29.841586),
  (6, 1, 16316, 2724, 834, 28.624898),
  (6, 2, 16600, 2771, 848, 29.123919),
  (6, 3, 16882, 2818, 863, 29.618385),
  (6, 4, 17161, 2865, 877, 30.107859),
  (6, 5, 17437, 2911, 891, 30.59189),
  (6, 6, 17709, 2957, 905, 31.070011),
  (6, 7, 17978, 3001, 919, 31.54174),
  (6, 8, 18243, 3046, 932, 32.006578),
  (6, 9, 18504, 3089, 946, 32.464013),
  (6, 10, 60417, 3104, 1140, 34.423234),
  (7, 1, 21760, 3633, 1112, 38.176267),
  (7, 2, 22086, 3687, 1129, 38.74832),
  (7, 3, 22408, 3741, 1145, 39.313826),
  (7, 4, 22726, 3794, 1161, 39.872243),
  (7, 5, 23040, 3847, 1178, 40.423012),
  (7, 6, 23349, 3898, 1193, 40.965555),
  (7, 7, 23654, 3949, 1209, 41.499273),
  (7, 8, 23952, 3999, 1224, 42.023552),
  (7, 9, 24246, 4048, 1239, 42.537753),
  (7, 10, 69049, 3547, 1303, 39.341019),
  (8, 1, 27945, 4665, 1428, 49.02794),
  (8, 2, 27973, 4670, 1430, 49.076968),
  (8, 3, 28001, 4675, 1431, 49.126045),
  (8, 4, 28029, 4679, 1432, 49.175171),
  (8, 5, 28057, 4684, 1434, 49.224347),
  (8, 6, 28085, 4689, 1435, 49.273571),
  (8, 7, 28113, 4693, 1437, 49.322844),
  (8, 8, 28141, 4698, 1438, 49.372167),
  (8, 9, 28169, 4703, 1440, 49.421539),
  (8, 10, 105062, 5397, 1983, 59.859863),
  (9, 1, 31998, 5342, 1635, 56.138701),
  (9, 2, 32030, 5347, 1637, 56.194839),
  (9, 3, 32062, 5353, 1639, 56.251034),
  (9, 4, 32094, 5358, 1640, 56.307285),
  (9, 5, 32126, 5363, 1642, 56.363593),
  (9, 6, 32158, 5369, 1644, 56.419956),
  (9, 7, 32190, 5374, 1645, 56.476376),
  (9, 8, 32222, 5380, 1647, 56.532852),
  (9, 9, 32255, 5385, 1648, 56.589385),
  (9, 10, 122288, 6282, 2308, 69.674549)
) AS v(chap, idx, hp, atk, def, scale)
WHERE s.chapter = v.chap AND s."index" = v.idx;
