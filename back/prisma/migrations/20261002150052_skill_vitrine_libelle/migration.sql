-- La « Boutique du jour » se renouvelle toutes les heures et s'appelle
-- désormais « Vitrine ». skills.definitions.ts est corrigé, mais le bootstrap
-- de traductions ne resynchronise que les colonnes EN.
UPDATE "SkillNode"
SET "descriptionFr" = 'Plus de cartes rares dans ta vitrine'
WHERE "descriptionFr" = 'Plus de cartes rares dans ta boutique du jour';

UPDATE "SkillNode"
SET "descriptionFr" = 'Cartes supplémentaires à la vitrine'
WHERE "descriptionFr" = 'Cartes supplémentaires à la boutique du jour';
