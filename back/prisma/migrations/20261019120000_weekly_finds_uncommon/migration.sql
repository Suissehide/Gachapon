-- « Nouvelles Trouvailles » (5 cartes jamais possédées) devenait infaisable à
-- collection complète : remplacée par 8 cartes PEU COMMUNES, même clé.
--
-- Migration de DONNEES : le bootstrap des quêtes est create-only. Le garde sur
-- l'ancien critère la rend idempotente et laisse survivre une retouche admin.
UPDATE "Quest"
SET "nameFr" = 'Belles Trouvailles',
    "nameEn" = 'Nice Finds',
    "descriptionFr" = 'Obtiens 8 cartes PEU COMMUNES cette semaine.',
    "descriptionEn" = 'Get 8 UNCOMMON cards this week.',
    criterion = '{"event":"PULL_COMPLETED","target":8,"filter":{"rarity":"UNCOMMON"}}'::jsonb
WHERE key = 'weekly_uniques_5'
  AND criterion = '{"event":"PULL_COMPLETED","target":5,"filter":{"uniqueOnly":true}}'::jsonb;
