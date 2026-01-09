import { prisma } from "../lib/prisma";

// Default fulfillment types to seed
const defaults = [
  { code: "COOKING", name: "Cooking" },
  { code: "ASSEMBLY", name: "Assembly" },
  { code: "QUALITY_CHECK", name: "Quality Check" },
  { code: "PACKAGING", name: "Packaging" },
  { code: "CUSTOM", name: "Custom" },
];

async function seedFulfillmentTypes() {
  console.log("Seeding fulfillment types...");

  for (const ft of defaults) {
    try {
      const existing = await prisma.fulfillmentType.findUnique({
        where: { code: ft.code },
      });

      if (existing) {
        console.log(`Fulfillment type ${ft.code} already exists, skipping`);
        continue;
      }

      await prisma.fulfillmentType.create({
        data: {
          code: ft.code,
          name: ft.name,
          isActive: true,
          sortOrder: defaults.indexOf(ft),
        },
      });
      console.log(`Created fulfillment type: ${ft.code}`);
    } catch (error) {
      console.error(`Failed to create ${ft.code}:`, error);
      process.exitCode = 1;
    }
  }

  console.log("Seeding completed.");
}

seedFulfillmentTypes()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
