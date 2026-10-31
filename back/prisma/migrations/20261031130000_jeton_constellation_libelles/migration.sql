-- Migration de DONNÉES (le déploiement ne rejoue jamais les seeds) : le
-- jeton Comète devient le jeton Constellation. Le type d'inventaire `COMET`
-- ne change pas ; seuls les libellés en boutique, identiques à
-- src/main/domain/content/shop.definitions.ts.

UPDATE "ShopItem" SET "nameFr" = 'Jeton Constellation', "nameEn" = 'Constellation token' WHERE "nameFr" = 'Jeton Comète';
UPDATE "ShopItem" SET "nameFr" = '10 jetons Constellation', "nameEn" = '10 Constellation tokens' WHERE "nameFr" = '10 jetons Comète';
