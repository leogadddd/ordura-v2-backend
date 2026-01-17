import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";

export const getRole: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: { select: { name: true } } },
        },
      },
    });

    if (!role) {
      return sendError(reply, "Role not found", 404);
    }

    // Prevent modifying/deleting a protected role
    if (role.isProtected || role.name === "Administrator") {
      return sendError(reply, "Cannot delete protected role", 403);
    }

    const mapped = {
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      isProtected: role.isProtected,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: (role.rolePermissions || []).map(
        (rp: any) => rp.permission.name
      ),
    };

    return sendSuccess(reply, mapped, "Role retrieved successfully");
  } catch (error) {
    console.error("Error fetching role:", error);
    return sendError(reply, "Failed to fetch role");
  }
};
