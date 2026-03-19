-- CreateEnum
CREATE TYPE "UpgradeType" AS ENUM ('REGEN', 'LUCK', 'DUST_HARVEST', 'TOKEN_VAULT');

-- CreateTable
CREATE TABLE "UpgradeConfig" (
    "type" "UpgradeType" NOT NULL,
    "level" INTEGER NOT NULL,
    "effect" DOUBLE PRECISION NOT NULL,
    "dustCost" INTEGER NOT NULL,

    CONSTRAINT "UpgradeConfig_pkey" PRIMARY KEY ("type","level")
);

-- CreateTable
CREATE TABLE "UserUpgrade" (
    "userId" TEXT NOT NULL,
    "type" "UpgradeType" NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "UserUpgrade_pkey" PRIMARY KEY ("userId","type")
);

-- AddForeignKey
ALTER TABLE "UserUpgrade" ADD CONSTRAINT "UserUpgrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
