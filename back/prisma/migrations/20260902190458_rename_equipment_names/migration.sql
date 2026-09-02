-- Aligne le NOM des pièces déjà en base sur les nouveaux libellés de slot.
--
-- La migration précédente renommait la valeur d'enum, pas la colonne `name` :
-- les pièces gardaient « Sève de Fureur (épique) » alors que leur slot était
-- devenu AMULET. Les noms sont générés par le seed comme
-- « <libellé de slot> de <libellé de set> (<rareté>) » — voir
-- prisma/seed/equipment.ts — donc seul le préfixe change.
--
-- Écrite à la main pour la même raison que la précédente : Prisma ne modélise
-- pas les données, seulement le schéma. Idempotente par construction — après
-- exécution, plus aucune ligne ne satisfait les clauses WHERE.

UPDATE "Equipment" SET name = 'Anneau de '   || substring(name from 15) WHERE name LIKE 'Accessoire de %';
UPDATE "Equipment" SET name = 'Amulette de ' || substring(name from 9)  WHERE name LIKE 'Sève de %';
UPDATE "Equipment" SET name = 'Gants de '    || substring(name from 11) WHERE name LIKE 'Braise de %';
UPDATE "Equipment" SET name = 'Bottes de '   || substring(name from 11) WHERE name LIKE 'Prisme de %';
UPDATE "Equipment" SET name = 'Ceinture de ' || substring(name from 14) WHERE name LIKE 'Monolithe de %';
