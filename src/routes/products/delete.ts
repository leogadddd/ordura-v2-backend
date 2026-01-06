import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendNotFound, sendError } from "../../lib/response";

interface DeleteProductParams {
  id: string;
}

export const deleteProduct: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as DeleteProductParams;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return sendNotFound(reply, "Product not found");
    }

    // Actual delete - permanently remove the product
    await prisma.product.delete({
      where: { id },
    });

    return sendSuccess(reply, {}, "Product deleted successfully");
  } catch (error: any) {
    request.log.error(error);
    return sendError(reply, "Failed to delete product", 500);
  }
};
