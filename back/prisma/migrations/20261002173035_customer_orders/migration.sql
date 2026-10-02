-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'DELIVERED', 'DISMISSED');

-- CreateTable
CREATE TABLE "CustomerOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "clientCardId" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "rewardDust" INTEGER NOT NULL,
    "rewardGold" INTEGER NOT NULL,
    "rewardTokens" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "freeDismiss" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerOrder_userId_slot_createdAt_idx" ON "CustomerOrder"("userId", "slot", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerOrder_userId_closedAt_idx" ON "CustomerOrder"("userId", "closedAt");

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_clientCardId_fkey" FOREIGN KEY ("clientCardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

