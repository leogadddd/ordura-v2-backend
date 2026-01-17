import { FastifyInstance } from "fastify";
import { getRoles } from "./list";
import { getRole } from "./get";
import { createRole } from "./create";
import { updateRole } from "./update";
import { deleteRole } from "./delete";
import { authenticateWithCookie } from "../../lib/auth";
import { requirePermission } from "../../lib/authorization";

export async function rolesRoutes(server: FastifyInstance) {
  // GET /api/roles - list
  server.get(
    "/",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("ROLES:view"),
    },
    getRoles
  );

  // GET /api/roles/:id - get one
  server.get(
    "/:id",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("ROLES:view"),
    },
    getRole
  );

  // POST /api/roles - create
  server.post(
    "/",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("ROLES:create"),
    },
    createRole
  );

  // PUT /api/roles/:id - update
  server.put(
    "/:id",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("ROLES:edit"),
    },
    updateRole
  );

  // DELETE /api/roles/:id - deactivate
  server.delete(
    "/:id",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("ROLES:delete"),
    },
    deleteRole
  );
}

export default rolesRoutes;
