import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";
import {
  getPermissionsForRole,
  getUserPermissionMappings,
  getEffectivePermissionsForUser,
} from "../../lib/authorization";
import { authenticateWithCookie } from "../../lib/auth";

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
      onRequest: authenticateWithCookie(server),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { sub } = request.user as any;

        // Fetch user details
        const user = await prisma.commonUser.findUnique({
          where: { id: sub },
          include: {
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

        // Fetch user's orders for analytics
        const orders = await prisma.order.findMany({
          where: { employeeId: sub },
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
          (o) => o.status === "COMPLETED"
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

        const rolePermissions = user?.roleId
          ? await getPermissionsForRole(user.roleId)
          : [];
        const { allowed, denied } = await getUserPermissionMappings(user.id);
        const userPermissions = [
          ...allowed.map((n) => ({ name: n, isAllowed: true })),
          ...denied.map((n) => ({ name: n, isAllowed: false })),
        ];
        const effectivePermissions = await getEffectivePermissionsForUser(
          user.id,
          user.roleId
        );

        const response = {
          user: {
            ...user,
            roleDetails: {
              ...(user?.roleDetails ?? {}),
              permissions: rolePermissions,
            },
            userPermissions,
            permissions: effectivePermissions,
          },
          stats,
        };

        return sendSuccess(reply, response, "Account information retrieved");
      } catch (error) {
        console.error("Account info error:", error, {
          userId: (request.user as any)?.sub,
        });
        return sendError(reply, "Internal server error", 500);
      }
    }
  );
}
