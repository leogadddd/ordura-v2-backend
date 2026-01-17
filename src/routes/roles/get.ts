import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";

export const getRole: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const role = await prisma.role.findUnique({ where: { id } });

    if (!role) {
      return sendError(reply, "Role not found", 404);
    }

    // Prevent modifying/deleting a protected role
    if (role.isProtected || role.name === "Administrator") {
      return sendError(reply, "Cannot delete protected role", 403);
    }

    return sendSuccess(reply, role, "Role retrieved successfully");
  } catch (error) {
    console.error("Error fetching role:", error);
    return sendError(reply, "Failed to fetch role");
  }
};
