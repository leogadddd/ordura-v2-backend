import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { seedRoles } from "../../scripts/seed-roles";
import { sendSuccess } from "../../lib/response";

export async function initRoute(server: FastifyInstance) {
  server.get("/init", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let adminRole = await prisma.role.findFirst({
        where: {
          name: "Administrator",
          isActive: true,
        },
      });

      if (!adminRole) {
        // Try to create the admin role (and related default roles) on demand
        try {
          await seedRoles();
        } catch (err) {
          console.error("Failed to seed roles during /init check:", err);
        }

        const created = await prisma.role.findFirst({
          where: { name: "Administrator", isActive: true },
        });

        if (!created) {
          return sendSuccess(
            reply,
            { hasAdmin: false },
            "No admin role found. Please create an admin role first."
          );
        }
        adminRole = created;
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
        // We only create roles automatically; admin user must be created manually
        return sendSuccess(reply, { hasAdmin: false }, "No admin user found");
      }
    } catch (error) {
      console.error("Error checking for admin user:", error);
      return sendSuccess(reply, { hasAdmin: false }, "No admin user found");
    }
  });
}
