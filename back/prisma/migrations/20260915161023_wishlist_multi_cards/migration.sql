-- La wishlist passe de UNE carte (`User.wishlistCardId`) a PLUSIEURS
-- (`UserWishlistCard`) : 2 emplacements de base, jusqu'a 5 avec le noeud
-- « Collectionneur ». Le delai entre deux achats de voeu disparait avec
-- `wishlistPurchasedAt` : le prix reste le seul frein.
--
-- L'ORDRE compte. Prisma genere le DROP COLUMN avant le CREATE TABLE, ce qui
-- emporterait les voeux existants. La table est donc creee d'abord, les
-- donnees reprises, et les colonnes supprimees en dernier.

-- AlterEnum
ALTER TYPE "SkillEffectType" ADD VALUE 'WISHLIST_SLOTS';

-- CreateTable
CREATE TABLE "UserWishlistCard" (
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWishlistCard_pkey" PRIMARY KEY ("userId","cardId")
);

-- CreateIndex
CREATE INDEX "UserWishlistCard_userId_idx" ON "UserWishlistCard"("userId");

-- AddForeignKey
ALTER TABLE "UserWishlistCard" ADD CONSTRAINT "UserWishlistCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWishlistCard" ADD CONSTRAINT "UserWishlistCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des voeux existants AVANT toute suppression. Le garde `IS NOT NULL`
-- et le ON CONFLICT rendent l'operation idempotente.
INSERT INTO "UserWishlistCard" ("userId", "cardId")
SELECT u.id, u."wishlistCardId" FROM "User" u
WHERE u."wishlistCardId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_wishlistCardId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "wishlistCardId",
DROP COLUMN "wishlistPurchasedAt";
