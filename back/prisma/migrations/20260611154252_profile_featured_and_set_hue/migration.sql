-- AlterTable
ALTER TABLE "CardSet" ADD COLUMN     "hue" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "featuredCardIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
