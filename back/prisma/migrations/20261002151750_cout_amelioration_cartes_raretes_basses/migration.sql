-- Amélioration des cartes moins chère en rareté basse : multiplicateur de coût
-- (or et poussière) commune 1.0 → 0.5, peu commune 1.3 → 0.8.
--
-- Migration de DONNÉES : le bootstrap de `GlobalConfig` est create-only. Les
-- gardes sur les anciennes valeurs la rendent idempotente et laissent
-- survivre un ajustement manuel.
UPDATE "GlobalConfig" SET value = '0.5' WHERE key = 'card.rarityMultCommon' AND value IN ('1', '1.0');
UPDATE "GlobalConfig" SET value = '0.8' WHERE key = 'card.rarityMultUncommon' AND value = '1.3';
