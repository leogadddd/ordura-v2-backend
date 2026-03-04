import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";

export const getStock: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const stock = await prisma.stock.findUnique({
      where: { id },
      include: { product: true, location: true, adjustments: true },
    });
    if (!stock) {
      return sendError(reply, "Stock not found", 404);
    }

    return sendSuccess(reply, stock);
  } catch (error: any) {
    console.error("getStock error", error);
    return sendError(reply, "Failed to retrieve stock", 500);
  }
};
