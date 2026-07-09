-- CreateEnum
CREATE TYPE "ShopCurrency" AS ENUM ('DUST', 'GOLD');

-- AlterTable: rename ShopItem.dustCost -> cost, add per-item currency (defaults to DUST)
ALTER TABLE "ShopItem" RENAME COLUMN "dustCost" TO "cost";
ALTER TABLE "ShopItem" ADD COLUMN "currency" "ShopCurrency" NOT NULL DEFAULT 'DUST';

-- AlterTable: rename Purchase.dustSpent -> amountSpent, record the currency spent
ALTER TABLE "Purchase" RENAME COLUMN "dustSpent" TO "amountSpent";
ALTER TABLE "Purchase" ADD COLUMN "currency" "ShopCurrency" NOT NULL DEFAULT 'DUST';
