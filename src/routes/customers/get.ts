import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError, sendNotFound } from "../../lib/response";

interface GetParams {
  id: string;
}

export const getCustomer: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as GetParams;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        emergencyContacts: { orderBy: { createdAt: "desc" } },
        foodAllergies: { orderBy: { createdAt: "desc" } },
        tags: { orderBy: { createdAt: "desc" } },
        metrics: true,
        events: {
          orderBy: { occurredAt: "desc" },
          take: 100,
          include: {
            createdBy: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                createdAt: true,
              },
            },
            salesTransaction: {
              select: {
                id: true,
                transactionNumber: true,
                status: true,
                createdAt: true,
                grandTotal: true,
              },
            },
            payment: {
              select: {
                id: true,
                method: true,
                status: true,
                amount: true,
                receivedAt: true,
              },
            },
          },
        },
      },
    });

    if (!customer) return sendNotFound(reply, "Customer not found");

    const [ordersAgg, salesAgg, recentSales] = await Promise.all([
      prisma.order.aggregate({
        where: { customerId: id },
        _count: { _all: true },
        _sum: { grandTotal: true },
        _avg: { grandTotal: true },
        _max: { createdAt: true },
        _min: { createdAt: true },
      }),
      prisma.salesTransaction.aggregate({
        where: { customerId: id },
        _count: { _all: true },
        _sum: { grandTotal: true },
        _avg: { grandTotal: true },
        _max: { createdAt: true },
        _min: { createdAt: true },
      }),
      prisma.salesTransaction.findMany({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          transactionNumber: true,
          status: true,
          createdAt: true,
          grandTotal: true,
          paidTotal: true,
          dueAmount: true,
        },
      }),
    ]);

    const analytics = {
      orders: {
        count: ordersAgg._count._all,
        lifetimeSpend: Number(ordersAgg._sum.grandTotal ?? 0),
        avgOrderValue: Number(ordersAgg._avg.grandTotal ?? 0),
        firstAt: ordersAgg._min.createdAt,
        lastAt: ordersAgg._max.createdAt,
      },
      salesTransactions: {
        count: salesAgg._count._all,
        lifetimeSpend: Number(salesAgg._sum.grandTotal ?? 0),
        avgOrderValue: Number(salesAgg._avg.grandTotal ?? 0),
        firstAt: salesAgg._min.createdAt,
        lastAt: salesAgg._max.createdAt,
      },
    };

    return sendSuccess(reply, {
      customer: {
        ...customer,
        metrics: customer.metrics
          ? {
              ...customer.metrics,
              lifetimeSpend: Number(customer.metrics.lifetimeSpend),
              avgOrderValue: Number(customer.metrics.avgOrderValue),
            }
          : null,
        events: (customer.events || []).map((e) => ({
          ...e,
          payment: e.payment
            ? { ...e.payment, amount: Number((e.payment as any).amount) }
            : null,
          salesTransaction: e.salesTransaction
            ? {
                ...e.salesTransaction,
                grandTotal: Number((e.salesTransaction as any).grandTotal),
              }
            : null,
        })),
      },
      analytics,
      recentSalesTransactions: recentSales.map((t) => ({
        ...t,
        grandTotal: Number(t.grandTotal),
        paidTotal: Number(t.paidTotal),
        dueAmount: Number(t.dueAmount),
      })),
    });
  } catch (err) {
    console.error("Get customer error:", err, { user: request.user });
    return sendError(reply, "Failed to fetch customer", 500);
  }
};
