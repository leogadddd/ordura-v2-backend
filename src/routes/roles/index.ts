import { FastifyInstance } from "fastify";
import { getRoles } from "./list";
import { getRole } from "./get";
import { createRole } from "./create";
import { updateRole } from "./update";
import { deleteRole } from "./delete";
import { requireAuthCookie } from "../../lib/authentication";
import { requirePermissions } from "../../lib/authorization";

export async function rolesRoutes(server: FastifyInstance) {
  // GET /api/roles - list
  server.get(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("ROLES:VIEW"),
    },
    getRoles,
  );

  // GET /api/roles/:id - get one
  // Allow either ROLES:VIEW or ROLES:MANAGE to access a single role
  server.get(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("ROLES:VIEW"),
    },
    getRole,
  );

  // POST /api/roles - create
  server.post(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("ROLES:CREATE"),
    },
    createRole,
  );

  // PUT /api/roles/:id - update
  server.put(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("ROLES:EDIT"),
    },
    updateRole,
  );

  // DELETE /api/roles/:id - deactivate
  server.delete(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("ROLES:DELETE"),
    },
    deleteRole,
  );
}

export default rolesRoutes;
