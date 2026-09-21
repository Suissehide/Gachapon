-- AlterTable
ALTER TABLE "Achievement" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "descriptionFr" TEXT,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "nameFr" TEXT;

-- AlterTable
ALTER TABLE "CampaignStage" ADD COLUMN     "labelEn" TEXT,
ADD COLUMN     "labelFr" TEXT;

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "nameFr" TEXT;

-- AlterTable
ALTER TABLE "CardSet" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "descriptionFr" TEXT,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "nameFr" TEXT;

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "nameFr" TEXT;

-- AlterTable
ALTER TABLE "RaidBoss" ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "nameFr" TEXT;

-- AlterTable
ALTER TABLE "Rewards" ADD COLUMN     "labelEn" TEXT,
ADD COLUMN     "labelFr" TEXT;

-- AlterTable
ALTER TABLE "ShopItem" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "descriptionFr" TEXT,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "nameFr" TEXT;

-- AlterTable
ALTER TABLE "SkillBranch" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "descriptionFr" TEXT,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "nameFr" TEXT;

-- AlterTable
ALTER TABLE "SkillNode" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "descriptionFr" TEXT,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "nameFr" TEXT;

-- AlterTable
ALTER TABLE "TowerFloor" ADD COLUMN     "labelEn" TEXT,
ADD COLUMN     "labelFr" TEXT;

-- Backfill : recopie le contenu existant dans les DEUX langues. Les colonnes
-- `*En` reçoivent provisoirement le français — la tâche 8 y mettra la vraie
-- traduction. Cette étape est ce qui rend la migration applicable sur une
-- base non vide : ajouter directement en NOT NULL échouerait en production
-- (Prisma refuse même de générer un tel diff, constaté ici sur la base de
-- dev, 665 lignes dans `Equipment`).
UPDATE "Achievement" SET "nameFr" = "name", "nameEn" = "name",
                         "descriptionFr" = "description", "descriptionEn" = "description";
UPDATE "CampaignStage" SET "labelFr" = "label", "labelEn" = "label";
UPDATE "Card" SET "nameFr" = "name", "nameEn" = "name";
UPDATE "CardSet" SET "nameFr" = "name", "nameEn" = "name",
                     "descriptionFr" = "description", "descriptionEn" = "description";
UPDATE "Equipment" SET "nameFr" = "name", "nameEn" = "name";
UPDATE "RaidBoss" SET "nameFr" = "name", "nameEn" = "name";
UPDATE "Rewards" SET "labelFr" = "label", "labelEn" = "label";
UPDATE "ShopItem" SET "nameFr" = "name", "nameEn" = "name",
                      "descriptionFr" = "description", "descriptionEn" = "description";
UPDATE "SkillBranch" SET "nameFr" = "name", "nameEn" = "name",
                         "descriptionFr" = "description", "descriptionEn" = "description";
UPDATE "SkillNode" SET "nameFr" = "name", "nameEn" = "name",
                       "descriptionFr" = "description", "descriptionEn" = "description";
UPDATE "TowerFloor" SET "labelFr" = "label", "labelEn" = "label";

-- NOT NULL sur les SEULES colonnes dont l'original l'était. Restent nullable,
-- délibérément : `CardSet.descriptionFr/En` et `Rewards.labelFr/En`, dont
-- l'original était `String?`.
ALTER TABLE "Achievement" ALTER COLUMN "nameFr" SET NOT NULL,
                          ALTER COLUMN "nameEn" SET NOT NULL,
                          ALTER COLUMN "descriptionFr" SET NOT NULL,
                          ALTER COLUMN "descriptionEn" SET NOT NULL;
ALTER TABLE "CampaignStage" ALTER COLUMN "labelFr" SET NOT NULL,
                            ALTER COLUMN "labelEn" SET NOT NULL;
ALTER TABLE "Card" ALTER COLUMN "nameFr" SET NOT NULL,
                   ALTER COLUMN "nameEn" SET NOT NULL;
ALTER TABLE "CardSet" ALTER COLUMN "nameFr" SET NOT NULL,
                      ALTER COLUMN "nameEn" SET NOT NULL;
ALTER TABLE "Equipment" ALTER COLUMN "nameFr" SET NOT NULL,
                        ALTER COLUMN "nameEn" SET NOT NULL;
ALTER TABLE "RaidBoss" ALTER COLUMN "nameFr" SET NOT NULL,
                       ALTER COLUMN "nameEn" SET NOT NULL;
ALTER TABLE "ShopItem" ALTER COLUMN "nameFr" SET NOT NULL,
                       ALTER COLUMN "nameEn" SET NOT NULL,
                       ALTER COLUMN "descriptionFr" SET NOT NULL,
                       ALTER COLUMN "descriptionEn" SET NOT NULL;
ALTER TABLE "SkillBranch" ALTER COLUMN "nameFr" SET NOT NULL,
                          ALTER COLUMN "nameEn" SET NOT NULL,
                          ALTER COLUMN "descriptionFr" SET NOT NULL,
                          ALTER COLUMN "descriptionEn" SET NOT NULL;
ALTER TABLE "SkillNode" ALTER COLUMN "nameFr" SET NOT NULL,
                        ALTER COLUMN "nameEn" SET NOT NULL,
                        ALTER COLUMN "descriptionFr" SET NOT NULL,
                        ALTER COLUMN "descriptionEn" SET NOT NULL;
ALTER TABLE "TowerFloor" ALTER COLUMN "labelFr" SET NOT NULL,
                         ALTER COLUMN "labelEn" SET NOT NULL;

-- DropColumn
ALTER TABLE "Achievement" DROP COLUMN "name", DROP COLUMN "description";
ALTER TABLE "CampaignStage" DROP COLUMN "label";
ALTER TABLE "Card" DROP COLUMN "name";
ALTER TABLE "CardSet" DROP COLUMN "name", DROP COLUMN "description";
ALTER TABLE "Equipment" DROP COLUMN "name";
ALTER TABLE "RaidBoss" DROP COLUMN "name";
ALTER TABLE "Rewards" DROP COLUMN "label";
ALTER TABLE "ShopItem" DROP COLUMN "name", DROP COLUMN "description";
ALTER TABLE "SkillBranch" DROP COLUMN "name", DROP COLUMN "description";
ALTER TABLE "SkillNode" DROP COLUMN "name", DROP COLUMN "description";
ALTER TABLE "TowerFloor" DROP COLUMN "label";
