-- Le set seedé « Royaume des Humains » s'aligne sur les 17 familles
-- importées (un nom de peuple au pluriel). Migration de données : le
-- déploiement ne seede jamais, et le bootstrap des traductions comme
-- import-cards rapprochent le set par nameFr — sans ce renommage, ils ne le
-- retrouveraient plus (doublon à l'import).
UPDATE "CardSet"
SET "nameFr" = 'Humains',
    "nameEn" = CASE
      WHEN "nameEn" IN ('Kingdom of Humans', 'Royaume des Humains') THEN 'Humans'
      ELSE "nameEn"
    END
WHERE "nameFr" = 'Royaume des Humains';
