import { prisma } from "../lib/prisma";

async function cleanup() {
  console.log("Searching for wildcard permissions to remove...\n");

  const perms = await prisma.permission.findMany({
    where: { name: { contains: "*" } },
  });

  if (perms.length === 0) {
    console.log("No wildcard permissions found.");
    return;
  }

  console.log(`Found ${perms.length} wildcard permission(s):`);
  for (const p of perms) console.log(`  - ${p.name} (${p.id})`);

  const ids = perms.map((p) => p.id);

  // Remove related mappings first
  console.log("Deleting related RolePermission and UserPermission mappings...");
  await prisma.rolePermission.deleteMany({
    where: { permissionId: { in: ids } },
  });
  await prisma.userPermission.deleteMany({
    where: { permissionId: { in: ids } },
  });

  // Delete the permission rows
  console.log("Deleting wildcard permission rows...");
  await prisma.permission.deleteMany({ where: { id: { in: ids } } });

  console.log("Cleanup completed.");
}

cleanup()
  .catch((e) => {
    console.error("Failed to cleanup wildcard permissions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
