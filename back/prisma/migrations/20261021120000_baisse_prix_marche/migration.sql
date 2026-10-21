-- Prix du Marché divisés par deux pour les raretés rare et au-dessus.
-- AUCUN changement de schéma.
--
-- Migration de DONNÉES : le déploiement ne rejoue jamais le seed et le
-- bootstrap de `GlobalConfig` est create-only. Chaque UPDATE est gardé sur
-- l'ANCIENNE valeur, donc idempotent, et laisse survivre un réglage /admin.
--
-- Le prix d'un vœu vaut prix Marché × facteur : les facteurs doublent pour que
-- le prix des vœux ne bouge pas (12 000 / 52 500 / 150 000).
UPDATE "GlobalConfig" g SET value = v.new
FROM (VALUES
  ('dailyShopPriceRare', '2400', '1200'),
  ('dailyShopPriceEpic', '10500', '5250'),
  ('dailyShopPriceLegendary', '60000', '30000'),
  ('wishlist.priceMultiplierRare', '5', '10'),
  ('wishlist.priceMultiplierEpic', '5', '10'),
  ('wishlist.priceMultiplierLegendary', '2.5', '5')
) AS v(key, old, new)
WHERE g.key = v.key AND g.value = v.old;
