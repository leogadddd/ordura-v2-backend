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
        },
        orderBy: { name: "asc" },
      });

      // Attach normalized permissions for each role
      const rolesWithPerms = [] as any[];
      for (const role of roles) {
        const perms = await (
          await import("../../lib/authorization")
        ).getPermissionsForRole(role.id);
        rolesWithPerms.push({ ...role, permissions: perms });
      }

      return sendSuccess(reply, rolesWithPerms, "Roles retrieved successfully");
    } catch (error) {
      console.error("Error fetching roles:", error);
      return sendError(reply, "Failed to fetch roles");
    }
  });
}
