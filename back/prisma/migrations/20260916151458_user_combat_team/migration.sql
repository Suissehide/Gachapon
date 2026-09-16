-- CreateTable
CREATE TABLE "UserCombatTeam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userCardIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCombatTeam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserCombatTeam_userId_idx" ON "UserCombatTeam"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCombatTeam_userId_key_key" ON "UserCombatTeam"("userId", "key");

-- AddForeignKey
ALTER TABLE "UserCombatTeam" ADD CONSTRAINT "UserCombatTeam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise : l'équipe unique existante devient l'équipe de campagne, qui est
-- la racine du repli — les cinq autres modes en héritent tant qu'ils n'ont
-- pas été édités, donc aucune autre ligne n'est à créer.
INSERT INTO "UserCombatTeam" ("id", "userId", "key", "userCardIds", "updatedAt")
SELECT gen_random_uuid(), "id", 'campaign', "combatTeam", NOW()
FROM "User"
WHERE cardinality("combatTeam") > 0
ON CONFLICT ("userId", "key") DO NOTHING;
