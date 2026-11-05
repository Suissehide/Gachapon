-- Variantes en vernis : une seule ligne UserCard par (userId, cardId). Les
-- variantes BRILLIANT / HOLOGRAPHIC deviennent des vernis débloqués sur la
-- ligne (le NORMAL est implicite). Spec : variantes-en-vernis-design.md.

-- AlterTable
ALTER TABLE "UserCard"
ADD COLUMN     "displayedFinish" "CardVariant" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "finishes" "CardVariant"[] DEFAULT ARRAY[]::"CardVariant"[];

-- Ligne gardée par carte : la plus investie (palier, puis niveau), à défaut la
-- NORMAL, puis la plus ancienne.
CREATE TEMP TABLE uc_merge AS
SELECT uc.id,
       first_value(uc.id) OVER (
         PARTITION BY uc."userId", uc."cardId"
         ORDER BY uc.palier DESC, uc.level DESC, (uc.variant = 'NORMAL') DESC,
                  uc."obtainedAt", uc.id
       ) AS keep_id
FROM "UserCard" uc;

-- Agrégats sur la ligne gardée. Les doublons dépensés en ascension par les
-- lignes absorbées (palier - 1 chacune) sont rendus en quantité ; le niveau et
-- le palier prennent le max (level <= 10 x son palier <= 10 x le palier max).
UPDATE "UserCard" k
SET quantity          = a.qty,
    level             = a.lvl,
    palier            = a.pal,
    "obtainedAt"      = a.obt,
    finishes          = a.fin,
    "displayedFinish" = CASE
      WHEN 'HOLOGRAPHIC' = ANY (a.fin) THEN 'HOLOGRAPHIC'::"CardVariant"
      WHEN 'BRILLIANT' = ANY (a.fin) THEN 'BRILLIANT'::"CardVariant"
      ELSE 'NORMAL'::"CardVariant"
    END
FROM (
  SELECT m.keep_id,
         SUM(uc.quantity)
           + SUM(CASE WHEN uc.id <> m.keep_id THEN uc.palier - 1 ELSE 0 END) AS qty,
         MAX(uc.level) AS lvl,
         MAX(uc.palier) AS pal,
         MIN(uc."obtainedAt") AS obt,
         COALESCE(
           array_agg(DISTINCT uc.variant) FILTER (WHERE uc.variant <> 'NORMAL'),
           ARRAY[]::"CardVariant"[]
         ) AS fin
  FROM uc_merge m
  JOIN "UserCard" uc ON uc.id = m.id
  GROUP BY m.keep_id
) a
WHERE k.id = a.keep_id;

-- Équipement : un seul objet par emplacement sur la ligne gardée. En cas de
-- conflit, celui de la ligne gardée l'emporte, sinon le plus ancien ; les
-- autres sont déséquipés (ils restent dans l'inventaire).
WITH ranked AS (
  SELECT ue.id,
         row_number() OVER (
           PARTITION BY m.keep_id, e.slot
           ORDER BY (m.id = m.keep_id) DESC, ue."obtainedAt", ue.id
         ) AS rn
  FROM "UserEquipment" ue
  JOIN uc_merge m ON m.id = ue."equippedOnId"
  JOIN "Equipment" e ON e.id = ue."equipmentId"
)
UPDATE "UserEquipment"
SET "equippedOnId" = NULL
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

UPDATE "UserEquipment" ue
SET "equippedOnId" = m.keep_id
FROM uc_merge m
WHERE ue."equippedOnId" = m.id
  AND m.id <> m.keep_id;

-- Équipes : ids remappés sur la ligne gardée, dédoublonnés dans l'ordre (une
-- équipe qui alignait deux variantes d'une même carte perd une place).
UPDATE "UserCombatTeam" t
SET "userCardIds" = sub.ids
FROM (
  SELECT t2.id,
         ARRAY(
           SELECT x.cid
           FROM (
             SELECT COALESCE(m.keep_id, u.cid) AS cid, MIN(u.ord) AS ord
             FROM unnest(t2."userCardIds") WITH ORDINALITY AS u (cid, ord)
             LEFT JOIN uc_merge m ON m.id = u.cid
             GROUP BY 1
           ) x
           ORDER BY x.ord
         ) AS ids
  FROM "UserCombatTeam" t2
) sub
WHERE t.id = sub.id
  AND t."userCardIds" IS DISTINCT FROM sub.ids;

DELETE FROM "UserCard" uc
USING uc_merge m
WHERE uc.id = m.id
  AND m.id <> m.keep_id;

DROP TABLE uc_merge;

-- DropIndex
DROP INDEX "UserCard_userId_cardId_variant_key";

-- AlterTable
ALTER TABLE "UserCard" DROP COLUMN "variant";

-- CreateIndex
CREATE UNIQUE INDEX "UserCard_userId_cardId_key" ON "UserCard"("userId", "cardId");
