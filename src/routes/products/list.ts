import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";

interface ListProductsQuery {
  page?: string;
  limit?: string;
  category?: string;
  status?: string;
  search?: string;
  includeDrafts?: string;
}

export const getProducts: RouteHandlerMethod = async (request, reply) => {
  try {
    const {
      page = "1",
      limit = "50",
      category,
      status,
      search,
      includeDrafts = "false",
    } = request.query as ListProductsQuery;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (includeDrafts !== "true") {
      where.isDraft = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get products with pagination
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return sendSuccess(
      reply,
      {
        items: products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      "Products retrieved successfully"
    );
  } catch (error: any) {
    request.log.error(error);
    return sendError(reply, "Failed to fetch products", 500);
  }
};
