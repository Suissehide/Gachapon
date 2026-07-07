/*
  Warnings:

  - You are about to drop the column `date` on the `UserQuest` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,questId,periodKey]` on the table `UserQuest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `periodKey` to the `UserQuest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuestPeriod" AS ENUM ('ONESHOT', 'WEEKLY');

-- DropIndex
DROP INDEX "UserQuest_userId_questId_date_key";

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "period" "QuestPeriod" NOT NULL DEFAULT 'ONESHOT';

-- AlterTable
ALTER TABLE "Rewards" ADD COLUMN     "gold" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserQuest" DROP COLUMN "date",
ADD COLUMN     "periodKey" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "UserQuest_userId_periodKey_idx" ON "UserQuest"("userId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuest_userId_questId_periodKey_key" ON "UserQuest"("userId", "questId", "periodKey");
