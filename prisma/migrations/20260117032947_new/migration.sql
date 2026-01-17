/*
  Warnings:

  - Made the column `isProtected` on table `Roles` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
-- Only set NOT NULL if the column exists (safety for environments where add column ran later)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Roles' AND column_name = 'isProtected'
  ) THEN
    ALTER TABLE "Roles" ALTER COLUMN "isProtected" SET NOT NULL;
  END IF;
END
$$;

-- AlterTable
-- Only drop default if the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'UserPermissions'
  ) THEN
    ALTER TABLE "UserPermissions" ALTER COLUMN "id" DROP DEFAULT;
  END IF;
END
$$;
