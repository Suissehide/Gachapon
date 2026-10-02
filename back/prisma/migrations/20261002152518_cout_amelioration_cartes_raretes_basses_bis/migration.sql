-- Deuxième baisse du coût d'amélioration en rareté basse (tout le monde ne
-- montait que des épiques) : commune 0.5 → 0.25, peu commune 0.8 → 0.4,
-- rare 1.7 → 0.7. Épique et légendaire inchangés.
--
-- Migration de DONNÉES : le bootstrap de `GlobalConfig` est create-only. Les
-- gardes sur les anciennes valeurs la rendent idempotente et laissent
-- survivre un ajustement manuel.
UPDATE "GlobalConfig" SET value = '0.25' WHERE key = 'card.rarityMultCommon' AND value = '0.5';
UPDATE "GlobalConfig" SET value = '0.4' WHERE key = 'card.rarityMultUncommon' AND value = '0.8';
UPDATE "GlobalConfig" SET value = '0.7' WHERE key = 'card.rarityMultRare' AND value = '1.7';
