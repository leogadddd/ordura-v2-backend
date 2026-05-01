import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendNotFound, sendError } from "../../lib/response";
import { productIngredientInclude } from "./ingredients";

interface GetProductParams {
  id: string;
}

export const getProduct: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as GetProductParams;

    const product = await prisma.product.findUnique({
      where: { id },
      include: productIngredientInclude(),
    });

    if (!product) {
      return sendNotFound(reply, "Product not found");
    }

    return sendSuccess(reply, product, "Product retrieved successfully");
  } catch (error: any) {
    console.error("Get product error:", error, {
      id: (request.params as any)?.id,
      user: request.user,
    });
    return sendError(reply, "Failed to fetch product", 500);
  }
};
