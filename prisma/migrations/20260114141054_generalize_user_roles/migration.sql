/*
  Warnings:

  - The values [CASHIER,KITCHEN_STAFF,SERVER,INVENTORY_MANAGER,COMMON] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE', 'USER');
ALTER TABLE "public"."CommonUsers" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "CommonUsers" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "CommonUsers" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
COMMIT;
