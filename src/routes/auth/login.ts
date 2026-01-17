import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { comparePassword } from "../../lib/auth";
import { generateAuthTokens } from "../../lib/tokens";
import { sendSuccess, sendUnauthorized, sendError } from "../../lib/response";

interface LoginBody {
  email: string;
  password: string;
}

export async function loginRoute(server: FastifyInstance) {
  server.post<{
    Body: LoginBody;
  }>(
    "/login",
    async (
      request: FastifyRequest<{ Body: LoginBody }>,
      reply: FastifyReply
    ) => {
      const { email, password } = request.body;

      let user: any;
      try {
        // Find user
        user = await prisma.commonUser.findFirst({
          where: {
            OR: [{ email }, { username: email }],
            isActive: true,
          },
          include: {
            roleDetails: true,
          },
        });

        if (!user) {
          return sendUnauthorized(reply, "Invalid credentials");
        }

        // Verify password
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
          return sendUnauthorized(reply, "Invalid credentials");
        }

        const { accessToken, refreshToken, permissions } =
          await generateAuthTokens(server, user);

        // Store refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await prisma.session.create({
          data: {
            userId: user.id,
            refreshToken,
            expiresAt,
          },
        });

        // Update last login
        await prisma.commonUser.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        // Set tokens in httpOnly cookies
        reply.setCookie("accessToken", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 15 * 60 * 1000, // 15 minutes
        });

        reply.setCookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return sendSuccess(
          reply,
          {
            user: {
              id: user.id,
              email: user.email,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              roleId: user.roleId,
              roleDetails: user.roleDetails,
              permissions,
            },
          },
          "Login successful"
        );
      } catch (error) {
        console.error("Login error:", error, {
          email,
          password,
          userId: user?.id,
        });
        return sendError(reply, "Internal server error", 500);
      }
    }
  );
}
