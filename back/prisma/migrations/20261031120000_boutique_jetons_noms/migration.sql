-- Migration de DONNÉES : la boutique vend des « jetons » (1 jeton = 1
-- capsule). Renomme les articles de capsule, libellés identiques à
-- src/main/domain/content/shop.definitions.ts.

UPDATE "ShopItem" SET "nameFr" = 'Jeton astral', "nameEn" = 'Astral token' WHERE "nameFr" = 'Capsule astrale';
UPDATE "ShopItem" SET "nameFr" = '10 jetons astraux', "nameEn" = '10 astral tokens' WHERE "nameFr" = '10 capsules astrales';
UPDATE "ShopItem" SET "nameFr" = 'Jeton Comète', "nameEn" = 'Comet token' WHERE "nameFr" = 'Capsule Comète';
UPDATE "ShopItem" SET "nameFr" = '10 jetons Comète', "nameEn" = '10 Comet tokens' WHERE "nameFr" = '10 capsules Comète';
UPDATE "ShopItem" SET "nameFr" = 'Jeton Feu', "nameEn" = 'Fire token' WHERE "nameFr" = 'Capsule Feu';
UPDATE "ShopItem" SET "nameFr" = '10 jetons Feu', "nameEn" = '10 Fire tokens' WHERE "nameFr" = '10 capsules Feu';
UPDATE "ShopItem" SET "nameFr" = 'Jeton Eau', "nameEn" = 'Water token' WHERE "nameFr" = 'Capsule Eau';
UPDATE "ShopItem" SET "nameFr" = '10 jetons Eau', "nameEn" = '10 Water tokens' WHERE "nameFr" = '10 capsules Eau';
UPDATE "ShopItem" SET "nameFr" = 'Jeton Nature', "nameEn" = 'Nature token' WHERE "nameFr" = 'Capsule Nature';
UPDATE "ShopItem" SET "nameFr" = '10 jetons Nature', "nameEn" = '10 Nature tokens' WHERE "nameFr" = '10 capsules Nature';
UPDATE "ShopItem" SET "nameFr" = 'Jeton Terre', "nameEn" = 'Earth token' WHERE "nameFr" = 'Capsule Terre';
UPDATE "ShopItem" SET "nameFr" = '10 jetons Terre', "nameEn" = '10 Earth tokens' WHERE "nameFr" = '10 capsules Terre';
