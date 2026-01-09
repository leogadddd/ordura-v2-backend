import { prisma } from "../lib/prisma";

async function deleteFulfillmentType(code: string) {
  try {
    const existing = await prisma.fulfillmentType.findUnique({
      where: { code },
    });

    if (!existing) {
      console.error(`Fulfillment type with code ${code} not found`);
      process.exitCode = 1;
      return;
    }

    await prisma.fulfillmentType.delete({
      where: { code },
    });

    console.log(`Deleted fulfillment type with code ${code}`);
  } catch (error) {
    console.error(`Failed to delete fulfillment type ${code}:`, error);
    process.exitCode = 1;
  }
}

const code = process.argv[2];

if (!code) {
  console.error("Usage: npm run delete:fulfillment-type -- <CODE>");
  process.exit(1);
}

deleteFulfillmentType(code)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
