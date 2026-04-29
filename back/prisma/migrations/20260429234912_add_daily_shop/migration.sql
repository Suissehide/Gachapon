-- CreateTable
CREATE TABLE "DailyShop" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyShop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyShopItem" (
    "id" TEXT NOT NULL,
    "dailyShopId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "dustPrice" INTEGER NOT NULL,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "purchasedAt" TIMESTAMP(3),

    CONSTRAINT "DailyShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyShop_userId_idx" ON "DailyShop"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyShop_userId_date_key" ON "DailyShop"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyShop" ADD CONSTRAINT "DailyShop_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyShopItem" ADD CONSTRAINT "DailyShopItem_dailyShopId_fkey" FOREIGN KEY ("dailyShopId") REFERENCES "DailyShop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyShopItem" ADD CONSTRAINT "DailyShopItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
