-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "recruiting" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JoinRequest_teamId_status_idx" ON "JoinRequest"("teamId", "status");

-- CreateIndex
CREATE INDEX "JoinRequest_userId_status_idx" ON "JoinRequest"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_teamId_userId_key" ON "JoinRequest"("teamId", "userId");

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
