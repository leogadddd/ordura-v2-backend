import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendError, sendSuccess } from "../../lib/response";

interface InventorySummary {
  totalSkus: number;
  totalLocations: number;
  totalStockUnits: number;
  outOfStockSkus: number;
  lowStockSkus: number;
}

export const getInventorySummary: RouteHandlerMethod = async (
  _request,
  reply,
) => {
  try {
    const [products, totalLocations, stockTotals] = await Promise.all([
      prisma.product.findMany({
        where: { isDraft: false },
        select: { id: true, reorderPoint: true },
      }),
      prisma.location.count(),
      prisma.stock.groupBy({
        by: ["productId"],
        where: { product: { isDraft: false } },
        _sum: { quantity: true },
      }),
    ]);

    const totalByProductId = new Map<string, number>();
    for (const row of stockTotals) {
      totalByProductId.set(row.productId, row._sum.quantity ?? 0);
    }

    let totalStockUnits = 0;
    let outOfStockSkus = 0;
    let lowStockSkus = 0;

    for (const p of products) {
      const totalQty = totalByProductId.get(p.id) ?? 0;
      totalStockUnits += totalQty;

      if (totalQty === 0) outOfStockSkus += 1;

      if (
        typeof p.reorderPoint === "number" &&
        p.reorderPoint >= 0 &&
        totalQty > 0 &&
        totalQty <= p.reorderPoint
      ) {
        lowStockSkus += 1;
      }
    }

    const data: InventorySummary = {
      totalSkus: products.length,
      totalLocations,
      totalStockUnits,
      outOfStockSkus,
      lowStockSkus,
    };

    return sendSuccess(reply, data);
  } catch (error: any) {
    console.error("getInventorySummary error", error);
    return sendError(reply, "Failed to load inventory summary", 500);
  }
};
