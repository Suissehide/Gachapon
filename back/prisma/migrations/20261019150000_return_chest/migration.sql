-- CreateTable
CREATE TABLE "ReturnChest" (
    "userId" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "cappedDays" INTEGER NOT NULL,
    "tokens" INTEGER NOT NULL,
    "energy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnChest_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "ReturnChest" ADD CONSTRAINT "ReturnChest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

