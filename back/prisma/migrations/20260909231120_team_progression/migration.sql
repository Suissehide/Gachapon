-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "hue" INTEGER,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "motto" TEXT,
ADD COLUMN     "perkPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TeamPerk" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeamPerk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMemberWeekly" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeamMemberWeekly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamPerk_teamId_idx" ON "TeamPerk"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamPerk_teamId_key_key" ON "TeamPerk"("teamId", "key");

-- CreateIndex
CREATE INDEX "TeamMemberWeekly_teamId_weekKey_idx" ON "TeamMemberWeekly"("teamId", "weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMemberWeekly_teamId_userId_weekKey_key" ON "TeamMemberWeekly"("teamId", "userId", "weekKey");

-- AddForeignKey
ALTER TABLE "TeamPerk" ADD CONSTRAINT "TeamPerk_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberWeekly" ADD CONSTRAINT "TeamMemberWeekly_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberWeekly" ADD CONSTRAINT "TeamMemberWeekly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
