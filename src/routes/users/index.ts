import { FastifyInstance } from "fastify";
import { getUsers } from "./list";
import { getUser } from "./get";
import { createUser } from "./create";
import { updateUser } from "./update";
import { deleteUser } from "./delete";
import { requireAuthCookie } from "../../lib/authentication";
import { requirePermissions } from "../../lib/authorization";

export async function userRoutes(server: FastifyInstance) {
  // GET /api/users - list
  server.get(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("USERS:view"),
    },
    getUsers
  );

  // GET /api/users/:id - get one
  server.get(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("USERS:view"),
    },
    getUser
  );

  // POST /api/users - create
  server.post(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("USERS:create"),
    },
    createUser
  );

  // PUT /api/users/:id - update
  server.put(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("USERS:edit"),
    },
    updateUser
  );

  // DELETE /api/users/:id - deactivate
  server.delete(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("USERS:delete"),
    },
    deleteUser
  );

  // POST /api/users/:id/password - change password
  server.post(
    "/:id/password",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("USERS:edit"),
    },
    require("./change-password").changePassword
  );
}
