-- Commandes de clients recalibrées : moins de commandes, mieux payées.
-- Délai 180 → 240 min, plafond 8 → 4 livraisons/jour, multiplicateur d'or
-- 4 → 3 (compensé par la base fixe `orders.goldBase` / `orders.dustBase`,
-- créée par le bootstrap).
--
-- Migration de DONNÉES : le bootstrap de `GlobalConfig` est create-only. Les
-- gardes sur les anciennes valeurs la rendent idempotente et laissent
-- survivre un ajustement manuel.
UPDATE "GlobalConfig" SET value = '240' WHERE key = 'orders.cooldownMinutes' AND value = '180';
UPDATE "GlobalConfig" SET value = '4' WHERE key = 'orders.dailyCap' AND value = '8';
UPDATE "GlobalConfig" SET value = '3' WHERE key = 'orders.goldMult' AND value = '4';
