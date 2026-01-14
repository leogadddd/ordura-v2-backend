import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma";
import { sendSuccess, sendError } from "../lib/response";

interface CreateRoleBody {
  name: string;
  description?: string;
  permissions?: any;
}

interface UpdateRoleBody {
  name?: string;
  description?: string;
  permissions?: any;
  isActive?: boolean;
}

export async function rolesRoutes(server: FastifyInstance) {
  // Get all roles
  server.get("/roles", async (request: FastifyRequest, reply: FastifyReply) => {
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
  });

  // Get role by ID
  server.get(
    "/roles/:id",
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
    async (
      request: FastifyRequest<{ Body: CreateRoleBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { name, description, permissions } = request.body;

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
            permissions,
          },
        });

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
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateRoleBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { name, description, permissions, isActive } = request.body;

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

        return sendSuccess(reply, null, "Role deleted successfully");
      } catch (error) {
        console.error("Error deleting role:", error);
        return sendError(reply, "Failed to delete role");
      }
    }
  );
}
