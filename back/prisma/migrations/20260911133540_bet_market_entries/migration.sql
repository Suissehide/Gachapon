-- Le pari devient un MARCHE : l'enonce reste sur `Bet`, l'argent passe dans
-- `BetEntry`. Celui qui ouvre pose la premiere mise, les autres rencherissent
-- du camp qu'ils veulent tant que le marche est ouvert.
--
-- Fichier compose a la main a partir de la sortie de `prisma migrate diff`,
-- et SEULEMENT pour cette raison : `migrate dev` ne sait pas deplacer des
-- donnees, il aurait supprime `stake`/`side`/`payout` avant qu'elles ne
-- soient recopiees. L'ordre ci-dessous cree, recopie, puis supprime.

-- 1. La table des mises.
CREATE TABLE "BetEntry" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "side" "BetSide" NOT NULL,
    "stake" INTEGER NOT NULL,
    "payout" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BetEntry_betId_idx" ON "BetEntry"("betId");
CREATE INDEX "BetEntry_userId_idx" ON "BetEntry"("userId");
CREATE UNIQUE INDEX "BetEntry_betId_userId_key" ON "BetEntry"("betId", "userId");

ALTER TABLE "BetEntry" ADD CONSTRAINT "BetEntry_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BetEntry" ADD CONSTRAINT "BetEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Chaque pari existant devient un marche a une seule entree : celle de
--    celui qui l'avait pose.
INSERT INTO "BetEntry" ("id", "betId", "userId", "side", "stake", "payout", "createdAt")
SELECT gen_random_uuid(), "id", "bettorId", "side", "stake", "payout", "createdAt"
FROM "Bet";

-- 3. On stocke desormais la PROBABILITE et non la cote : un marche a deux
--    camps, et les deux cotes theoriques s'en derivent. La reprise inverse la
--    cote existante a la commission par defaut (10 %), ce qui suffit pour des
--    paris deja places — leur plancher theorique sera recalcule au reglement
--    de toute facon, et borne par cette valeur.
ALTER TABLE "Bet" ADD COLUMN "probability" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "Bet"
SET "probability" = GREATEST(0.0001, LEAST(1,
  CASE WHEN "side" = 'NO' THEN 1 - (0.9 / "multiplier") ELSE 0.9 / "multiplier" END
))
WHERE "multiplier" > 0;

ALTER TABLE "Bet" ALTER COLUMN "probability" DROP DEFAULT;

-- 4. Les colonnes deplacees.
ALTER TABLE "Bet" DROP COLUMN "multiplier",
DROP COLUMN "payout",
DROP COLUMN "side",
DROP COLUMN "stake";
