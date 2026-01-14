import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendUnauthorized, sendError } from "../../lib/response";
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
                permissions: true,
              },
            },
          },
        });

        return sendSuccess(reply, user, "Current user retrieved");
      } catch (error) {
        console.error("Me error:", error, {
          userId: (request.user as any)?.sub,
        });
        return sendError(reply, "Internal server error", 500);
      }
    }
  );
}
