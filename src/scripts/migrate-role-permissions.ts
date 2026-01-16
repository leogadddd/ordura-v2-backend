import { prisma } from "../lib/prisma";

async function migrateRolePermissions() {
  console.log("🔁 Migrating role permissions to normalized tables...");

  const roles = await prisma.role.findMany({ select: { id: true, name: true } });

  for (const role of roles) {
    // If legacy `permissions` field exists (pre-migration), migrate it. Otherwise skip.
    const legacy: any = (role as any).permissions;
    if (!legacy) {
      console.log(`  → No legacy permissions on role ${role.name}, skipping.`);
      continue;
    }
    const perms = legacy ?? [];
    for (const raw of perms) {
      const name = String(raw).trim();
      if (!name) continue;

      // upsert permission
      let permission = await prisma.permission.findUnique({ where: { name } });
      if (!permission) {
        permission = await prisma.permission.create({ data: { name } });
        console.log(`  ➕ Created permission: ${name}`);
      }

      // create mapping if not exists
      const existing = await prisma.rolePermission.findFirst({ where: { roleId: role.id, permissionId: permission.id } });
      if (!existing) {
        await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
        console.log(`  ➕ Granted permission ${name} to role ${role.name}`);
      }
    }
  }

  console.log("🔁 Migration finished.");
}

migrateRolePermissions()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
