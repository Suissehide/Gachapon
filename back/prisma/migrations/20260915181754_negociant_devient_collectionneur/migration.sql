-- Le delai entre deux achats de voeu disparait : « Negociant »
-- (WISHLIST_COOLDOWN) perd son objet et devient « Collectionneur »
-- (WISHLIST_SLOTS), qui ajoute des emplacements de voeu — 2 de base, 5 au
-- plafond. Le noeud garde sa position et ses aretes : l'arbre reste a 109
-- points et aucun noeud n'est ajoute.
--
-- Les remises de boutique redescendent de 25 a 18 %. Une remise de X % vaut
-- 1/(1-X) de pouvoir d'achat : 25 % rendait +33 %, cumulables avec le +30 %
-- de « Recyclage », soit x1,73 sur la boucle recyclage -> boutique. A 18 %
-- le gain revient a +22 %. La desirabilite de la branche tient desormais a
-- sa topologie (« Etal elargi » en racine), pas a l'inflation des remises.
--
-- La valeur d'enum WISHLIST_COOLDOWN est CONSERVEE, inutilisee : la retirer
-- forcerait Postgres a recreer le type pour un gain nul.
--
-- Migration de DONNEES, idempotente : les UPDATE convergent, et sur une base
-- vierge ils ne touchent simplement aucune ligne.

UPDATE "SkillNode" n
SET name = 'Collectionneur',
    description = 'Emplacements de vœu supplémentaires (2 de base)',
    icon = 'Heart',
    "effectType" = 'WISHLIST_SLOTS'
FROM "SkillBranch" b
WHERE b.id = n."branchId"
  AND b.name = 'Collection'
  AND n."effectType" = 'WISHLIST_COOLDOWN';

-- Reduction : 5/8/10/12/15 puis 8/13/18/22/25 -> 5/9/12/15/18
UPDATE "SkillNodeLevel" l SET effect = v.new
FROM "SkillNode" n, "SkillBranch" b,
     (VALUES (1,5),(2,9),(3,12),(4,15),(5,18)) AS v(level, new)
WHERE l."nodeId" = n.id AND b.id = n."branchId"
  AND b.name = 'Collection' AND n."effectType" = 'SHOP_DISCOUNT'
  AND l.level = v.level;

-- Marchandeur : 5/10/15 puis 10/18/25 -> 7/13/18
UPDATE "SkillNodeLevel" l SET effect = v.new
FROM "SkillNode" n, "SkillBranch" b,
     (VALUES (1,7),(2,13),(3,18)) AS v(level, new)
WHERE l."nodeId" = n.id AND b.id = n."branchId"
  AND b.name = 'Collection' AND n."effectType" = 'GOLD_SHOP_DISCOUNT'
  AND l.level = v.level;

-- Les points investis dans l'ancien « Negociant » sont rembourses : le noeud
-- ne rend plus du tout la meme chose.
UPDATE "User" u SET "skillPoints" = u."skillPoints" + s.total
FROM (
  SELECT us."userId", SUM(us.level) AS total
  FROM "UserSkill" us
  JOIN "SkillNode" n ON n.id = us."nodeId"
  JOIN "SkillBranch" b ON b.id = n."branchId"
  WHERE b.name = 'Collection' AND n.name = 'Collectionneur'
  GROUP BY us."userId"
) s
WHERE s."userId" = u.id;

DELETE FROM "UserSkill" us
USING "SkillNode" n, "SkillBranch" b
WHERE us."nodeId" = n.id AND b.id = n."branchId"
  AND b.name = 'Collection' AND n.name = 'Collectionneur';

-- La config du delai n'existe plus.
DELETE FROM "GlobalConfig" WHERE key = 'wishlist.cooldownDays';
