-- AlterTable
-- Only run the alter if the table exists (safety for shadow DBs)
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
