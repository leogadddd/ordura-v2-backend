import { prisma } from "../lib/prisma";

async function seedRoles() {
  console.log("🌱 Seeding roles...");

  const roles = [
    {
      name: "Administrator",
      description: "Full system access with all permissions",
      permissions: ["*"],
    },
    {
      name: "Manager",
      description: "Management level access for overseeing operations",
      permissions: [
        "USERS:view",
        "USERS:create",
        "USERS:edit",
        "ROLES:view",
        "PRODUCTS:view",
        "PRODUCTS:create",
        "PRODUCTS:edit",
        "ORDERS:view",
        "ORDERS:create",
        "ORDERS:edit",
        "REPORTS:view",
        "SETTINGS:view",
      ],
    },
    {
      name: "Cashier",
      description: "Point of sale operations and basic order management",
      permissions: [
        "USERS:view",
        "PRODUCTS:view",
        "ORDERS:view",
        "ORDERS:create",
        "ORDERS:edit",
      ],
    },
    {
      name: "Kitchen Staff",
      description: "Kitchen operations and order fulfillment",
      permissions: [
        "USERS:view",
        "PRODUCTS:view",
        "ORDERS:view",
        "ORDERS:edit",
      ],
    },
    {
      name: "Inventory Manager",
      description: "Product and inventory management",
      permissions: [
        "USERS:view",
        "PRODUCTS:view",
        "PRODUCTS:create",
        "PRODUCTS:edit",
        "PRODUCTS:delete",
        "ORDERS:view",
        "REPORTS:view",
      ],
    },
  ];

  for (const roleData of roles) {
    try {
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: roleData,
        create: roleData,
      });
      console.log(`✅ Created/Updated role: ${role.name}`);
    } catch (error) {
      console.error(`❌ Error creating role ${roleData.name}:`, error);
    }
  }

  console.log("🌱 Role seeding finished.");

  console.log("🎉 Roles seeding completed!");
}

seedRoles()
  .catch((e) => {
    console.error("❌ Error seeding roles:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
