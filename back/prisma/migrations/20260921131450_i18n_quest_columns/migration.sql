-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('FR', 'EN');

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "descriptionFr" TEXT,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "nameFr" TEXT;

-- Backfill: recopie le contenu existant dans les deux langues. nameEn/descriptionEn
-- reçoivent provisoirement le français — une tâche ultérieure y mettra la vraie
-- traduction (voir task-3-brief.md, étape 2).
UPDATE "Quest" SET "nameFr" = "name", "nameEn" = "name",
                   "descriptionFr" = "description", "descriptionEn" = "description";

-- Les colonnes ne peuvent passer en NOT NULL qu'une fois remplies.
ALTER TABLE "Quest" ALTER COLUMN "nameFr" SET NOT NULL,
                    ALTER COLUMN "nameEn" SET NOT NULL,
                    ALTER COLUMN "descriptionFr" SET NOT NULL,
                    ALTER COLUMN "descriptionEn" SET NOT NULL;

-- DropColumn
ALTER TABLE "Quest" DROP COLUMN "name", DROP COLUMN "description";
