import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../../lib/prisma";
import { sendSuccess, sendError } from "../../../lib/response";

interface ListQuery {
  page?: string;
  limit?: string;
  status?: string;
  type?: string;
  search?: string;
  from?: string;
  to?: string;
}

export const getSalesTransactions: RouteHandlerMethod = async (
  request,
  reply
) => {
  try {
    const {
      page = "1",
      limit = "50",
      status,
      type,
      search,
      from,
      to,
    } = request.query as ListQuery;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { transactionNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ];
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      prisma.salesTransaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.salesTransaction.count({ where }),
    ]);

    const mapped = items.map((t) => ({
      ...t,
      subtotal: Number(t.subtotal),
      orderDiscount: Number(t.orderDiscount),
      discountTotal: Number(t.discountTotal),
      serviceFee: Number(t.serviceFee),
      deliveryFee: Number(t.deliveryFee),
      taxTotal: Number(t.taxTotal),
      grandTotal: Number(t.grandTotal),
      paidTotal: Number(t.paidTotal),
      changeDue: Number(t.changeDue),
      dueAmount: Number(t.dueAmount),
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
    console.error("List sales transactions error:", err, {
      user: request.user,
    });
    return sendError(reply, "Failed to fetch sales transactions", 500);
  }
};
