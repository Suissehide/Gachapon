-- DropForeignKey
ALTER TABLE "UserUpgrade" DROP CONSTRAINT "UserUpgrade_userId_fkey";

-- DropTable
DROP TABLE "UserUpgrade";

-- DropTable
DROP TABLE "UpgradeConfig";

-- DropEnum
DROP TYPE "UpgradeType";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "upgrades",
ADD COLUMN "skillPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "SkillEffectType" AS ENUM ('REGEN', 'LUCK', 'DUST_HARVEST', 'TOKEN_VAULT', 'FREE_PULL_CHANCE', 'MULTI_TOKEN_CHANCE', 'GOLDEN_BALL_CHANCE', 'SHOP_DISCOUNT');

-- CreateTable
CREATE TABLE "SkillConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "resetCostPerPoint" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "SkillConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillBranch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SkillBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillNode" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "maxLevel" INTEGER NOT NULL,
    "effectType" "SkillEffectType" NOT NULL,
    "posX" INTEGER NOT NULL,
    "posY" INTEGER NOT NULL,

    CONSTRAINT "SkillNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillNodeLevel" (
    "nodeId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "effect" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SkillNodeLevel_pkey" PRIMARY KEY ("nodeId","level")
);

-- CreateTable
CREATE TABLE "SkillEdge" (
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SkillEdge_pkey" PRIMARY KEY ("fromNodeId","toNodeId")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("userId","nodeId")
);

-- AddForeignKey
ALTER TABLE "SkillNode" ADD CONSTRAINT "SkillNode_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "SkillBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillNodeLevel" ADD CONSTRAINT "SkillNodeLevel_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "SkillNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillEdge" ADD CONSTRAINT "SkillEdge_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "SkillNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillEdge" ADD CONSTRAINT "SkillEdge_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "SkillNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "SkillNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
