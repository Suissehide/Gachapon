-- AlterEnum
ALTER TYPE "RewardSource" ADD VALUE 'LEVEL_UP';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SkillEffectType" ADD VALUE 'PULL_XP_BONUS';
ALTER TYPE "SkillEffectType" ADD VALUE 'PITY_BOOST';
ALTER TYPE "SkillEffectType" ADD VALUE 'VARIANT_LUCK';
ALTER TYPE "SkillEffectType" ADD VALUE 'DAILY_SHOP_SLOT';
ALTER TYPE "SkillEffectType" ADD VALUE 'WISHLIST_COOLDOWN';
ALTER TYPE "SkillEffectType" ADD VALUE 'PC_VAULT';
ALTER TYPE "SkillEffectType" ADD VALUE 'PC_REGEN';
ALTER TYPE "SkillEffectType" ADD VALUE 'SWEEP_COST';
ALTER TYPE "SkillEffectType" ADD VALUE 'GOLD_BONUS';
ALTER TYPE "SkillEffectType" ADD VALUE 'COMBAT_XP_BONUS';
ALTER TYPE "SkillEffectType" ADD VALUE 'DROP_BONUS';
