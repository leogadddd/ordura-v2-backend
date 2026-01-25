import { prisma } from "../lib/prisma";
import { getAllPermissions } from "../lib/permissions";

export async function seedRoles() {
  console.log("🌱 Seeding roles...");

  // If no permissions exist in DB, seed all concrete permissions first.
  const existingPermCount = await prisma.permission.count();
  if (existingPermCount === 0) {
    console.log("No permissions found in DB — seeding permissions...");
    const perms = getAllPermissions();
    for (const name of perms) {
      try {
        await prisma.permission.create({ data: { name } });
        console.log(`  ➕ Created permission: ${name}`);
      } catch (err) {
        // ignore duplicates / race conditions
      }
    }
    console.log("✅ Permissions seeded.");
  } else {
    console.log(`Permissions exist (${existingPermCount}), skipping seeding.`);
  }

  const roles = [
    {
      name: "Administrator",
      description: "Full system access with all permissions",
      // Use wildcard here for human readability; expanded to concrete permissions
      // by `expandPermissions` before syncing.
      permissions: ["*"],
      isProtected: true,
    },
  ];

  function expandPermissions(desired: string[] = []) {
    const all = getAllPermissions();
    const set = new Set<string>();

    for (const raw of desired) {
      const p = String(raw || "").trim();
      if (!p) continue;
      if (p === "*") {
        for (const a of all) set.add(a);
        continue;
      }
      if (p.endsWith(":*")) {
        const resource = p.split(":")[0];
        for (const a of all) if (a.startsWith(`${resource}:`)) set.add(a);
        continue;
      }
      if (p.startsWith("*:")) {
        const action = p.split(":")[1];
        for (const a of all) if (a.endsWith(`:${action}`)) set.add(a);
        continue;
      }
      // concrete permission
      set.add(p);
    }

    return Array.from(set);
  }

  for (const roleData of roles) {
    try {
      // Expand wildcard entries into concrete permissions and validate
      const desired = roleData.permissions ?? [];
      const expanded = expandPermissions(desired);
      const allowed = new Set(getAllPermissions());
      const invalid = expanded.filter((p) => !allowed.has(p));
      if (invalid.length > 0) {
        throw new Error(
          `Role ${roleData.name} contains invalid permissions after expansion: ${invalid.join(
            ", ",
          )}`,
        );
      }

      // Upsert the role and ensure isProtected field is set when provided
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: {
          description: roleData.description,
          // preserve protection flag if already set or set it from seed data
          isProtected: roleData.isProtected ?? undefined,
        },
        create: {
          name: roleData.name,
          description: roleData.description,
          isProtected: roleData.isProtected ?? false,
        },
      });

      console.log(`✅ Created/Updated role: ${role.name}`);

      // Expand any wildcard-style entries (e.g., '*', 'PRODUCTS:*', '*:VIEW')
      // into the concrete permission list and sync those.
      const perms = expandPermissions(roleData.permissions ?? []);

      for (const name of perms) {
        if (!name) continue;

        let permission = await prisma.permission.findUnique({
          where: { name },
        });
        if (!permission) {
          permission = await prisma.permission.create({ data: { name } });
          console.log(`  ➕ Created permission: ${name}`);
        }

        const existing = await prisma.rolePermission.findFirst({
          where: { roleId: role.id, permissionId: permission.id },
        });
        if (!existing) {
          await prisma.rolePermission.create({
            data: { roleId: role.id, permissionId: permission.id },
          });
          console.log(`  ➕ Granted permission ${name} to role ${role.name}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error creating role ${roleData.name}:`, error);
    }
  }

  console.log("🌱 Role seeding finished.");
  console.log("🎉 Roles seeding completed!");
}

// If this script is run directly (as a CLI), run the seeder
if (require.main === module) {
  seedRoles()
    .catch((e) => {
      console.error("❌ Error seeding roles:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
