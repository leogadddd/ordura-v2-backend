import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";

export const getRoles: RouteHandlerMethod = async (request, reply) => {
  try {
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        // include mapped permissions (via RolePermission -> Permission.name)
        rolePermissions: {
          include: { permission: { select: { name: true } } },
        },
      },
    });

    // Map rolePermissions to a simple `permissions: string[]` field expected by frontend
    const mapped = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isActive: r.isActive,
      isProtected: r.isProtected,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      permissions: (r.rolePermissions || []).map(
        (rp: any) => rp.permission.name,
      ),
    }));

    // Return a standard list response with `items` (keeps consistency with other list endpoints)
    return sendSuccess(
      reply,
      { items: mapped },
      "Roles retrieved successfully",
    );
  } catch (error) {
    console.error("Error fetching roles:", error);
    return sendError(reply, "Failed to fetch roles");
  }
};
