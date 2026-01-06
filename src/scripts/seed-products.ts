import { prisma } from "../lib/prisma";
import { generateId, generateSKU } from "../lib/utils";

const sampleProducts = [
  {
    name: "Coca Cola",
    category: "Beverages",
    description: "Classic cola drink",
    cost: 15.0,
    sellingPrice: 25.0,
  },
  {
    name: "Pepsi",
    category: "Beverages",
    description: "Popular cola drink",
    cost: 14.0,
    sellingPrice: 24.0,
  },
  {
    name: "Sprite",
    category: "Beverages",
    description: "Lemon-lime soda",
    cost: 13.0,
    sellingPrice: 23.0,
  },
  {
    name: "Burger",
    category: "Food",
    description: "Classic beef burger",
    cost: 50.0,
    sellingPrice: 80.0,
  },
  {
    name: "Fries",
    category: "Food",
    description: "Crispy french fries",
    cost: 20.0,
    sellingPrice: 35.0,
  },
  {
    name: "Pizza",
    category: "Food",
    description: "Cheese pizza",
    cost: 60.0,
    sellingPrice: 100.0,
  },
];

async function seedProducts() {
  console.log("Seeding products...");

  for (const productData of sampleProducts) {
    try {
      // Generate sequential ID
      const lastProduct = await prisma.product.findFirst({
        orderBy: { id: "desc" },
        select: { id: true },
      });

      let nextNumber = 1;
      if (lastProduct) {
        // Extract the numeric part from the last ID (e.g., "P000005" -> 5)
        const lastNumber = parseInt(lastProduct.id.substring(1), 10);
        nextNumber = lastNumber + 1;
      }

      const id = generateId("P", nextNumber);

      // Generate unique SKU
      const sku = await generateSKU(productData.category);

      await prisma.product.create({
        data: {
          id,
          sku,
          ...productData,
          status: "ACTIVE",
          isDraft: false,
        },
      });

      console.log(`Created product: ${productData.name} (ID: ${id})`);
    } catch (error) {
      console.error(`Failed to create product ${productData.name}:`, error);
    }
  }

  console.log("Seeding completed!");
}

seedProducts()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
