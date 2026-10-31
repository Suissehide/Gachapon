-- Migration de DONNÉES (le déploiement ne rejoue jamais les seeds) : les
-- articles des capsules élémentaires et de la capsule de la semaine.
-- Idempotent (NOT EXISTS sur nameFr), libellés identiques à
-- src/main/domain/content/shop.definitions.ts.

INSERT INTO "ShopItem" ("id", "nameFr", "nameEn", "descriptionFr", "descriptionEn", "type", "cost", "currency", "value", "isActive", "createdAt")
SELECT gen_random_uuid()::text, 'Capsule Feu', 'Fire capsule', 'Une carte Feu. Rareté tirée comme un tirage normal.', 'One Fire card. Rarity rolled like a normal pull.', 'CAPSULE', 150, 'DUST', '{"capsuleType":"FIRE","quantity":1}'::jsonb, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ShopItem" WHERE "nameFr" = 'Capsule Feu');

INSERT INTO "ShopItem" ("id", "nameFr", "nameEn", "descriptionFr", "descriptionEn", "type", "cost", "currency", "value", "isActive", "createdAt")
SELECT gen_random_uuid()::text, '10 capsules Feu', '10 Fire capsules', 'Dix cartes Feu. Rareté tirée comme un tirage normal.', 'Ten Fire cards. Rarity rolled like a normal pull.', 'CAPSULE', 1500, 'DUST', '{"capsuleType":"FIRE","quantity":10}'::jsonb, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ShopItem" WHERE "nameFr" = '10 capsules Feu');

INSERT INTO "ShopItem" ("id", "nameFr", "nameEn", "descriptionFr", "descriptionEn", "type", "cost", "currency", "value", "isActive", "createdAt")
SELECT gen_random_uuid()::text, 'Capsule Eau', 'Water capsule', 'Une carte Eau. Rareté tirée comme un tirage normal.', 'One Water card. Rarity rolled like a normal pull.', 'CAPSULE', 150, 'DUST', '{"capsuleType":"WATER","quantity":1}'::jsonb, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ShopItem" WHERE "nameFr" = 'Capsule Eau');

INSERT INTO "ShopItem" ("id", "nameFr", "nameEn", "descriptionFr", "descriptionEn", "type", "cost", "currency", "value", "isActive", "createdAt")
SELECT gen_random_uuid()::text, '10 capsules Eau', '10 Water capsules', 'Dix cartes Eau. Rareté tirée comme un tirage normal.', 'Ten Water cards. Rarity rolled like a normal pull.', 'CAPSULE', 1500, 'DUST', '{"capsuleType":"WATER","quantity":10}'::jsonb, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ShopItem" WHERE "nameFr" = '10 capsules Eau');

INSERT INTO "ShopItem" ("id", "nameFr", "nameEn", "descriptionFr", "descriptionEn", "type", "cost", "currency", "value", "isActive", "createdAt")
SELECT gen_random_uuid()::text, 'Capsule Nature', 'Nature capsule', 'Une carte Nature. Rareté tirée comme un tirage normal.', 'One Nature card. Rarity rolled like a normal pull.', 'CAPSULE', 150, 'DUST', '{"capsuleType":"NATURE","quantity":1}'::jsonb, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ShopItem" WHERE "nameFr" = 'Capsule Nature');

INSERT INTO "ShopItem" ("id", "nameFr", "nameEn", "descriptionFr", "descriptionEn", "type", "cost", "currency", "value", "isActive", "createdAt")
SELECT gen_random_uuid()::text, '10 capsules Nature', '10 Nature capsules', 'Dix cartes Nature. Rareté tirée comme un tirage normal.', 'Ten Nature cards. Rarity rolled like a normal pull.', 'CAPSULE', 1500, 'DUST', '{"capsuleType":"NATURE","quantity":10}'::jsonb, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ShopItem" WHERE "nameFr" = '10 capsules Nature');

INSERT INTO "ShopItem" ("id", "nameFr", "nameEn", "descriptionFr", "descriptionEn", "type", "cost", "currency", "value", "isActive", "createdAt")
SELECT gen_random_uuid()::text, 'Capsule Terre', 'Earth capsule', 'Une carte Terre. Rareté tirée comme un tirage normal.', 'One Earth card. Rarity rolled like a normal pull.', 'CAPSULE', 150, 'DUST', '{"capsuleType":"EARTH","quantity":1}'::jsonb, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ShopItem" WHERE "nameFr" = 'Capsule Terre');

INSERT INTO "ShopItem" ("id", "nameFr", "nameEn", "descriptionFr", "descriptionEn", "type", "cost", "currency", "value", "isActive", "createdAt")
SELECT gen_random_uuid()::text, '10 capsules Terre', '10 Earth capsules', 'Dix cartes Terre. Rareté tirée comme un tirage normal.', 'Ten Earth cards. Rarity rolled like a normal pull.', 'CAPSULE', 1500, 'DUST', '{"capsuleType":"EARTH","quantity":10}'::jsonb, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ShopItem" WHERE "nameFr" = '10 capsules Terre');

INSERT INTO "ShopItem" ("id", "nameFr", "nameEn", "descriptionFr", "descriptionEn", "type", "cost", "currency", "value", "isActive", "createdAt")
SELECT gen_random_uuid()::text, 'Capsule de la semaine', 'Weekly capsule', 'Une carte parmi les 15 de la sélection de la semaine. Rareté tirée comme un tirage normal.', 'One card from this week''s 15-card selection. Rarity rolled like a normal pull.', 'CAPSULE', 250, 'DUST', '{"capsuleType":"WEEKLY","quantity":1}'::jsonb, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ShopItem" WHERE "nameFr" = 'Capsule de la semaine');

INSERT INTO "ShopItem" ("id", "nameFr", "nameEn", "descriptionFr", "descriptionEn", "type", "cost", "currency", "value", "isActive", "createdAt")
SELECT gen_random_uuid()::text, '10 capsules de la semaine', '10 weekly capsules', 'Dix cartes parmi les 15 de la sélection de la semaine. Rareté tirée comme un tirage normal.', 'Ten cards from this week''s 15-card selection. Rarity rolled like a normal pull.', 'CAPSULE', 2500, 'DUST', '{"capsuleType":"WEEKLY","quantity":10}'::jsonb, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ShopItem" WHERE "nameFr" = '10 capsules de la semaine');
