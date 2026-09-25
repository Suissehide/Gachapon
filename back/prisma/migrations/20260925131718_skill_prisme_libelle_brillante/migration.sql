-- Le nœud Prisme affichait « variantes Brillant/Holo » alors que tout le site
-- dit « Brillante » (accordé à « carte »). skills.definitions.ts est corrigé,
-- mais le bootstrap de traductions ne resynchronise que les colonnes EN :
-- sans cette migration, staging et prod garderaient l'ancien libellé.
UPDATE "SkillNode"
SET "descriptionFr" = 'Augmente les chances de variantes Brillante/Holo'
WHERE "descriptionFr" = 'Augmente les chances de variantes Brillant/Holo';
