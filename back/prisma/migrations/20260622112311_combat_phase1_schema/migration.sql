-- CreateEnum
CREATE TYPE "EquipmentSlot" AS ENUM ('WEAPON', 'ARMOR', 'ACCESSORY');

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "baseAtk" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "baseDef" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "baseHp" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "baseSpd" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "passiveKey" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "combatPoints" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "combatTeam" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "gold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCombatPointAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserCard" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "palier" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slot" "EquipmentSlot" NOT NULL,
    "rarity" "CardRarity" NOT NULL,
    "imageUrl" TEXT,
    "bonuses" JSONB NOT NULL,
    "dropWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEquipment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "equippedOnId" TEXT,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignStage" (
    "id" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "index" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "isBoss" BOOLEAN NOT NULL DEFAULT false,
    "enemyTeam" JSONB NOT NULL,
    "lootTable" JSONB NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CampaignStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCampaignProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "highestChapter" INTEGER NOT NULL DEFAULT 1,
    "highestIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCampaignProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageId" TEXT,
    "seed" TEXT NOT NULL,
    "won" BOOLEAN NOT NULL,
    "log" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserEquipment_userId_idx" ON "UserEquipment"("userId");

-- CreateIndex
CREATE INDEX "UserEquipment_equippedOnId_idx" ON "UserEquipment"("equippedOnId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignStage_chapter_index_key" ON "CampaignStage"("chapter", "index");

-- CreateIndex
CREATE UNIQUE INDEX "UserCampaignProgress_userId_key" ON "UserCampaignProgress"("userId");

-- CreateIndex
CREATE INDEX "BattleResult_userId_createdAt_idx" ON "BattleResult"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserEquipment" ADD CONSTRAINT "UserEquipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEquipment" ADD CONSTRAINT "UserEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEquipment" ADD CONSTRAINT "UserEquipment_equippedOnId_fkey" FOREIGN KEY ("equippedOnId") REFERENCES "UserCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCampaignProgress" ADD CONSTRAINT "UserCampaignProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleResult" ADD CONSTRAINT "BattleResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
