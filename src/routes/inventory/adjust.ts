import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import {
  sendSuccess,
  sendValidationError,
  sendError,
} from "../../lib/response";
import { sanitizeInput } from "../../util/sanitize";

interface AdjustBody {
  stockId?: string;
  productId?: string;
  locationId?: string;
  quantity: number; // positive to add, negative to remove
  reason: string;
}

export const adjustStock: RouteHandlerMethod = async (request, reply) => {
  try {
    const { stockId, productId, locationId, quantity, reason } =
      sanitizeInput<AdjustBody>(request.body, {
        allowedFields: [
          "stockId",
          "productId",
          "locationId",
          "quantity",
          "reason",
        ],
        trimStrings: true,
        removeEmpty: true,
        parseNumbers: ["quantity"],
      });

    if (!reason || quantity === undefined) {
      return sendValidationError(reply, { fields: ["quantity", "reason"] });
    }

    // find or create stock row
    let stock;
    if (stockId) {
      stock = await prisma.stock.findUnique({ where: { id: stockId } });
    } else if (productId && locationId) {
      stock = await prisma.stock.findUnique({
        where: { productId_locationId: { productId, locationId } },
      });
      if (!stock) {
        stock = await prisma.stock.create({
          data: { productId, locationId, quantity: 0 },
        });
      }
    } else {
      return sendValidationError(reply, {
        fields: ["stockId or productId+locationId"],
      });
    }

    if (!stock) {
      return sendError(reply, "Stock entry not found", 404);
    }

    const newQty = stock.quantity + quantity;
    if (newQty < 0) {
      // Validation errors must be a map field -> string[]; provide message separately
      return sendValidationError(
        reply,
        { quantity: ["Resulting quantity cannot be negative"] },
      );
    }

    // perform adjustment in transaction
    const result = await prisma.$transaction(async (tx) => {
      const adj = await tx.inventoryAdjustment.create({
        data: {
          stockId: stock.id,
          quantity,
          reason,
          // user object may be string or any; cast to any to access id
          createdById: ((request.user as any)?.id || (request.user as any)?.sub || ""),
        },
      });

      const updated = await tx.stock.update({
        where: { id: stock.id },
        data: { quantity: newQty },
      });

      return { adjustment: adj, stock: updated };
    });

    return sendSuccess(reply, result, "Stock adjusted");
  } catch (error: any) {
    console.error("adjustStock error", error, { body: request.body });
    return sendError(reply, "Failed to adjust stock", 500);
  }
};
