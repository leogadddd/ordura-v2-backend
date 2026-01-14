/*
  Warnings:

  - The values [MANAGER,SUPERVISOR,EMPLOYEE] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'USER');
ALTER TABLE "public"."CommonUsers" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "CommonUsers" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "CommonUsers" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- AlterTable
ALTER TABLE "CommonUsers" ADD COLUMN     "roleId" TEXT,
ALTER COLUMN "role" SET DEFAULT 'USER';

-- CreateTable
CREATE TABLE "Roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Roles_name_key" ON "Roles"("name");

-- CreateIndex
CREATE INDEX "Roles_name_idx" ON "Roles"("name");

-- CreateIndex
CREATE INDEX "Roles_isActive_idx" ON "Roles"("isActive");

-- CreateIndex
CREATE INDEX "CommonUsers_roleId_idx" ON "CommonUsers"("roleId");

-- AddForeignKey
ALTER TABLE "CommonUsers" ADD CONSTRAINT "CommonUsers_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
