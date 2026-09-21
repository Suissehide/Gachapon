-- Reequilibrage economique du 2026-09-21. AUCUN changement de schema.
--
-- Migration de DONNEES, necessaire parce que le deploiement ne rejoue jamais
-- le seed et que le bootstrap de `GlobalConfig` est create-only : ni les prix
-- de boutique ni les effets de noeuds deja en base ne bougeraient d'eux-memes.
-- Chaque UPDATE est garde sur l'ANCIENNE valeur, donc idempotent, et laisse
-- survivre un reglage manuel fait depuis /admin.
--
-- 1. PACKS D'ENERGIE x3
--    Un pack s'achete en poussiere et rend des points de combat, qui rendent
--    eux-memes de la poussiere en farmant. A 18-20 poussiere par point, le
--    prix etait SOUS le rendement du meilleur etage (21,6 au boss 9-10) :
--    acheter de l'energie rapportait 120 % de sa mise des le chapitre 8, et
--    `shop.energyDailyCap` restait le seul frein du jeu. Le prix vise
--    desormais ~2,5x le meilleur rendement de farm.
UPDATE "ShopItem" SET cost = 900  WHERE type = 'ENERGY_PACK' AND name = 'Petite recharge' AND cost = 300;
UPDATE "ShopItem" SET cost = 2280 WHERE type = 'ENERGY_PACK' AND name = 'Recharge'        AND cost = 760;
UPDATE "ShopItem" SET cost = 4860 WHERE type = 'ENERGY_PACK' AND name = 'Grande recharge' AND cost = 1620;

-- 2. NOEUD « Voeu exauce » : 10/20/30/40 -> 2/4/6/8
--    Le noeud ne touche JAMAIS aux cotes de rarete : il choisit LAQUELLE des
--    cartes de la rarete tiree on recoit. A 40 % il divisait par deux le
--    nombre de tirages d'une ascension ciblee (6 doublons de la carte exacte),
--    soit cinq fois l'effet de « Boule d'or », son voisin direct de branche a
--    nombre de niveaux egal. Il est desormais aligne sur ce voisin.
--
--    Les points DEJA investis ne sont pas rembourses : le nombre de niveaux du
--    noeud ne change pas, seul l'effet de chaque niveau baisse. Meme parti pris
--    que 20260915164430_nerf_butin_combat.
UPDATE "SkillNodeLevel" l SET effect = v.new
FROM "SkillNode" n,
     (VALUES
       (1, 10, 2),
       (2, 20, 4),
       (3, 30, 6),
       (4, 40, 8)
     ) AS v(level, old, new)
WHERE l."nodeId" = n.id
  AND n."effectType" = 'WISHLIST_PULL_CHANCE'
  AND l.level = v.level
  AND l.effect = v.old;

-- 3. FACTEUR DE PRIX DES VOEUX, par rarete
--    Le facteur unique a 2 ne pouvait pas tenir les deux bouts du bareme :
--    le monter assez pour que le rare cesse d'etre une journee de revenu
--    envoyait le legendaire a 80 jours d'epargne. Le legendaire descend donc a
--    2,5 la ou le milieu de bareme monte a 5.
--
--    Les cinq nouvelles cles sont creees par le bootstrap au demarrage (create
--    only) ; on ne fait ici que supprimer l'ancienne ligne devenue orpheline,
--    pour qu'elle ne traine pas dans /admin/config.
DELETE FROM "GlobalConfig" WHERE key = 'wishlist.priceMultiplier';
