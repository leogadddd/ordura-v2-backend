import { prisma } from "../lib/prisma";
import { getAllPermissions } from "../lib/permissions";

export async function seedRoles() {
  console.log("🌱 Seeding roles...");

  const roles = [
    {
      name: "Administrator",
      description: "Full system access with all permissions",
      permissions: ["*"],
      isProtected: true,
    },
  ];

  for (const roleData of roles) {
    try {
      // Validate permissions against the manifest
      const allowed = new Set(getAllPermissions());
      const invalid = (roleData.permissions ?? []).filter(
        (p) => !allowed.has(p)
      );
      if (invalid.length > 0) {
        throw new Error(
          `Role ${roleData.name} contains invalid permissions: ${invalid.join(
            ", "
          )}`
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

      // Sync permissions into normalized tables
      const perms = roleData.permissions ?? [];
      for (const raw of perms) {
        const name = String(raw).trim();
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
