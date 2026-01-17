/*
  Warnings:

  - Made the column `isProtected` on table `Roles` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Roles" ALTER COLUMN "isProtected" SET NOT NULL;

-- AlterTable
ALTER TABLE "UserPermissions" ALTER COLUMN "id" DROP DEFAULT;
