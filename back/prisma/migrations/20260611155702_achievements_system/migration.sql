-- Reset propre : pas de migration de données (cf. spec)
DELETE FROM "UserAchievement";
DELETE FROM "user_rewards" WHERE "source" = 'ACHIEVEMENT';
DELETE FROM "Achievement";

-- AlterTable
ALTER TABLE "Achievement" ADD COLUMN     "criterion" JSONB NOT NULL,
ADD COLUMN     "family" TEXT,
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iconKey" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tier" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UserAchievementProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAchievementProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Achievement_family_tier_idx" ON "Achievement"("family", "tier");

-- CreateIndex
CREATE INDEX "Achievement_isActive_idx" ON "Achievement"("isActive");

-- CreateIndex
CREATE INDEX "UserAchievementProgress_userId_idx" ON "UserAchievementProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievementProgress_userId_achievementId_key" ON "UserAchievementProgress"("userId", "achievementId");

-- AddForeignKey
ALTER TABLE "UserAchievementProgress" ADD CONSTRAINT "UserAchievementProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievementProgress" ADD CONSTRAINT "UserAchievementProgress_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
