import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../../lib/prisma";
import { sendSuccess, sendNotFound, sendError } from "../../../lib/response";

interface Params {
  id: string;
}

export const getSalesTransaction: RouteHandlerMethod = async (
  request,
  reply
) => {
  try {
    const { id } = request.params as Params;

    const t = await prisma.salesTransaction.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            roleDetails: { select: { id: true, name: true } },
          },
        },
        items: { orderBy: { lineNo: "asc" } },
        payments: { orderBy: { receivedAt: "desc" } },
      },
    });

    if (!t) return sendNotFound(reply, "SalesTransaction not found");

    // Convert Decimal fields
    const tx = {
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
      items: t.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        unitCost: item.unitCost ? Number(item.unitCost) : null,
        quantity: Number(item.quantity),
        discount: Number(item.discount),
        taxRate: item.taxRate ? Number(item.taxRate) : null,
        taxAmount: Number(item.taxAmount),
        lineTotal: Number(item.lineTotal),
      })),
      payments: t.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
      employee: {
        ...(t.employee ?? {}),
        roleDetails: {
          ...(t.employee?.roleDetails ?? {}),
          permissions: t.employee?.roleDetails?.id
            ? await (
                await import("../../../lib/authorization")
              ).getPermissionsForRole(t.employee!.roleDetails!.id)
            : [],
        },
      },
    };

    return sendSuccess(reply, tx, "SalesTransaction retrieved successfully");
  } catch (err) {
    console.error("Get sales transaction error:", err, {
      id: (request.params as any)?.id,
      user: request.user,
    });
    return sendError(reply, "Failed to fetch sales transaction", 500);
  }
};
