import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { getAllPermissions } from "../../lib/permissions";
import { sendSuccess, sendError } from "../../lib/response";
import { invalidateRolePermissions } from "../../lib/authorization";
import { sanitizeInput } from "../../util/sanitize";

interface UpdateRoleBody {
  name?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

export const updateRole: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const { name, description, permissions, isActive } =
      sanitizeInput<UpdateRoleBody>(request.body, {
        allowedFields: ["name", "description", "permissions", "isActive"],
        trimStrings: true,
        removeEmpty: true,
        parseBooleans: ["isActive"],
      });

    // Validate provided permissions
    if (permissions && permissions.length > 0) {
      const allowed = new Set(getAllPermissions());
      const invalid = permissions.filter((p) => !allowed.has(p));
      if (invalid.length > 0) {
        return sendError(
          reply,
          `Invalid permissions provided: ${invalid.join(", ")}`,
          400
        );
      }
    }

    // Check if role exists
    const existingRole = await prisma.role.findUnique({ where: { id } });
    if (!existingRole) {
      return sendError(reply, "Role not found", 404);
    }

    // Disallow disabling a protected role
    if (
      isActive === false &&
      (existingRole.isProtected || existingRole.name === "Administrator")
    ) {
      return sendError(reply, "Cannot deactivate protected role", 403);
    }

    // Check if new name conflicts with existing role
    if (name && name !== existingRole.name) {
      const nameConflict = await prisma.role.findUnique({ where: { name } });
      if (nameConflict) {
        return sendError(reply, "Role name already exists", 400);
      }
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Sync normalized permissions if provided
    if (permissions !== undefined) {
      const desired = (permissions ?? [])
        .map((p) => String(p).trim())
        .filter(Boolean);

      // Upsert permissions and collect ids
      const permissionIds: string[] = [];
      for (const pname of desired) {
        const permission = await prisma.permission.upsert({
          where: { name: pname },
          update: {},
          create: { name: pname },
        });
        permissionIds.push(permission.id);
      }

      // Existing mappings
      const existingMappings = await prisma.rolePermission.findMany({
        where: { roleId: id },
      });
      const existingIds = existingMappings.map((m) => m.permissionId);

      // Delete removed
      for (const existingId of existingIds) {
        if (!permissionIds.includes(existingId)) {
          await prisma.rolePermission.deleteMany({
            where: { roleId: id, permissionId: existingId },
          });
        }
      }

      // Add new
      for (const pid of permissionIds) {
        if (!existingIds.includes(pid)) {
          await prisma.rolePermission.create({
            data: { roleId: id, permissionId: pid },
          });
        }
      }
      invalidateRolePermissions(id);
    }

    // Reload role with permissions to return consistent shape
    const updated = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: { select: { name: true } } },
        },
      },
    });

    const mapped = {
      id: updated!.id,
      name: updated!.name,
      description: updated!.description,
      isActive: updated!.isActive,
      isProtected: updated!.isProtected,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
      permissions: (updated!.rolePermissions || []).map(
        (rp: any) => rp.permission.name
      ),
    };

    return sendSuccess(reply, mapped, "Role updated successfully");
  } catch (error) {
    console.error("Error updating role:", error);
    return sendError(reply, "Failed to update role");
  }
};
