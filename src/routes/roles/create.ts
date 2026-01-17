import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { getAllPermissions } from "../../lib/permissions";
import { sendSuccess, sendError } from "../../lib/response";
import { invalidateRolePermissions } from "../../lib/authorization";
import { sanitizeInput } from "../../util/sanitize";

interface CreateRoleBody {
  name: string;
  description?: string;
  permissions?: string[];
}

export const createRole: RouteHandlerMethod = async (request, reply) => {
  try {
    const { name, description, permissions } = sanitizeInput<CreateRoleBody>(
      request.body,
      {
        allowedFields: ["name", "description", "permissions"],
        trimStrings: true,
        removeEmpty: true,
      }
    );

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

    // Check if role name already exists
    const existingRole = await prisma.role.findUnique({ where: { name } });
    if (existingRole) {
      return sendError(reply, "Role name already exists", 400);
    }

    const role = await prisma.role.create({ data: { name, description } });

    // If permissions provided, ensure normalized Permission and RolePermission records exist
    if (permissions && permissions.length > 0) {
      for (const raw of permissions) {
        const nameStr = String(raw).trim();
        if (!nameStr) continue;

        const permission = await prisma.permission.upsert({
          where: { name: nameStr },
          update: {},
          create: { name: nameStr },
        });

        const existing = await prisma.rolePermission.findFirst({
          where: { roleId: role.id, permissionId: permission.id },
        });
        if (!existing) {
          await prisma.rolePermission.create({
            data: { roleId: role.id, permissionId: permission.id },
          });
        }
      }
      invalidateRolePermissions(role.id);
    }

    // Reload role with permissions to return a consistent shape
    const created = await prisma.role.findUnique({
      where: { id: role.id },
      include: {
        rolePermissions: {
          include: { permission: { select: { name: true } } },
        },
      },
    });

    const mapped = {
      id: created!.id,
      name: created!.name,
      description: created!.description,
      isActive: created!.isActive,
      isProtected: created!.isProtected,
      createdAt: created!.createdAt,
      updatedAt: created!.updatedAt,
      permissions: (created!.rolePermissions || []).map(
        (rp: any) => rp.permission.name
      ),
    };

    return sendSuccess(reply, mapped, "Role created successfully", 201);
  } catch (error) {
    console.error("Error creating role:", error);
    return sendError(reply, "Failed to create role");
  }
};
