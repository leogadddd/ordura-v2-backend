import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";
import { requireAuthCookie } from "../../lib/authentication";

const parseDecimal = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as any).toNumber();
  }
  return 0;
};

export async function accountInfoRoute(server: FastifyInstance) {
  server.get(
    "/account-info",
    {
      onRequest: requireAuthCookie(server),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { sub } = request.user as any;

        // Fetch user details (safe/select only)
        const user = await prisma.commonUser.findUnique({
          where: { id: sub },
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            lastLogin: true,
            roleDetails: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!user) {
          return sendError(reply, "User not found", 404);
        }

        // Fetch user's sales transactions for analytics
        const orders = await prisma.salesTransaction.findMany({
          where: { employeeId: sub },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            grandTotal: true,
            createdAt: true,
            items: {
              select: {
                quantity: true,
              },
            },
          },
        });

        // Calculate statistics
        const totalOrders = orders.length;
        const completedOrders = orders.filter(
          (o) => o.status === "COMPLETED",
        ).length;

        // Calculate total revenue (sum of grandTotal for completed orders)
        const totalRevenue = orders
          .filter((o) => o.status === "COMPLETED")
          .reduce((sum, order) => {
            const amount = parseDecimal(order.grandTotal);
            return sum + amount;
          }, 0);

        // Calculate average order value
        const averageOrderValue =
          completedOrders > 0 ? totalRevenue / completedOrders : 0;

        // Calculate total products sold
        const totalProductsSold = orders.reduce((sum, order) => {
          return (
            sum +
            order.items.reduce((itemSum, item) => {
              const qty = parseDecimal(item.quantity);
              return itemSum + qty;
            }, 0)
          );
        }, 0);

        const stats = {
          totalOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          completedOrders,
          totalProductsSold: Math.round(totalProductsSold),
          accountCreatedDate: user.createdAt.toISOString(),
          lastLoginDate: user.lastLogin?.toISOString(),
        };

        const recentSales = orders.slice(0, 5).map((o) => {
          const itemsQuantity = o.items.reduce((sum, item) => {
            const qty = parseDecimal(item.quantity);
            return sum + qty;
          }, 0);

          return {
            id: o.id,
            status: o.status,
            createdAt: o.createdAt.toISOString(),
            grandTotal: Math.round(parseDecimal(o.grandTotal) * 100) / 100,
            itemsQuantity: Math.round(itemsQuantity),
          };
        });

        const response = {
          profile: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            lastLogin: user.lastLogin?.toISOString(),
            role: user.roleDetails
              ? { id: user.roleDetails.id, name: user.roleDetails.name }
              : null,
          },
          stats,
          recentSales,
        };

        return sendSuccess(reply, response, "Account information retrieved");
      } catch (error) {
        console.error("Account info error:", error, {
          userId: (request.user as any)?.sub,
        });
        return sendError(reply, "Internal server error", 500);
      }
    },
  );
}
