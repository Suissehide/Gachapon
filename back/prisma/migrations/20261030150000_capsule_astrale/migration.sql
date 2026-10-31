-- CreateEnum
CREATE TYPE "CapsuleType" AS ENUM ('ASTRAL');

-- CreateEnum
CREATE TYPE "PullSource" AS ENUM ('TOKEN', 'ASTRAL');

-- AlterEnum
ALTER TYPE "ShopItemType" ADD VALUE 'CAPSULE';

-- AlterTable
ALTER TABLE "GachaPull" ADD COLUMN     "source" "PullSource" NOT NULL DEFAULT 'TOKEN';

-- CreateTable
CREATE TABLE "UserCapsule" (
    "userId" TEXT NOT NULL,
    "type" "CapsuleType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "pityCurrent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserCapsule_pkey" PRIMARY KEY ("userId","type")
);

-- CreateIndex
CREATE INDEX "GachaPull_userId_source_pulledAt_idx" ON "GachaPull"("userId", "source", "pulledAt");

-- AddForeignKey
ALTER TABLE "UserCapsule" ADD CONSTRAINT "UserCapsule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
