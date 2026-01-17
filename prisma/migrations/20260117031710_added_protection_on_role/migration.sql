/*
  Warnings:

  - Made the column `isProtected` on table `Roles` required. This step will fail if there are existing NULL values in that column.

*/
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

-- Only run the alter if the UserPermissions table exists (safety for shadow DBs)
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
