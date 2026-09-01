-- CreateTable
CREATE TABLE "TowerFloor" (
    "id" TEXT NOT NULL,
    "element" "CardElement" NOT NULL,
    "index" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "enemyTeam" JSONB NOT NULL,
    "lootTable" JSONB NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "TowerFloor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTowerProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "element" "CardElement" NOT NULL,
    "highestFloor" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTowerProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TowerFloor_element_index_key" ON "TowerFloor"("element", "index");

-- CreateIndex
CREATE INDEX "UserTowerProgress_userId_idx" ON "UserTowerProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTowerProgress_userId_element_key" ON "UserTowerProgress"("userId", "element");

-- AddForeignKey
ALTER TABLE "UserTowerProgress" ADD CONSTRAINT "UserTowerProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
