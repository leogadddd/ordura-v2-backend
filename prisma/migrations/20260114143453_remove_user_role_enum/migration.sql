/*
  Warnings:

  - You are about to drop the column `role` on the `CommonUsers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CommonUsers" DROP COLUMN "role";

-- DropEnum
DROP TYPE "UserRole";
