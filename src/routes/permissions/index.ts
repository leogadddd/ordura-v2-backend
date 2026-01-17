import { FastifyInstance } from "fastify";
import {
  listPermissions,
  getPermission,
  createPermission,
  createManyPermissions,
  updatePermission,
  deleteManyPermissions,
} from "../../services/permissions";
import { sendError, sendSuccess, sendNotFound } from "../../lib/response";
import { authenticateWithCookie } from "../../lib/auth";
import { requirePermission } from "../../lib/authorization";

export async function permissionsRoutes(server: FastifyInstance) {
  server.get(
    "/",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("PERMISSIONS:view"),
    },
    async (request, reply) => {
      try {
        const perms = await listPermissions();
        return sendSuccess(reply, perms, "Permissions retrieved successfully");
      } catch (err) {
        console.error(err);
        return sendError(reply, "Failed to fetch permissions");
      }
    }
  );

  server.get(
    "/:id",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("PERMISSIONS:view"),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const perm = await getPermission(id);
        if (!perm) return sendNotFound(reply, "Permission not found");
        return sendSuccess(reply, perm, "Permission retrieved successfully");
      } catch (err) {
        console.error(err);
        return sendError(reply, "Failed to fetch permission");
      }
    }
  );

  server.post(
    "/",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("PERMISSIONS:create"),
    },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const created = await createPermission(body);
        return sendSuccess(
          reply,
          created,
          "Permission created successfully",
          201
        );
      } catch (err: any) {
        console.error(err);
        return sendError(reply, err?.message || "Failed to create permission");
      }
    }
  );

  server.post(
    "/many",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("PERMISSIONS:create"),
    },
    async (request, reply) => {
      try {
        const rows = request.body as any[];
        const created = await createManyPermissions(rows);
        return sendSuccess(
          reply,
          created,
          "Permissions created successfully",
          201
        );
      } catch (err) {
        console.error(err);
        return sendError(reply, "Failed to create permissions");
      }
    }
  );

  server.put(
    "/:id",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("PERMISSIONS:edit"),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as any;
        const updated = await updatePermission(id, body);
        if (!updated) return sendNotFound(reply, "Permission not found");
        return sendSuccess(reply, updated, "Permission updated successfully");
      } catch (err: any) {
        console.error(err);
        return sendError(reply, err?.message || "Failed to update permission");
      }
    }
  );

  // Bulk delete
  server.post(
    "/delete-many",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("PERMISSIONS:delete"),
    },
    async (request, reply) => {
      try {
        const ids = (request.body as { ids?: string[] } | undefined)?.ids || [];
        const res = await deleteManyPermissions(ids);
        return sendSuccess(reply, res, "Permissions deleted successfully");
      } catch (err) {
        console.error(err);
        return sendError(reply, "Failed to delete permissions");
      }
    }
  );
}

export default permissionsRoutes;
