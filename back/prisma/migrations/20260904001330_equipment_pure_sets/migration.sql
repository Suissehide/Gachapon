-- Trois sets "purs" : les deux paliers portent la meme stat en pourcentage.
-- CELERITE s'arrete a 2 pieces (pas de palier 4), cf. set-bonuses.ts.
--
-- AlterEnum
-- Postgres >= 12 accepte plusieurs ADD VALUE dans une meme migration.
ALTER TYPE "EquipmentSet" ADD VALUE 'ASSAUT';
ALTER TYPE "EquipmentSet" ADD VALUE 'COLOSSE';
ALTER TYPE "EquipmentSet" ADD VALUE 'CELERITE';
