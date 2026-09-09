-- CreateEnum
CREATE TYPE "DuelStatus" AS ENUM ('PENDING', 'ACTIVE', 'SETTLED', 'EXPIRED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('ACTIVE', 'WON', 'LOST', 'EXPIRED');

-- CreateTable
CREATE TABLE "Duel" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "status" "DuelStatus" NOT NULL DEFAULT 'PENDING',
    "pullCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "winnerId" TEXT,
    "challengerScore" INTEGER NOT NULL DEFAULT 0,
    "opponentScore" INTEGER NOT NULL DEFAULT 0,
    "challengerPulls" INTEGER NOT NULL DEFAULT 0,
    "opponentPulls" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Duel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuelTransfer" (
    "id" TEXT NOT NULL,
    "duelId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "variant" "CardVariant" NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuelTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "bettorId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "stake" INTEGER NOT NULL,
    "minRarity" "CardRarity" NOT NULL,
    "pullWindow" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "pullsSeen" INTEGER NOT NULL DEFAULT 0,
    "payout" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Duel_teamId_status_idx" ON "Duel"("teamId", "status");

-- CreateIndex
CREATE INDEX "Duel_challengerId_status_idx" ON "Duel"("challengerId", "status");

-- CreateIndex
CREATE INDEX "Duel_opponentId_status_idx" ON "Duel"("opponentId", "status");

-- CreateIndex
CREATE INDEX "DuelTransfer_duelId_idx" ON "DuelTransfer"("duelId");

-- CreateIndex
CREATE INDEX "Bet_teamId_status_idx" ON "Bet"("teamId", "status");

-- CreateIndex
CREATE INDEX "Bet_bettorId_status_idx" ON "Bet"("bettorId", "status");

-- CreateIndex
CREATE INDEX "Bet_targetId_status_idx" ON "Bet"("targetId", "status");

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelTransfer" ADD CONSTRAINT "DuelTransfer_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "Duel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelTransfer" ADD CONSTRAINT "DuelTransfer_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_bettorId_fkey" FOREIGN KEY ("bettorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
