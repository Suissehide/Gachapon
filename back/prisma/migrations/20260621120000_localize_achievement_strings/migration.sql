-- Refresh achievement names/descriptions: French wording, no English filler
-- ("LEGENDARY" → "légendaire", "pulls" → "tirages", etc.) and shorter titles
-- so they stop getting truncated on the /achievements grid.

-- pulls
UPDATE "Achievement" SET name = 'Mise en jambes',      description = 'Réaliser 10 tirages.'    WHERE key = 'pulls_10';
UPDATE "Achievement" SET name = 'Habitué·e',           description = 'Réaliser 100 tirages.'   WHERE key = 'pulls_100';
UPDATE "Achievement" SET name = 'Accro aux tirages',   description = 'Réaliser 500 tirages.'   WHERE key = 'pulls_500';
UPDATE "Achievement" SET name = 'Légende du gachapon', description = 'Réaliser 1 000 tirages.' WHERE key = 'pulls_1000';

-- dust
UPDATE "Achievement" SET name = 'Premier investissement', description = 'Dépenser 500 de poussière.'   WHERE key = 'dust_spent_500';
UPDATE "Achievement" SET name = 'Grand dépensier',        description = 'Dépenser 5 000 de poussière.' WHERE key = 'dust_spent_5000';
UPDATE "Achievement" SET name = 'Recycleur',              description = 'Recycler 50 cartes.'          WHERE key = 'cards_recycled_50';

-- collection_rarity
UPDATE "Achievement" SET name = 'Chasseur de raretés', description = 'Posséder 10 cartes rares.'       WHERE key = 'own_rare_10';
UPDATE "Achievement" SET name = 'Amateur d''épiques',  description = 'Posséder 5 cartes épiques.'      WHERE key = 'own_epic_5';
UPDATE "Achievement" SET name = 'Première légende',    description = 'Posséder 1 carte légendaire.'   WHERE key = 'own_legendary_1';
UPDATE "Achievement" SET name = 'Légende confirmée',   description = 'Posséder 5 cartes légendaires.' WHERE key = 'own_legendary_5';
UPDATE "Achievement" SET name = 'Holographie',         description = 'Posséder 1 carte holographique.' WHERE key = 'own_holographic_1';

-- collection_variants
UPDATE "Achievement" SET name = 'Premier éclat',    description = 'Posséder 1 carte brillante.'             WHERE key = 'own_brilliant_1';
UPDATE "Achievement" SET name = 'Éclat persistant', description = 'Posséder 5 cartes brillantes.'           WHERE key = 'own_brilliant_5';
UPDATE "Achievement" SET name = 'Double face',      description = 'Posséder 2 variantes d''une même carte.' WHERE key = 'same_card_two_variants';

-- collection_complete
UPDATE "Achievement" SET name = 'Collection commune',    description = 'Posséder toutes les cartes communes.' WHERE key = 'complete_common';
UPDATE "Achievement" SET name = 'Maître collectionneur', description = 'Compléter la collection de base.'     WHERE key = 'complete_all_base';

-- streak
UPDATE "Achievement" SET name = 'Mois complet', description = 'Atteindre 30 jours de série.' WHERE key = 'streak_30';

-- machines
UPDATE "Achievement" SET name = 'Première machine', description = 'Posséder 1 machine.'           WHERE key = 'machines_own_1';
UPDATE "Achievement" SET name = 'Salle d''arcade',  description = 'Posséder 2 machines.'          WHERE key = 'machines_own_2';
UPDATE "Achievement" SET name = 'Tout l''arcade',   description = 'Posséder toutes les machines.' WHERE key = 'machines_own_all';

-- hidden
UPDATE "Achievement" SET description = 'Réaliser votre tout premier tirage.' WHERE key = 'first_pull';
