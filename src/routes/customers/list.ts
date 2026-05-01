import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";

interface ListQuery {
  page?: string;
  limit?: string;
  isActive?: string;
  search?: string;
}

export const listCustomers: RouteHandlerMethod = async (request, reply) => {
  try {
    const {
      page = "1",
      limit = "50",
      isActive,
      search,
    } = request.query as ListQuery;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (typeof isActive === "string" && isActive.length > 0) {
      where.isActive = isActive === "true" || isActive === "1";
    }
    if (search) {
      where.OR = [
        { customerNumber: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          metrics: true,
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const mapped = items.map((c) => ({
      ...c,
      metrics: c.metrics
        ? {
            ...c.metrics,
            lifetimeSpend: Number(c.metrics.lifetimeSpend),
            avgOrderValue: Number(c.metrics.avgOrderValue),
          }
        : null,
    }));

    return sendSuccess(reply, {
      items: mapped,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("List customers error:", err, { user: request.user });
    return sendError(reply, "Failed to fetch customers", 500);
  }
};
