import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/auth";
import {
  sendSuccess,
  sendNotFound,
  sendValidationError,
  sendError,
} from "../../lib/response";

interface ChangePasswordParams {
  id: string;
}

interface ChangePasswordBody {
  newPassword: string;
}

export const changePassword: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as ChangePasswordParams;
    const { newPassword } = request.body as ChangePasswordBody;

    if (!newPassword || newPassword.length < 6) {
      return sendValidationError(reply, {
        newPassword: ["Password must be at least 6 characters"],
      });
    }

    const existing = await prisma.commonUser.findUnique({ where: { id } });
    if (!existing) return sendNotFound(reply, "User not found");

    const hashed = await hashPassword(newPassword);
    await prisma.commonUser.update({
      where: { id },
      data: { password: hashed },
    });

    return sendSuccess(reply, {}, "Password changed successfully");
  } catch (error: any) {
    console.error("Change password error:", error, {
      params: request.params,
      user: request.user,
    });
    return sendError(reply, "Failed to change password", 500);
  }
};
