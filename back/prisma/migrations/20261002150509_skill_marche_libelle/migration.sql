-- « Vitrine » devient « Marché ». Couvre aussi les bases où la migration
-- précédente (boutique du jour → vitrine) vient d'être appliquée dans le même
-- déploiement : le bootstrap de traductions ne resynchronise que l'EN.
UPDATE "SkillNode"
SET "descriptionFr" = 'Plus de cartes rares au marché'
WHERE "descriptionFr" IN (
  'Plus de cartes rares dans ta vitrine',
  'Plus de cartes rares dans ta boutique du jour'
);

UPDATE "SkillNode"
SET "descriptionFr" = 'Cartes supplémentaires au marché'
WHERE "descriptionFr" IN (
  'Cartes supplémentaires à la vitrine',
  'Cartes supplémentaires à la boutique du jour'
);
