-- Add isProtected column to Roles and a trigger to prevent deletion of protected roles

ALTER TABLE "Roles" ADD COLUMN IF NOT EXISTS "isProtected" BOOLEAN DEFAULT false;

-- Create function to prevent deleting protected roles
CREATE OR REPLACE FUNCTION prevent_protected_role_delete()
RETURNS trigger AS $$
BEGIN
  IF (OLD."isProtected" = true) OR (OLD."name" = 'Administrator') THEN
    RAISE EXCEPTION 'Cannot delete protected role';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to Roles table
DROP TRIGGER IF EXISTS prevent_protected_role_delete_trigger ON "Roles";
CREATE TRIGGER prevent_protected_role_delete_trigger
BEFORE DELETE ON "Roles"
FOR EACH ROW
EXECUTE PROCEDURE prevent_protected_role_delete();
