-- Migration de DONNÉES (le déploiement ne rejoue jamais les seeds) :
--
-- 1. Nettoyage de ce que LUMIÈRE/TÉNÈBRES rendent indisponible hors capsule
--    astrale (card-pools.ts#ASTRAL_ELEMENTS) :
--     - les vœux sur ces cartes sont gratuits, rien à rembourser ;
--     - les commandes OUVERTES qui en exigent une (carte cliente ou une
--       ligne `lines`) sont annulées plutôt que laissées infaisables à vie —
--       orders.domain.ts#dueSlots régénère l'emplacement dès le prochain
--       passage (aucune commande = emplacement dû immédiatement).
--
-- 2. Les deux articles de boutique « Capsule astrale », seule voie d'accès
--    restante à ces cartes. Idempotent (NOT EXISTS sur nameFr), libellés
--    identiques à src/main/domain/content/shop.definitions.ts.

DELETE FROM "UserWishlistCard"
WHERE "cardId" IN (SELECT "id" FROM "Card" WHERE "element" IN ('LIGHT', 'DARK'));

DELETE FROM "CustomerOrder"
WHERE "status" = 'OPEN'
  AND (
    "clientCardId" IN (SELECT "id" FROM "Card" WHERE "element" IN ('LIGHT', 'DARK'))
    OR (
      jsonb_typeof("lines") = 'array'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements("lines") AS line
        WHERE line->>'element' IN ('LIGHT', 'DARK')
      )
    )
  );

INSERT INTO "ShopItem" ("id", "nameFr", "nameEn", "descriptionFr", "descriptionEn", "type", "cost", "currency", "value", "isActive", "createdAt")
SELECT
  gen_random_uuid()::text,
  'Capsule astrale',
  'Astral capsule',
  'Une carte Lumière ou Ténèbres. Rareté tirée comme un tirage normal.',
  'One Light or Dark card. Rarity rolled like a normal pull.',
  'CAPSULE',
  400,
  'DUST',
  '{"capsuleType":"ASTRAL","quantity":1}'::jsonb,
  true,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ShopItem" WHERE "nameFr" = 'Capsule astrale');

INSERT INTO "ShopItem" ("id", "nameFr", "nameEn", "descriptionFr", "descriptionEn", "type", "cost", "currency", "value", "isActive", "createdAt")
SELECT
  gen_random_uuid()::text,
  '10 capsules astrales',
  '10 astral capsules',
  'Dix cartes Lumière ou Ténèbres. Rareté tirée comme un tirage normal.',
  'Ten Light or Dark cards. Rarity rolled like a normal pull.',
  'CAPSULE',
  4000,
  'DUST',
  '{"capsuleType":"ASTRAL","quantity":10}'::jsonb,
  true,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ShopItem" WHERE "nameFr" = '10 capsules astrales');
