import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess } from "../../lib/response";

export async function logoutRoute(server: FastifyInstance) {
  server.post(
    "/logout",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const refreshToken = request.cookies.refreshToken;

      if (refreshToken) {
        try {
          await prisma.session.delete({
            where: { refreshToken },
          });
        } catch {
          // Ignore errors if session doesn't exist
        }
      }

      // Clear cookies
      reply.clearCookie("accessToken", { path: "/" });
      reply.clearCookie("refreshToken", { path: "/" });

      return sendSuccess(reply, {}, "Logged out successfully");
    }
  );
}
