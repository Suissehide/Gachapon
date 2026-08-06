-- CreateEnum
CREATE TYPE "CardElement" AS ENUM ('FIRE', 'WATER', 'NATURE', 'LIGHT', 'DARK');

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "element" "CardElement";
