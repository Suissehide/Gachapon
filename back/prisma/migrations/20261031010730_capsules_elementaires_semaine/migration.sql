-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CapsuleType" ADD VALUE 'FIRE';
ALTER TYPE "CapsuleType" ADD VALUE 'WATER';
ALTER TYPE "CapsuleType" ADD VALUE 'NATURE';
ALTER TYPE "CapsuleType" ADD VALUE 'EARTH';
ALTER TYPE "CapsuleType" ADD VALUE 'WEEKLY';

-- AlterEnum
ALTER TYPE "PullSource" ADD VALUE 'CAPSULE';
