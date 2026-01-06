import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import {
  sendSuccess,
  sendNotFound,
  sendValidationError,
  sendError,
} from "../../lib/response";

interface UpdateProductBody {
  name?: string;
  category?: string;
  description?: string;
  notes?: string;
  cost?: number;
  sellingPrice?: number;
  status?: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
  isDraft?: boolean;
}

interface UpdateProductParams {
  id: string;
}

export const updateProduct: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as UpdateProductParams;
    const updateData = request.body as UpdateProductBody;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return sendNotFound(reply, "Product not found");
    }

    // Validate prices if provided
    if (
      (updateData.cost !== undefined && updateData.cost < 0) ||
      (updateData.sellingPrice !== undefined && updateData.sellingPrice < 0)
    ) {
      return sendValidationError(reply, {
        price: ["Cost and selling price must be positive numbers"],
      });
    }

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return sendSuccess(reply, product, "Product updated successfully");
  } catch (error: any) {
    request.log.error(error);
    return sendError(reply, "Failed to update product", 500);
  }
};
