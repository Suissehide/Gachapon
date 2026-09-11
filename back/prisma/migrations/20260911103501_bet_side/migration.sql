-- CreateEnum
CREATE TYPE "BetSide" AS ENUM ('YES', 'NO');

-- AlterTable
ALTER TABLE "Bet" ADD COLUMN     "side" "BetSide" NOT NULL DEFAULT 'YES';
