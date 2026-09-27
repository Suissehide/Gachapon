-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityEventType" ADD VALUE 'GUEST_SIGNUP';
ALTER TYPE "ActivityEventType" ADD VALUE 'GUEST_CONVERTED';

-- AlterEnum
ALTER TYPE "GlobalRole" ADD VALUE 'GUEST';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pendingEmail" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "User_role_lastLoginAt_idx" ON "User"("role", "lastLoginAt");
