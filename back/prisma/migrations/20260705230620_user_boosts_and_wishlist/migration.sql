-- AlterTable
ALTER TABLE "User" ADD COLUMN     "wishlistCardId" TEXT,
ADD COLUMN     "wishlistPurchasedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserBoost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weightMultiplier" DOUBLE PRECISION,
    "weightRarity" "CardRarity",
    "guaranteedRarity" "CardRarity",
    "pullsRemaining" INTEGER NOT NULL,
    "satisfied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBoost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBoost_userId_idx" ON "UserBoost"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_wishlistCardId_fkey" FOREIGN KEY ("wishlistCardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBoost" ADD CONSTRAINT "UserBoost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
