-- « Etal elargi » remonte en racine de Collection, et se retrouvait en
-- (-144, 168) — a 72 px en x comme en y de « Recuperation » (-216, 96), qui
-- appartient a la branche Combat. Les noeuds font 90x80 px : les deux se
-- chevauchaient a l'ecran.
--
-- Le sous-arbre « Etal elargi » passe donc a DROITE, ou Combat ne s'etale
-- pas. Apres deplacement, la paire la plus serree de tout l'arbre garde 1,6
-- fois la taille d'un noeud.
--
-- Migration de DONNEES, idempotente : les UPDATE convergent, et sur une base
-- vierge ils ne touchent aucune ligne.

UPDATE "SkillNode" n SET "posX" = v.x, "posY" = v.y
FROM "SkillBranch" b,
     (VALUES
       ('Étal élargi',           144, 168),
       ('Apogée de Collection',  144, 336),
       ('Collectionneur',        144, 504),
       ('Recyclage',             -72, 168),
       ('Artisan',              -144, 336),
       ('Réduction',               0, 336),
       ('Marchandeur',           -72, 504)
     ) AS v(name, x, y)
WHERE b.id = n."branchId" AND b.name = 'Collection' AND n.name = v.name;
