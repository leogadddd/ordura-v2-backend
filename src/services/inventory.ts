import { prisma } from "../lib/prisma";

// decrement stock for a given location and list of items
export async function decrementStockForOrder(
  items: { productId?: string; quantity: number }[],
  locationId: string,
  userId: string,
) {
  if (!locationId) return;

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (!item.productId) continue;
      const productId = item.productId;
      const qty = item.quantity;

      // find or create stock row
      let stock = await tx.stock.findUnique({
        where: { productId_locationId: { productId, locationId } },
      });
      if (!stock) {
        stock = await tx.stock.create({
          data: { productId, locationId, quantity: 0 },
        });
      }

      const newQty = stock.quantity - qty;
      if (newQty < 0) {
        // Optionally throw or clamp at zero. For now allow negatives? we'll keep at zero.
        // throw new Error(`Insufficient stock for product ${productId}`);
      }

      await tx.inventoryAdjustment.create({
        data: {
          stockId: stock.id,
          quantity: -qty,
          reason: `Sale`,
          createdById: userId,
        },
      });

      await tx.stock.update({
        where: { id: stock.id },
        data: { quantity: newQty < 0 ? 0 : newQty },
      });
    }
  });
}
