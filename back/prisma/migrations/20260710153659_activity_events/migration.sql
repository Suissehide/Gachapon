-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('USER_SIGNUP', 'PULL_EPIC', 'PULL_LEGENDARY', 'SHOP_PURCHASE', 'USER_SUSPENDED', 'USER_UNSUSPENDED', 'ADMIN_GRANT', 'BULK_REWARD', 'LEVEL_UP');

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "type" "ActivityEventType" NOT NULL,
    "userId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_type_createdAt_idx" ON "ActivityEvent"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
