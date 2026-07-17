-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SkillEffectType" ADD VALUE 'UPGRADE_DUST_DISCOUNT';
ALTER TYPE "SkillEffectType" ADD VALUE 'GOLD_SHOP_DISCOUNT';
ALTER TYPE "SkillEffectType" ADD VALUE 'DAILY_SHOP_LUCK';
