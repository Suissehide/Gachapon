-- Niveau de difficulté du raid, figé à la création (raid-rules.ts#nextRaidLevel).
ALTER TABLE "TeamRaid" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 0;

-- Les paliers existent désormais par niveau : les 4 lignes seedées deviennent
-- le niveau 0 (la valeur par défaut les couvre), et l'unicité passe sur le
-- couple. Aucune donnée à migrer.
ALTER TABLE "RaidTier" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 0;
DROP INDEX "RaidTier_pct_key";
CREATE UNIQUE INDEX "RaidTier_pct_level_key" ON "RaidTier"("pct", "level");
