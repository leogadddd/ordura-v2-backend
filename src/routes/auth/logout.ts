import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";
import { sanitizeInput } from "../../util/sanitize";

export async function logoutRoute(server: FastifyInstance) {
  server.post(
    "/logout",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { refreshToken } = sanitizeInput<{ refreshToken?: string }>(
          request.cookies,
          {
            allowedFields: ["refreshToken"],
            trimStrings: true,
            removeEmpty: true,
          }
        );

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
      } catch (error) {
        console.error("Logout error:", error, {
          refreshToken: request.cookies.refreshToken,
        });
        return sendError(reply, "Internal server error", 500);
      }
    }
  );
}
