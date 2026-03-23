-- AlterEnum: Add NORMAL value to CardVariant
-- This must be in its own transaction (committed before being used)
ALTER TYPE "CardVariant" ADD VALUE 'NORMAL';
