import { prisma } from "../lib/prisma";

async function deleteAllProducts() {
  console.log("Deleting all products...");

  try {
    const result = await prisma.product.deleteMany();
    console.log(`Deleted ${result.count} products.`);
  } catch (error) {
    console.error("Failed to delete products:", error);
    process.exit(1);
  }

  console.log("Deletion completed!");
}

deleteAllProducts()
  .catch((error) => {
    console.error("Deletion failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
