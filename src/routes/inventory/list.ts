import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";

// list all stock entries, optionally filter by product or location
export const listStocks: RouteHandlerMethod = async (request, reply) => {
  try {
    const { productId, locationId, search } = request.query as {
      productId?: string;
      locationId?: string;
      search?: string;
    };

    const where: any = {};
    if (productId) where.productId = productId;
    if (locationId) where.locationId = locationId;

    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: "insensitive" } } },
        { product: { sku: { contains: search, mode: "insensitive" } } },
      ];
    }

    const stocks = await prisma.stock.findMany({
      where,
      include: { product: true, location: true },
    });

    return sendSuccess(reply, stocks);
  } catch (error: any) {
    console.error("listStocks error", error);
    return sendError(reply, "Failed to list stocks", 500);
  }
};
