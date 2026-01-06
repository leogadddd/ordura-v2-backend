import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendUnauthorized } from "../../lib/response";

export async function refreshRoute(server: FastifyInstance) {
  server.post(
    "/refresh",
    async (request: FastifyRequest, reply: FastifyReply) => {
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

      // Generate new access token
      const accessToken = server.jwt.sign(
        {
          sub: session.user.id,
          email: session.user.email,
          username: session.user.username,
          role: session.user.role,
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
    }
  );
}
