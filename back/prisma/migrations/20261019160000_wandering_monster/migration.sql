-- CreateTable
CREATE TABLE "WanderingMonster" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "appearsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "defeatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WanderingMonster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WanderingMonster_userId_expiresAt_idx" ON "WanderingMonster"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WanderingMonster_userId_day_key" ON "WanderingMonster"("userId", "day");

-- AddForeignKey
ALTER TABLE "WanderingMonster" ADD CONSTRAINT "WanderingMonster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WanderingMonster" ADD CONSTRAINT "WanderingMonster_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "CampaignStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

