import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";

export const getRoles: RouteHandlerMethod = async (request, reply) => {
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
};
