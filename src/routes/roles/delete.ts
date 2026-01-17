import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";
import { invalidateRolePermissions } from "../../lib/authorization";

export const deleteRole: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    // Check if role exists
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return sendError(reply, "Role not found", 404);

    // Check if role is being used by any users
    const usersWithRole = await prisma.commonUser.count({
      where: { roleId: id },
    });
    if (usersWithRole > 0) {
      return sendError(
        reply,
        "Cannot delete role that is assigned to users",
        400
      );
    }

    // Soft delete
    await prisma.role.update({ where: { id }, data: { isActive: false } });
    invalidateRolePermissions(id);

    return sendSuccess(reply, null, "Role deleted successfully");
  } catch (error) {
    console.error("Error deleting role:", error);
    return sendError(reply, "Failed to delete role");
  }
};
