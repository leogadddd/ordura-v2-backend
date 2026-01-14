-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'KITCHEN_STAFF';
ALTER TYPE "UserRole" ADD VALUE 'SERVER';
ALTER TYPE "UserRole" ADD VALUE 'INVENTORY_MANAGER';
ALTER TYPE "UserRole" ADD VALUE 'COMMON';

-- AlterTable
ALTER TABLE "CommonUsers" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
