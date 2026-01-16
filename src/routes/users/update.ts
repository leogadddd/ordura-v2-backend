import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import {
  sendSuccess,
  sendNotFound,
  sendConflict,
  sendError,
} from "../../lib/response";

interface UpdateUserParams {
  id: string;
}

interface UpdateUserBody {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  isActive?: boolean;
}

export const updateUser: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as UpdateUserParams;
    const body = request.body as UpdateUserBody;

    const existing = await prisma.commonUser.findUnique({ where: { id } });
    if (!existing) return sendNotFound(reply, "User not found");

    // Disallow password updates via this endpoint. Use the change-password endpoint instead.
    if ((request.body as any).password) {
      return sendValidationError(reply, {
        password: ["Use the change password endpoint to update passwords."],
      });
    }

    // If changing email or username, ensure uniqueness
    if (body.email || body.username) {
      const conflict = await prisma.commonUser.findFirst({
        where: {
          OR: [
            body.email ? { email: body.email } : undefined,
            body.username ? { username: body.username } : undefined,
          ].filter(Boolean) as any,
          AND: { id: { not: id } },
        },
      });
      if (conflict)
        return sendConflict(reply, "Email or username already in use");
    }

    const data: any = { ...body };
    if (body.password) {
      data.password = await hashPassword(body.password);
    }

    const updated = await prisma.commonUser.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        roleId: true,
        isActive: true,
        roleDetails: { select: { id: true, name: true } },
      },
    });

    return sendSuccess(reply, { user: updated }, "User updated successfully");
  } catch (error: any) {
    console.error("Update user error:", error, {
      params: request.params,
      body: request.body,
      user: request.user,
    });
    return sendError(reply, "Failed to update user", 500);
  }
};
