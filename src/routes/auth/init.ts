import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess } from "../../lib/response";

export async function initRoute(server: FastifyInstance) {
  server.get("/init", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const adminRole = await prisma.role.findFirst({
        where: {
          name: "Administrator",
          isActive: true,
        },
      });

      if (!adminRole) {
        return sendSuccess(
          reply,
          { hasAdmin: false },
          "No admin role found. Please create an admin role first."
        );
      }

      // Check if there's any admin user
      const adminUser = await prisma.commonUser.findFirst({
        where: {
          roleId: adminRole.id,
          isActive: true,
        },
      });

      if (adminUser) {
        return sendSuccess(reply, { hasAdmin: true }, "Admin user found");
      } else {
        return sendSuccess(reply, { hasAdmin: false }, "No admin user found");
      }
    } catch (error) {
      console.error("Error checking for admin user:", error);
      return sendSuccess(reply, { hasAdmin: false }, "No admin user found");
    }
  });
}
