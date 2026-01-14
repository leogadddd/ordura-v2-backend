-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "CommonUsers" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';
