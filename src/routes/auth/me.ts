import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendUnauthorized, sendError } from "../../lib/response";
import {
  getPermissionsForRole,
  getUserPermissionMappings,
  getEffectivePermissionsForUser,
} from "../../lib/authorization";
import { requireAuthCookie } from "../../lib/authentication";

export async function meRoute(server: FastifyInstance) {
  server.get(
    "/me",
    {
      onRequest: requireAuthCookie(server),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { sub } = request.user as any;

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

        const effectivePermissions = await (
          await import("../../services/permissions/getPermissionsById")
        ).getPermissionsByUserId(user?.id);

        // Return only minimal required user information to avoid leaking sensitive/internal fields
        const safeUser = {
          id: user?.id,
          email: user?.email,
          username: user?.username,
          firstName: user?.firstName,
          lastName: user?.lastName,
          role: user?.roleDetails
            ? {
                id: user.roleDetails.id,
                name: user.roleDetails.name,
              }
            : null,
          permissions: effectivePermissions,
        };

        return sendSuccess(reply, safeUser, "Current user retrieved");
      } catch (error) {
        console.error("Me error:", error, {
          userId: (request.user as any)?.sub,
        });
        return sendError(reply, "Internal server error", 500);
      }
    }
  );
}
