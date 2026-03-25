-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "emailVerificationToken" TEXT,
ADD COLUMN "emailVerificationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "passwordResetToken" TEXT,
ADD COLUMN "passwordResetTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN "emailSentAt" TIMESTAMP(3);
