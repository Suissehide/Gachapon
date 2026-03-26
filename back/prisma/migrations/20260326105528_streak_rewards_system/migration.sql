/*
  Warnings:

  - You are about to drop the column `rewardDust` on the `Achievement` table. All the data in the column will be lost.
  - You are about to drop the column `rewardTokens` on the `Achievement` table. All the data in the column will be lost.
  - You are about to drop the column `rewardDust` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `rewardTokens` on the `Quest` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RewardSource" AS ENUM ('STREAK', 'ACHIEVEMENT', 'QUEST');

-- AlterTable
ALTER TABLE "Achievement" DROP COLUMN "rewardDust",
DROP COLUMN "rewardTokens",
ADD COLUMN     "rewardId" TEXT;

-- AlterTable
ALTER TABLE "Quest" DROP COLUMN "rewardDust",
DROP COLUMN "rewardTokens",
ADD COLUMN     "rewardId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bestStreak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "dust" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streak_milestones" (
    "id" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "isMilestone" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rewardId" TEXT NOT NULL,

    CONSTRAINT "streak_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "source" "RewardSource" NOT NULL,
    "sourceId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "streak_milestones_day_key" ON "streak_milestones"("day");

-- CreateIndex
CREATE INDEX "user_rewards_userId_claimedAt_idx" ON "user_rewards"("userId", "claimedAt");

-- CreateIndex
CREATE INDEX "user_rewards_sourceId_idx" ON "user_rewards"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "user_rewards_userId_source_sourceId_key" ON "user_rewards"("userId", "source", "sourceId");

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_milestones" ADD CONSTRAINT "streak_milestones_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
