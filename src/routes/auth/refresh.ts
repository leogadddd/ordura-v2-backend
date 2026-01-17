import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendUnauthorized, sendError } from "../../lib/response";
import { generateAuthTokens } from "../../lib/tokens";
import { sanitizeInput } from "../../util/sanitize";
import {
  getEffectivePermissionsForUser,
  getPermissionsForRole,
  getUserPermissionMappings,
} from "../../lib/authorization";

export async function refreshRoute(server: FastifyInstance) {
  server.post(
    "/refresh",
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

        if (!refreshToken) {
          return sendUnauthorized(reply, "No refresh token provided");
        }

        // Verify refresh token
        let payload: any;
        try {
          payload = server.jwt.verify(refreshToken);
        } catch {
          return sendUnauthorized(reply, "Invalid refresh token");
        }

        // Check if token exists in database
        const session = await prisma.session.findUnique({
          where: { refreshToken },
          include: { user: true },
        });

        if (!session || session.expiresAt < new Date()) {
          return sendUnauthorized(reply, "Refresh token expired or invalid");
        }

        const { accessToken } = await generateAuthTokens(server, session.user);

        // Set new access token in httpOnly cookie
        reply.setCookie("accessToken", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 15 * 60 * 1000, // 15 minutes
        });

        return sendSuccess(reply, {}, "Token refreshed");
      } catch (error) {
        console.error("Refresh error:", error, {
          refreshToken: request.cookies.refreshToken,
        });
        return sendError(reply, "Internal server error", 500);
      }
    }
  );
}
