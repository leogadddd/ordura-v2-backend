import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/auth";
import { sendSuccess, sendConflict } from "../../lib/response";

interface RegisterBody {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export async function registerRoute(server: FastifyInstance) {
  server.post<{
    Body: RegisterBody;
  }>(
    "/register",
    async (
      request: FastifyRequest<{ Body: RegisterBody }>,
      reply: FastifyReply
    ) => {
      const { email, username, password, firstName, lastName } = request.body;

      // Check if user exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        return sendConflict(reply, "Email or username already exists");
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          firstName,
          lastName,
        },
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
        "User registered successfully",
        201
      );
    }
  );
}
