-- AlterTable: Remove variant from Card
ALTER TABLE "Card" DROP COLUMN "variant";

-- AlterTable: Add variant to UserCard with default NORMAL
ALTER TABLE "UserCard" ADD COLUMN "variant" "CardVariant" NOT NULL DEFAULT 'NORMAL';

-- DropIndex: Remove old unique constraint on UserCard
DROP INDEX "UserCard_userId_cardId_key";

-- CreateIndex: Add new unique constraint including variant
CREATE UNIQUE INDEX "UserCard_userId_cardId_variant_key" ON "UserCard"("userId", "cardId", "variant");

-- Backfill GachaPull: replace NULL with 'NORMAL' before making non-nullable
UPDATE "GachaPull" SET "variant" = 'NORMAL' WHERE "variant" IS NULL;

-- AlterTable: Make GachaPull.variant non-nullable with default NORMAL
ALTER TABLE "GachaPull" ALTER COLUMN "variant" SET NOT NULL,
                        ALTER COLUMN "variant" SET DEFAULT 'NORMAL';
