import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import {
  sendConflict,
  sendError,
  sendNotFound,
  sendSuccess,
  sendValidationError,
} from "../../lib/response";
import { sanitizeInput } from "../../util/sanitize";

interface CreateStockBody {
  productId: string;
  locationId: string;
  quantity?: number;
  reason?: string;
}

export const createStock: RouteHandlerMethod = async (request, reply) => {
  try {
    const {
      productId,
      locationId,
      quantity = 0,
      reason,
    } = sanitizeInput<CreateStockBody>(request.body, {
      allowedFields: ["productId", "locationId", "quantity", "reason"],
      trimStrings: true,
      removeEmpty: true,
      parseIntegers: ["quantity"],
      parseNumbers: ["quantity"],
    });

    if (!productId || !locationId) {
      return sendValidationError(reply, {
        fields: ["productId", "locationId"],
      });
    }

    if (quantity < 0) {
      return sendValidationError(reply, {
        quantity: ["Initial quantity cannot be negative"],
      });
    }

    const existingStock = await prisma.stock.findUnique({
      where: { productId_locationId: { productId, locationId } },
    });

    if (existingStock) {
      return sendConflict(
        reply,
        "Stock entry already exists for this product and location",
      );
    }

    const userId = (request.user as any)?.id ?? (request.user as any)?.sub;
    if (!userId) {
      return sendError(reply, "Unauthorized", 401);
    }

    const [product, location] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.location.findUnique({ where: { id: locationId } }),
    ]);

    if (!product) {
      return sendNotFound(reply, "Product not found");
    }

    if (!location) {
      return sendNotFound(reply, "Location not found");
    }

    const stock = await prisma.$transaction(async (tx) => {
      const createdStock = await tx.stock.create({
        data: {
          productId,
          locationId,
          quantity,
        },
        include: { product: true, location: true },
      });

      if (quantity > 0) {
        await tx.inventoryAdjustment.create({
          data: {
            stockId: createdStock.id,
            quantity,
            reason: reason || "Initial stock",
            createdById: userId,
          },
        });
      }

      return createdStock;
    });

    return sendSuccess(reply, stock, "Stock entry created", 201);
  } catch (error: any) {
    console.error("createStock error", error, { body: request.body });
    return sendError(reply, "Failed to create stock entry", 500);
  }
};

export const deleteStock: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const existingStock = await prisma.stock.findUnique({
      where: { id },
      include: { product: true, location: true },
    });

    if (!existingStock) {
      return sendNotFound(reply, "Stock entry not found");
    }

    await prisma.stock.delete({ where: { id } });

    return sendSuccess(
      reply,
      existingStock,
      "Stock entry deleted successfully",
    );
  } catch (error: any) {
    console.error("deleteStock error", error, {
      id: (request.params as any)?.id,
    });
    return sendError(reply, "Failed to delete stock entry", 500);
  }
};
