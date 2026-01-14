import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";

export async function rolesRoute(server: FastifyInstance) {
  server.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const roles = await prisma.role.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          permissions: true,
        },
        orderBy: { name: "asc" },
      });

      return sendSuccess(reply, roles, "Roles retrieved successfully");
    } catch (error) {
      console.error("Error fetching roles:", error);
      return sendError(reply, "Failed to fetch roles");
    }
  });
}
