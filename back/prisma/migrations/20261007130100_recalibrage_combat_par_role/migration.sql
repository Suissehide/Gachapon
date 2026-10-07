-- Recalibrage du combat après la hausse des stats de base par archétype
-- (migration 20261007130000) : barème d'équipement, ennemis de campagne, de
-- tour et de raid, PV du raid.
--
-- 1. Équipement. Les % de stat principale (ATQ/PV/DEF) sont DOUBLÉS (24 % à
--    légendaire niveau 1) : à l'ancien barème, une pièce en % ne battait sa
--    version plate qu'en toute fin de progression, et jamais sur une carte
--    commune. La DEF plate a son propre barème, ~2,3x sous celui de l'ATQ :
--    face à une référence de mitigation qui suit le niveau, un bonus plat
--    écrasait le début de jeu (Tank niveau 10 : 25 % -> 76 % de réduction).
--    Les pièces des joueurs lisent la ligne du catalogue : rien à toucher
--    côté UserEquipment.
-- 2. Campagne et tour. Cibles de victoire abaissées de 5 points (étages
--    normaux 83 %, boss 65 %, tour 80 % -> 40 %), courbes refittées au
--    simulateur (scripts/tower-sim.ts, modes fit et campaign-fit) ; la
--    campagne prend une ancre de PV par étage. Seuls les champs de puissance
--    (et attackPattern en tour) sont réécrits ; apparence, élément, niveau,
--    palier et ordre des ennemis sont conservés. Le BUTIN n'est pas touché.
-- 3. Raid. Le boss suit RARITY_BASE.EPIC (x RAID_BOSS_SCALE) ; ses PV par
--    membre et le diviseur de points d'équipe montent de x1,35, la hausse
--    mesurée des dégâts de l'équipe de référence. Les raids déjà ouverts
--    gardent leurs PV figés.
--
-- Migration de DONNÉES : le déploiement ne rejoue jamais le seed, et le
-- bootstrap de GlobalConfig est create-only. Valeurs absolues, gardes sur les
-- anciennes valeurs de config : idempotent. La progression des joueurs n'est
-- pas touchée.

UPDATE "Equipment" e
SET "bonuses" = jsonb_build_object(e."mainStat", v.val)
FROM (VALUES
  ('atkPct', 'COMMON', 6),
  ('atkPct', 'UNCOMMON', 9),
  ('atkPct', 'RARE', 13),
  ('atkPct', 'EPIC', 18),
  ('atkPct', 'LEGENDARY', 24),
  ('defFlat', 'COMMON', 8),
  ('defFlat', 'UNCOMMON', 12),
  ('defFlat', 'RARE', 20),
  ('defFlat', 'EPIC', 32),
  ('defFlat', 'LEGENDARY', 50),
  ('defPct', 'COMMON', 6),
  ('defPct', 'UNCOMMON', 9),
  ('defPct', 'RARE', 13),
  ('defPct', 'EPIC', 18),
  ('defPct', 'LEGENDARY', 24),
  ('hpPct', 'COMMON', 6),
  ('hpPct', 'UNCOMMON', 9),
  ('hpPct', 'RARE', 13),
  ('hpPct', 'EPIC', 18),
  ('hpPct', 'LEGENDARY', 24)
) AS v(stat, rarity, val)
WHERE e."mainStat" = v.stat AND e.rarity::text = v.rarity;

UPDATE "CampaignStage" s
SET "enemyTeam" = (
  SELECT jsonb_agg(
           e.elem || jsonb_build_object(
             'baseHp', v.hp,
             'baseAtk', v.atk,
             'baseDef', v.def,
             'baseSpd', v.spd,
             'mitigationScale', v.scale
           )
           ORDER BY e.ord
         )
  FROM jsonb_array_elements(s."enemyTeam") WITH ORDINALITY AS e(elem, ord)
)
FROM (VALUES
  (1, 1, 161, 31, 18, 89, 1.33871),
  (1, 2, 178, 34, 20, 89, 1.475806),
  (1, 3, 214, 41, 24, 89, 1.774194),
  (1, 4, 256, 50, 29, 89, 2.129032),
  (1, 5, 286, 55, 32, 89, 2.379032),
  (1, 6, 344, 67, 39, 89, 2.854839),
  (1, 7, 412, 80, 46, 89, 3.419355),
  (1, 8, 487, 94, 55, 89, 4.048387),
  (1, 9, 554, 107, 63, 89, 4.604839),
  (1, 10, 1678, 100, 70, 89, 4.525005),
  (2, 1, 691, 149, 73, 95, 4.395062),
  (2, 2, 709, 153, 74, 95, 4.506173),
  (2, 3, 851, 184, 89, 95, 5.407407),
  (2, 4, 898, 194, 94, 95, 5.709877),
  (2, 5, 957, 207, 100, 95, 6.08642),
  (2, 6, 1116, 241, 117, 95, 7.092593),
  (2, 7, 1172, 253, 123, 95, 7.450617),
  (2, 8, 1209, 261, 127, 95, 7.685185),
  (2, 9, 1424, 308, 149, 95, 9.055556),
  (2, 10, 5906, 393, 229, 95, 12.193117),
  (3, 1, 1793, 390, 156, 97, 8.030435),
  (3, 2, 1851, 402, 161, 97, 8.286957),
  (3, 3, 2221, 483, 193, 97, 9.943478),
  (3, 4, 2403, 522, 209, 97, 10.76087),
  (3, 5, 2448, 532, 213, 97, 10.96087),
  (3, 6, 2937, 639, 255, 97, 13.152174),
  (3, 7, 3104, 675, 270, 97, 13.9),
  (3, 8, 3170, 689, 276, 97, 14.195652),
  (3, 9, 3804, 827, 331, 97, 17.034783),
  (3, 10, 12189, 815, 391, 97, 17.723701),
  (4, 1, 4866, 815, 439, 102, 11.037445),
  (4, 2, 5003, 837, 452, 102, 11.348018),
  (4, 3, 5407, 905, 488, 102, 12.264317),
  (4, 4, 5840, 978, 527, 102, 13.246696),
  (4, 5, 6316, 1057, 570, 102, 14.328194),
  (4, 6, 6517, 1091, 589, 102, 14.784141),
  (4, 7, 6635, 1111, 599, 102, 15.050661),
  (4, 8, 6904, 1156, 623, 102, 15.660793),
  (4, 9, 7192, 1204, 650, 102, 16.314978),
  (4, 10, 27944, 1439, 932, 102, 20.585294),
  (5, 1, 9637, 1613, 870, 102, 21.861233),
  (5, 2, 11565, 1936, 1044, 102, 26.23348),
  (5, 3, 13754, 2302, 1242, 102, 31.200441),
  (5, 4, 14426, 2415, 1303, 102, 32.72467),
  (5, 5, 14927, 2499, 1348, 102, 33.861233),
  (5, 6, 14942, 2501, 1349, 102, 33.894273),
  (5, 7, 14956, 2504, 1351, 102, 33.927313),
  (5, 8, 14972, 2506, 1352, 102, 33.962555),
  (5, 9, 14986, 2509, 1353, 102, 33.995595),
  (5, 10, 58176, 2997, 1940, 102, 42.856646),
  (6, 1, 15002, 2511, 1355, 102, 34.030837),
  (6, 2, 15017, 2514, 1356, 102, 34.063877),
  (6, 3, 15032, 2516, 1358, 102, 34.099119),
  (6, 4, 15047, 2519, 1359, 102, 34.132159),
  (6, 5, 15062, 2521, 1360, 102, 34.167401),
  (6, 6, 15259, 2554, 1378, 102, 34.614537),
  (6, 7, 15317, 2564, 1383, 102, 34.744493),
  (6, 8, 15651, 2620, 1413, 102, 35.502203),
  (6, 9, 15666, 2623, 1415, 102, 35.537445),
  (6, 10, 49789, 2565, 1660, 102, 36.67836),
  (7, 1, 20603, 3449, 1861, 102, 46.735683),
  (7, 2, 21164, 3543, 1911, 102, 48.008811),
  (7, 3, 21604, 3616, 1951, 102, 49.006608),
  (7, 4, 22546, 3774, 2036, 102, 51.143172),
  (7, 5, 23323, 3904, 2106, 102, 52.907489),
  (7, 6, 23980, 4014, 2166, 102, 54.396476),
  (7, 7, 24653, 4127, 2226, 102, 55.922907),
  (7, 8, 25531, 4274, 2306, 102, 57.914097),
  (7, 9, 26411, 4421, 2385, 102, 59.911894),
  (7, 10, 74753, 3850, 2493, 102, 55.068277),
  (8, 1, 26945, 4511, 2433, 102, 61.123348),
  (8, 2, 26972, 4515, 2436, 102, 61.185022),
  (8, 3, 27950, 4679, 2524, 102, 63.403084),
  (8, 4, 28783, 4818, 2599, 102, 65.292952),
  (8, 5, 29106, 4872, 2628, 102, 66.024229),
  (8, 6, 29181, 4885, 2635, 102, 66.196035),
  (8, 7, 29810, 4990, 2692, 102, 67.621145),
  (8, 8, 30485, 5103, 2753, 102, 69.151982),
  (8, 9, 31090, 5205, 2808, 102, 70.526432),
  (8, 10, 118956, 6127, 3967, 102, 87.63164),
  (9, 1, 31727, 5311, 2865, 102, 71.971366),
  (9, 2, 31784, 5321, 2870, 102, 72.099119),
  (9, 3, 31815, 5326, 2873, 102, 72.169604),
  (9, 4, 31847, 5331, 2876, 102, 72.242291),
  (9, 5, 31879, 5337, 2879, 102, 72.314978),
  (9, 6, 31911, 5342, 2882, 102, 72.387665),
  (9, 7, 31943, 5347, 2885, 102, 72.460352),
  (9, 8, 31974, 5352, 2888, 102, 72.530837),
  (9, 9, 32006, 5358, 2890, 102, 72.603524),
  (9, 10, 118622, 6110, 3955, 102, 87.385602)
) AS v(chap, idx, hp, atk, def, spd, scale)
WHERE s.chapter = v.chap AND s."index" = v.idx;

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
  (1, 1180, 198, 107, 102, 2.6, 0),
  (2, 2815, 471, 254, 104, 6.2, 0),
  (3, 4994, 836, 451, 106, 11, 0),
  (4, 7355, 1231, 664, 108, 16.2, 0),
  (5, 15209, 2546, 1374, 110, 33.5, 0),
  (6, 23154, 3876, 2091, 112, 51, 0),
  (7, 25379, 4248, 2292, 114, 55.9, 0),
  (8, 29782, 4986, 2690, 116, 65.6, 0),
  (9, 35594, 5958, 3214, 118, 78.4, 0),
  (10, 42903, 7182, 3875, 120, 94.5, 1)
) AS v(idx, hp, atk, def, spd, scale, aoe)
WHERE f."index" = v.idx;

UPDATE "RaidBoss"
SET "spec" = "spec" || jsonb_build_object(
  'baseHp', 454,
  'baseAtk', 912,
  'baseDef', 492,
  'baseSpd', 102,
  'mitigationScale', 12
);

UPDATE "GlobalConfig" SET value = '153000'
WHERE key = 'raid.baseHpPerMember' AND value = '113400';
UPDATE "GlobalConfig" SET value = '405'
WHERE key = 'teamPoints.damagePerPoint' AND value = '300';
