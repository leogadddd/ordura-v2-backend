import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError, sendNotFound } from "../../lib/response";

interface Params {
  id: string;
}

export const deactivateCustomer: RouteHandlerMethod = async (
  request,
  reply,
) => {
  try {
    const { id } = request.params as Params;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return sendNotFound(reply, "Customer not found");

    const updated = await prisma.customer.update({
      where: { id },
      data: { isActive: false },
      include: { metrics: true },
    });

    return sendSuccess(
      reply,
      {
        customer: {
          ...updated,
          metrics: updated.metrics
            ? {
                ...updated.metrics,
                lifetimeSpend: Number(updated.metrics.lifetimeSpend),
                avgOrderValue: Number(updated.metrics.avgOrderValue),
              }
            : null,
        },
      },
      "Customer deactivated",
    );
  } catch (err) {
    console.error("Deactivate customer error:", err, { user: request.user });
    return sendError(reply, "Failed to deactivate customer", 500);
  }
};
