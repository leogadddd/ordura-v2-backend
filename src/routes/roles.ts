import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma";
import { getAllPermissions } from "../lib/permissions";
import { sendSuccess, sendError } from "../lib/response";
import { authenticate } from "../lib/auth";
import {
  requirePermission,
  invalidateRolePermissions,
} from "../lib/authorization";

interface CreateRoleBody {
  name: string;
  description?: string;
  permissions?: string[];
}

interface UpdateRoleBody {
  name?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

export async function rolesRoutes(server: FastifyInstance) {
  // Get all roles
  server.get(
    "/roles",
    { onRequest: authenticate, preHandler: requirePermission("ROLES:view") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const roles = await prisma.role.findMany({
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        });
        return sendSuccess(reply, roles, "Roles retrieved successfully");
      } catch (error) {
        console.error("Error fetching roles:", error);
        return sendError(reply, "Failed to fetch roles");
      }
    }
  );

  // Get role by ID
  server.get(
    "/roles/:id",
    { onRequest: authenticate, preHandler: requirePermission("ROLES:view") },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const role = await prisma.role.findUnique({
          where: { id },
        });

        if (!role) {
          return sendError(reply, "Role not found", 404);
        }

        return sendSuccess(reply, role, "Role retrieved successfully");
      } catch (error) {
        console.error("Error fetching role:", error);
        return sendError(reply, "Failed to fetch role");
      }
    }
  );

  // Create new role
  server.post(
    "/roles",
    { onRequest: authenticate, preHandler: requirePermission("ROLES:create") },
    async (
      request: FastifyRequest<{ Body: CreateRoleBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { name, description, permissions } = request.body;

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
        const existingRole = await prisma.role.findUnique({
          where: { name },
        });

        if (existingRole) {
          return sendError(reply, "Role name already exists", 400);
        }

        const role = await prisma.role.create({
          data: {
            name,
            description,
          },
        });

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

        return sendSuccess(reply, role, "Role created successfully", 201);
      } catch (error) {
        console.error("Error creating role:", error);
        return sendError(reply, "Failed to create role");
      }
    }
  );

  // Update role
  server.put(
    "/roles/:id",
    { onRequest: authenticate, preHandler: requirePermission("ROLES:edit") },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateRoleBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { name, description, permissions, isActive } = request.body;

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
        const existingRole = await prisma.role.findUnique({
          where: { id },
        });

        if (!existingRole) {
          return sendError(reply, "Role not found", 404);
        }

        // Check if new name conflicts with existing role
        if (name && name !== existingRole.name) {
          const nameConflict = await prisma.role.findUnique({
            where: { name },
          });
          if (nameConflict) {
            return sendError(reply, "Role name already exists", 400);
          }
        }

        const updatedRole = await prisma.role.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(permissions !== undefined && { permissions }),
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

        return sendSuccess(reply, updatedRole, "Role updated successfully");
      } catch (error) {
        console.error("Error updating role:", error);
        return sendError(reply, "Failed to update role");
      }
    }
  );

  // Delete role (soft delete by setting isActive to false)
  server.delete(
    "/roles/:id",
    { onRequest: authenticate, preHandler: requirePermission("ROLES:delete") },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;

        // Check if role exists
        const role = await prisma.role.findUnique({
          where: { id },
        });

        if (!role) {
          return sendError(reply, "Role not found", 404);
        }

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
        await prisma.role.update({
          where: { id },
          data: { isActive: false },
        });
        invalidateRolePermissions(id);

        return sendSuccess(reply, null, "Role deleted successfully");
      } catch (error) {
        console.error("Error deleting role:", error);
        return sendError(reply, "Failed to delete role");
      }
    }
  );
}
