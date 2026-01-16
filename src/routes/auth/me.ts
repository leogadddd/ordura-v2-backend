import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendUnauthorized, sendError } from "../../lib/response";
import { getPermissionsForRole } from "../../lib/authorization";
import { authenticateWithCookie } from "../../lib/auth";

export async function meRoute(server: FastifyInstance) {
  server.get(
    "/me",
    {
      onRequest: authenticateWithCookie(server),
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

        const permissions = user?.roleId
          ? await getPermissionsForRole(user.roleId)
          : [];

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
                permissions,
              }
            : null,
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
