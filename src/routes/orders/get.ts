import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendNotFound, sendError } from "../../lib/response";

interface GetOrderParams {
  id: string;
}

export const getOrder: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as GetOrderParams;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
          include: {
            roleDetails: {
              select: {
                id: true,
                name: true,
                permissions: true,
              },
            },
          },
        },
        items: {
          orderBy: { lineNo: "asc" },
        },
        payments: {
          orderBy: { receivedAt: "desc" },
        },
      },
    });

    if (!order) {
      return sendNotFound(reply, "Order not found");
    }

    // Convert Decimal fields to numbers
    const orderWithNumbers = {
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
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        unitCost: item.unitCost ? Number(item.unitCost) : null,
        quantity: Number(item.quantity),
        discount: Number(item.discount),
        taxRate: item.taxRate ? Number(item.taxRate) : null,
        taxAmount: Number(item.taxAmount),
        lineTotal: Number(item.lineTotal),
      })),
      payments: order.payments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
      })),
    };

    return sendSuccess(reply, orderWithNumbers, "Order retrieved successfully");
  } catch (error: any) {
    console.error("Get order error:", error, {
      id: (request.params as any)?.id,
      user: request.user,
    });
    return sendError(reply, "Failed to fetch order", 500);
  }
};
