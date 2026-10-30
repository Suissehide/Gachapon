-- DropIndex
DROP INDEX "WanderingMonster_userId_day_key";

-- AlterTable
ALTER TABLE "WanderingMonster" DROP COLUMN "day";

-- CreateIndex
CREATE INDEX "WanderingMonster_userId_appearsAt_idx" ON "WanderingMonster"("userId", "appearsAt");


-- Les passages déjà planifiés restaient jusqu'à minuit : ramenés à 3 heures.
UPDATE "WanderingMonster"
SET "expiresAt" = "appearsAt" + INTERVAL '180 minutes'
WHERE "expiresAt" > "appearsAt" + INTERVAL '180 minutes';
