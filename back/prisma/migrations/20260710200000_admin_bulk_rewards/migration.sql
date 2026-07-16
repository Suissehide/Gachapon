-- AlterEnum
ALTER TYPE "RewardSource" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "Rewards" ADD COLUMN "label" TEXT;
