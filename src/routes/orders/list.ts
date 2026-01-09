import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";

interface ListOrdersQuery {
  page?: string;
  limit?: string;
  status?: string;
  type?: string;
  search?: string;
  from?: string;
  to?: string;
}

export const getOrders: RouteHandlerMethod = async (request, reply) => {
  try {
    const {
      page = "1",
      limit = "50",
      status,
      type,
      search,
      from,
      to,
    } = request.query as ListOrdersQuery;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        where.createdAt.lte = new Date(to);
      }
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    // Convert Decimal fields to numbers
    const ordersWithNumbers = orders.map((order) => ({
      ...order,
      subtotal: Number(order.subtotal),
      orderDiscount: Number(order.orderDiscount),
      discountTotal: Number(order.discountTotal),
      serviceFee: Number(order.serviceFee),
      deliveryFee: Number(order.deliveryFee),
      taxTotal: Number(order.taxTotal),
      grandTotal: Number(order.grandTotal),
      paidTotal: Number(order.paidTotal),
      changeDue: Number(order.changeDue),
      dueAmount: Number(order.dueAmount),
    }));

    return sendSuccess(
      reply,
      {
        items: ordersWithNumbers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      "Orders retrieved successfully"
    );
  } catch (error: any) {
    console.error("List orders error:", error, {
      query: request.query,
      user: request.user,
    });
    return sendError(reply, "Failed to fetch orders", 500);
  }
};
