import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendNotFound, sendError } from "../../lib/response";

interface DeleteUserParams {
  id: string;
}

export const deleteUser: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as DeleteUserParams;

    const existing = await prisma.commonUser.findUnique({ where: { id } });
    if (!existing) return sendNotFound(reply, "User not found");

    // Soft-delete: deactivate account to preserve history
    await prisma.commonUser.update({
      where: { id },
      data: { isActive: false },
    });

    return sendSuccess(reply, {}, "User deactivated successfully");
  } catch (error: any) {
    console.error("Delete user error:", error, {
      params: request.params,
      user: request.user,
    });
    return sendError(reply, "Failed to delete user", 500);
  }
};
