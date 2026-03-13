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
    const [items, totalLocations, levelTotals] = await Promise.all([
      prisma.inventoryItem.findMany({
        select: { id: true, lowThreshold: true, shouldAlert: true },
      }),
      prisma.location.count(),
      prisma.inventoryLevel.groupBy({
        by: ["inventoryItemId"],
        _sum: { quantity: true },
      }),
    ]);

    const totalByItemId = new Map<string, number>();
    for (const row of levelTotals) {
      totalByItemId.set(row.inventoryItemId, row._sum.quantity ?? 0);
    }

    let totalStockUnits = 0;
    let outOfStockSkus = 0;
    let lowStockSkus = 0;

    for (const item of items) {
      const totalQty = totalByItemId.get(item.id) ?? 0;
      totalStockUnits += totalQty;

      if (totalQty === 0) outOfStockSkus += 1;

      if (
        item.shouldAlert &&
        typeof item.lowThreshold === "number" &&
        item.lowThreshold >= 0 &&
        totalQty >= 0 &&
        totalQty <= item.lowThreshold
      ) {
        lowStockSkus += 1;
      }
    }

    const data: InventorySummary = {
      totalSkus: items.length,
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
