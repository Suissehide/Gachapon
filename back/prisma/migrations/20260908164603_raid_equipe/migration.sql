-- AlterEnum
ALTER TYPE "RewardSource" ADD VALUE 'RAID';

-- CreateTable
CREATE TABLE "RaidBoss" (
    "id" TEXT NOT NULL,
    "element" "CardElement" NOT NULL,
    "name" TEXT NOT NULL,
    "spec" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidBoss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRaid" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "bossId" TEXT NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "memberCountAtStart" INTEGER NOT NULL,
    "killedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamRaid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidAttack" (
    "id" TEXT NOT NULL,
    "raidId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "damage" INTEGER NOT NULL,
    "seed" TEXT NOT NULL,
    "userCardIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaidAttack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidTier" (
    "id" TEXT NOT NULL,
    "pct" INTEGER NOT NULL,
    "rewardId" TEXT NOT NULL,

    CONSTRAINT "RaidTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaidBoss_element_key" ON "RaidBoss"("element");

-- CreateIndex
CREATE UNIQUE INDEX "TeamRaid_teamId_weekKey_key" ON "TeamRaid"("teamId", "weekKey");

-- CreateIndex
CREATE INDEX "RaidAttack_raidId_userId_idx" ON "RaidAttack"("raidId", "userId");

-- CreateIndex
CREATE INDEX "RaidAttack_userId_createdAt_idx" ON "RaidAttack"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RaidTier_pct_key" ON "RaidTier"("pct");

-- AddForeignKey
ALTER TABLE "TeamRaid" ADD CONSTRAINT "TeamRaid_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRaid" ADD CONSTRAINT "TeamRaid_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "RaidBoss"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidAttack" ADD CONSTRAINT "RaidAttack_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "TeamRaid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidAttack" ADD CONSTRAINT "RaidAttack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidTier" ADD CONSTRAINT "RaidTier_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
