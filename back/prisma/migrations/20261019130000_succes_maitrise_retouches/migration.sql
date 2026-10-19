-- Famille « mastery » :
--  - « Surpassé en nombre » (understaffed_clear_1) est infaisable ;
--  - « Perfection » (flawless_clears_100) ne se remplit pas en jeu normal : les
--    étapes se passent en perdant des cartes et les balayages ne comptent pas.
-- Les deux sont désactivés (isActive = false) : les déblocages déjà obtenus
-- restent en base. « Légion d'élite » prend la place de « Perfection ».
--
-- Migration de DONNEES : les succès n'arrivent en base que par le seed.
UPDATE "Achievement" SET "isActive" = false
WHERE key IN ('understaffed_clear_1', 'flawless_clears_100');

WITH r AS (
  INSERT INTO "Rewards" (id, tokens, dust, xp, "cardRarity")
  SELECT gen_random_uuid()::text, 20, 500, 0, 'EPIC'::"CardRarity"
  WHERE NOT EXISTS (SELECT 1 FROM "Achievement" WHERE key = 'cards_max_level_10')
  RETURNING id
)
INSERT INTO "Achievement" (id, key, "nameFr", "nameEn", "descriptionFr", "descriptionEn", family, tier, hidden, criterion, "sortOrder", "isActive", "rewardId")
SELECT gen_random_uuid()::text, 'cards_max_level_10', 'Légion d''élite', 'Elite Legion', 'Monter 10 personnages au niveau maximum.', 'Level 10 characters to the maximum.', 'mastery', 4, false, '{"type":"CARDS_AT_MAX_LEVEL","threshold":10}'::jsonb, 7, true, r.id
FROM r;
