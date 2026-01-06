import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { comparePassword } from "../../lib/auth";
import { sendSuccess, sendUnauthorized } from "../../lib/response";

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

      // Find user
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username: email }],
          isActive: true,
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

      // Generate tokens
      const accessToken = server.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
      );

      const refreshToken = server.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
      );

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
      await prisma.user.update({
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
            role: user.role,
          },
        },
        "Login successful"
      );
    }
  );
}
