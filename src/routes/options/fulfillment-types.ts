import { FastifyInstance, FastifyPluginCallback } from "fastify";
import { prisma } from "../../lib/prisma";
import {
  sendConflict,
  sendError,
  sendNotFound,
  sendSuccess,
  sendValidationError,
} from "../../lib/response";

interface CreateBody {
  code: string;
  name: string;
  isActive?: boolean;
  sortOrder?: number;
}

interface UpdateBody {
  code?: string;
  name?: string;
  isActive?: boolean;
  sortOrder?: number;
}

interface Params {
  id: string;
}

export const fulfillmentTypeRoutes: FastifyPluginCallback = (
  fastify: FastifyInstance,
  _opts,
  done
) => {
  // List (optionally include inactive)
  fastify.get("/", async (request, reply) => {
    const includeInactive =
      (request.query as { includeInactive?: string })?.includeInactive ===
      "true";
    try {
      const items = await prisma.fulfillmentType.findMany({
        where: includeInactive ? {} : { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      return sendSuccess(reply, items, "Fulfillment types fetched");
    } catch (error) {
      fastify.log.error({ error }, "Failed to list fulfillment types");
      return sendError(reply, "Failed to list fulfillment types", 500);
    }
  });

  // Create
  fastify.post("/", async (request, reply) => {
    const {
      code,
      name,
      isActive = true,
      sortOrder = 0,
    } = request.body as CreateBody;

    if (!code || !name) {
      return sendValidationError(reply, {
        code: ["code is required"],
        name: ["name is required"],
      });
    }

    try {
      const existing = await prisma.fulfillmentType.findUnique({
        where: { code },
      });
      if (existing) {
        return sendConflict(reply, "Fulfillment type code already exists");
      }

      const created = await prisma.fulfillmentType.create({
        data: { code, name, isActive, sortOrder },
      });
      return sendSuccess(reply, created, "Fulfillment type created", 201);
    } catch (error) {
      fastify.log.error({ error }, "Failed to create fulfillment type");
      return sendError(reply, "Failed to create fulfillment type", 500);
    }
  });

  // Update
  fastify.put<{ Params: Params; Body: UpdateBody }>(
    "/:id",
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body || {};

      try {
        const existing = await prisma.fulfillmentType.findUnique({
          where: { id },
        });
        if (!existing) return sendNotFound(reply, "Fulfillment type not found");

        if (body.code) {
          const conflict = await prisma.fulfillmentType.findFirst({
            where: { code: body.code, NOT: { id } },
          });
          if (conflict) {
            return sendConflict(reply, "Fulfillment type code already exists");
          }
        }

        const updated = await prisma.fulfillmentType.update({
          where: { id },
          data: body,
        });
        return sendSuccess(reply, updated, "Fulfillment type updated");
      } catch (error) {
        fastify.log.error({ error }, "Failed to update fulfillment type");
        return sendError(reply, "Failed to update fulfillment type", 500);
      }
    }
  );

  // Delete
  fastify.delete<{ Params: Params }>("/:id", async (request, reply) => {
    const { id } = request.params;
    try {
      const existing = await prisma.fulfillmentType.findUnique({
        where: { id },
      });
      if (!existing) return sendNotFound(reply, "Fulfillment type not found");

      await prisma.fulfillmentType.delete({ where: { id } });
      return sendSuccess(reply, null, "Fulfillment type deleted");
    } catch (error) {
      fastify.log.error({ error }, "Failed to delete fulfillment type");
      return sendError(reply, "Failed to delete fulfillment type", 500);
    }
  });

  done();
};

export default fulfillmentTypeRoutes;
