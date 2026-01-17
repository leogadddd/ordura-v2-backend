import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendUnauthorized, sendError } from "../../lib/response";
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
        const refreshToken = request.cookies.refreshToken;

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

        // Compute fresh permissions and include them in the access token
        const permissions = await getEffectivePermissionsForUser(
          session.user.id,
          session.user.roleId
        );
        const rolePermissions = session.user.roleId
          ? await getPermissionsForRole(session.user.roleId)
          : [];
        const { allowed, denied } = await getUserPermissionMappings(
          session.user.id
        );
        const userPermissions = [
          ...allowed.map((n) => ({ name: n, isAllowed: true })),
          ...denied.map((n) => ({ name: n, isAllowed: false })),
        ];

        // Generate new access token
        const accessToken = server.jwt.sign(
          {
            sub: session.user.id,
            email: session.user.email,
            username: session.user.username,
            roleId: session.user.roleId,
            permissions,
            rolePermissions,
            userPermissions,
          },
          { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
        );

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
