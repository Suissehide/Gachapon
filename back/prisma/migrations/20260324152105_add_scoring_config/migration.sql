-- CreateTable
CREATE TABLE "ScoringConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "commonPoints" INTEGER NOT NULL DEFAULT 1,
    "uncommonPoints" INTEGER NOT NULL DEFAULT 3,
    "rarePoints" INTEGER NOT NULL DEFAULT 8,
    "epicPoints" INTEGER NOT NULL DEFAULT 20,
    "legendaryPoints" INTEGER NOT NULL DEFAULT 50,
    "brilliantMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "holographicMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoringConfig_pkey" PRIMARY KEY ("id")
);
