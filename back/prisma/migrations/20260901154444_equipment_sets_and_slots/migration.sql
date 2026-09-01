/*
  Warnings:

  - A unique constraint covering the columns `[slot,setKey,rarity]` on the table `Equipment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `setKey` to the `Equipment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EquipmentSet" AS ENUM ('FUREUR', 'PRECISION', 'PERCEE', 'SANGSUE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EquipmentSlot" ADD VALUE 'SAP';
ALTER TYPE "EquipmentSlot" ADD VALUE 'EMBER';
ALTER TYPE "EquipmentSlot" ADD VALUE 'PRISM';
ALTER TYPE "EquipmentSlot" ADD VALUE 'MONOLITH';

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "setKey" "EquipmentSet" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_slot_setKey_rarity_key" ON "Equipment"("slot", "setKey", "rarity");
