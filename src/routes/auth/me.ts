import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendUnauthorized } from "../../lib/response";

export async function meRoute(server: FastifyInstance) {
  server.get(
    "/me",
    {
      onRequest: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const token = request.cookies.accessToken;
          if (!token) {
            return sendUnauthorized(reply, "Unauthorized");
          }
          // Verify token manually since it's in cookie
          const decoded = server.jwt.verify(token);
          request.user = decoded;
        } catch (err) {
          return sendUnauthorized(reply, "Unauthorized");
        }
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sub } = request.user as any;

      const user = await prisma.user.findUnique({
        where: { id: sub },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });

      return sendSuccess(reply, user, "Current user retrieved");
    }
  );
}
