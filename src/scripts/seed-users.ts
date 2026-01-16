import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";

async function seedUsers() {
  console.log("🌱 Seeding users...");

  const users = [
    {
      roleName: "Administrator",
      email: "admin@ordura.com",
      username: "admin",
      password: "admin123",
      firstName: "Admin",
      lastName: "User",
    },
    {
      roleName: "Manager",
      email: "manager@ordura.com",
      username: "manager",
      password: "manager123",
      firstName: "Manager",
      lastName: "User",
    },
    {
      roleName: "Cashier",
      email: "cashier@ordura.com",
      username: "cashier",
      password: "cashier123",
      firstName: "Cashier",
      lastName: "User",
    },
    {
      roleName: "Kitchen Staff",
      email: "kitchen@ordura.com",
      username: "kitchen",
      password: "kitchen123",
      firstName: "Kitchen",
      lastName: "Staff",
    },
    {
      roleName: "Inventory Manager",
      email: "inventory@ordura.com",
      username: "inventory",
      password: "inventory123",
      firstName: "Inventory",
      lastName: "Manager",
    },
  ];

  for (const userData of users) {
    try {
      const role = await prisma.role.findUnique({
        where: { name: userData.roleName },
      });

      if (!role) {
        console.error(
          `❌ Role ${userData.roleName} not found. Skipping user ${userData.username}.`
        );
        continue;
      }

      const hashedPassword = await hashPassword(userData.password);

      const user = await prisma.commonUser.upsert({
        where: { username: userData.username },
        update: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          roleId: role.id,
        },
        create: {
          email: userData.email,
          username: userData.username,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          roleId: role.id,
        },
      });

      console.log(
        `✅ Created/Updated user: ${user.username} (${userData.roleName})`
      );
    } catch (error) {
      console.error(`❌ Error creating user ${userData.username}:`, error);
    }
  }

  console.log("🌱 User seeding finished.");
  console.log("🎉 Users seeding completed!");
}

seedUsers()
  .catch((e) => {
    console.error("❌ Error seeding users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
