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
      preHandler: requirePermissions("ROLES:view"),
    },
    getRoles
  );

  // GET /api/roles/:id - get one
  server.get(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("ROLES:view"),
    },
    getRole
  );

  // POST /api/roles - create
  server.post(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("ROLES:create"),
    },
    createRole
  );

  // PUT /api/roles/:id - update
  server.put(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("ROLES:edit"),
    },
    updateRole
  );

  // DELETE /api/roles/:id - deactivate
  server.delete(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("ROLES:delete"),
    },
    deleteRole
  );
}

export default rolesRoutes;
