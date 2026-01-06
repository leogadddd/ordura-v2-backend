import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendNotFound, sendError } from "../../lib/response";

interface GetProductParams {
  id: string;
}

export const getProduct: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as GetProductParams;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return sendNotFound(reply, "Product not found");
    }

    return sendSuccess(reply, product, "Product retrieved successfully");
  } catch (error: any) {
    request.log.error(error);
    return sendError(reply, "Failed to fetch product", 500);
  }
};
