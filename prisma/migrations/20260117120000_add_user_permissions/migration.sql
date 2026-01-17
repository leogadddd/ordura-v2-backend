-- Create UserPermissions table for per-user permission overrides

CREATE TABLE "UserPermissions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "isAllowed" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "UserPermissions_userId_permissionId_key" ON "UserPermissions"("userId", "permissionId");
CREATE INDEX "UserPermissions_userId_idx" ON "UserPermissions"("userId");
CREATE INDEX "UserPermissions_permissionId_idx" ON "UserPermissions"("permissionId");

ALTER TABLE "UserPermissions" ADD CONSTRAINT "UserPermissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CommonUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPermissions" ADD CONSTRAINT "UserPermissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
