-- AlterTable
ALTER TABLE "UserEquipment" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "substats" JSONB NOT NULL DEFAULT '[]';
