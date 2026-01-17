import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/auth";
import { sendSuccess, sendConflict, sendError } from "../../lib/response";

interface RegisterBody {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
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
      const { email, username, password, firstName, lastName, roleId } =
        request.body;

      try {
        // Check if user exists
        const existingUser = await prisma.commonUser.findFirst({
          where: {
            OR: [{ email }, { username }],
          },
        });

        if (existingUser) {
          return sendConflict(reply, "Email or username already exists");
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const user = await prisma.commonUser.create({
          data: {
            email,
            username,
            password: hashedPassword,
            firstName,
            lastName,
            roleId,
          },
          include: {
            roleDetails: true,
          },
        });

        // Compute permissions and generate tokens (include permissions in access token)
        const rolePermissions = user.roleId
          ? await (
              await import("../../lib/authorization")
            ).getPermissionsForRole(user.roleId)
          : [];
        const { allowed, denied } = await (
          await import("../../lib/authorization")
        ).getUserPermissionMappings(user.id);
        const userPermissions = [
          ...allowed.map((n: string) => ({ name: n, isAllowed: true })),
          ...denied.map((n: string) => ({ name: n, isAllowed: false })),
        ];
        const permissions = await (
          await import("../../lib/authorization")
        ).getEffectivePermissionsForUser(user.id, user.roleId);

        const accessToken = server.jwt.sign(
          {
            sub: user.id,
            email: user.email,
            username: user.username,
            roleId: user.roleId,
            permissions,
            rolePermissions,
            userPermissions,
          },
          { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
        );

        const refreshToken = server.jwt.sign(
          {
            sub: user.id,
            email: user.email,
            username: user.username,
            roleId: user.roleId,
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
              roleId: user.roleId,
              roleDetails: user.roleDetails,
            },
          },
          "User registered successfully",
          201
        );
      } catch (error) {
        console.error("Register error:", error, {
          email,
          username,
          firstName,
          lastName,
        });
        return sendError(reply, "Internal server error", 500);
      }
    }
  );
}
