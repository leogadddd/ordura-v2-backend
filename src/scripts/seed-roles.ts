import { prisma } from "../lib/prisma";

async function seedRoles() {
  console.log("🌱 Seeding roles...");

  const roles = [
    {
      name: "Administrator",
      description: "Full system access with all permissions",
      permissions: {
        users: { create: true, read: true, update: true, delete: true },
        roles: { create: true, read: true, update: true, delete: true },
        products: { create: true, read: true, update: true, delete: true },
        orders: { create: true, read: true, update: true, delete: true },
        reports: { read: true },
        settings: { read: true, update: true },
      },
    },
    {
      name: "Manager",
      description: "Management level access for overseeing operations",
      permissions: {
        users: { create: true, read: true, update: true, delete: false },
        roles: { read: true },
        products: { create: true, read: true, update: true, delete: false },
        orders: { create: true, read: true, update: true, delete: false },
        reports: { read: true },
        settings: { read: true, update: false },
      },
    },
    {
      name: "Cashier",
      description: "Point of sale operations and basic order management",
      permissions: {
        users: { read: true },
        products: { read: true },
        orders: { create: true, read: true, update: true, delete: false },
        reports: { read: false },
        settings: { read: false },
      },
    },
    {
      name: "Kitchen Staff",
      description: "Kitchen operations and order fulfillment",
      permissions: {
        users: { read: true },
        products: { read: true },
        orders: { read: true, update: true }, // Can update order status for fulfillment
        reports: { read: false },
        settings: { read: false },
      },
    },
    {
      name: "Inventory Manager",
      description: "Product and inventory management",
      permissions: {
        users: { read: true },
        products: { create: true, read: true, update: true, delete: true },
        orders: { read: true },
        reports: { read: true },
        settings: { read: false },
      },
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
