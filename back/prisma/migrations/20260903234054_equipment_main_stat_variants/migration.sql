-- La stat principale passe en colonne : c'est elle qui portera l'unicite, ce
-- qui autorise plusieurs variantes d'un meme (slot, set, rarete).
-- Le defaut '' n'est qu'un echafaudage pour peupler les 140 lignes existantes
-- avant le backfill ; il est retire juste apres.

-- DropIndex
DROP INDEX "Equipment_slot_setKey_rarity_key";

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "mainStat" TEXT NOT NULL DEFAULT '';

-- Backfill : la stat principale est deja l'unique cle de `bonuses` (le seed
-- le garantit, cf. equipment-seed.test.ts). Les pieces deja possedees par les
-- joueurs continuent donc de pointer vers une ligne de catalogue valide, avec
-- la meme stat principale qu'avant.
UPDATE "Equipment"
SET "mainStat" = (SELECT k FROM jsonb_object_keys("bonuses") AS k LIMIT 1);

-- Plus de defaut : toute nouvelle ligne doit nommer sa stat principale.
ALTER TABLE "Equipment" ALTER COLUMN "mainStat" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_slot_setKey_rarity_mainStat_key" ON "Equipment"("slot", "setKey", "rarity", "mainStat");
