import { FastifyInstance } from "fastify";
import { getUsers } from "./list";
import { getUser } from "./get";
import { createUser } from "./create";
import { updateUser } from "./update";
import { deleteUser } from "./delete";
import { authenticateWithCookie } from "../../lib/auth";
import { requirePermission } from "../../lib/authorization";

export async function userRoutes(server: FastifyInstance) {
  // GET /api/users - list
  server.get(
    "/",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("USERS:view"),
    },
    getUsers
  );

  // GET /api/users/:id - get one
  server.get(
    "/:id",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("USERS:view"),
    },
    getUser
  );

  // POST /api/users - create
  server.post(
    "/",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("USERS:create"),
    },
    createUser
  );

  // PUT /api/users/:id - update
  server.put(
    "/:id",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("USERS:edit"),
    },
    updateUser
  );

  // DELETE /api/users/:id - deactivate
  server.delete(
    "/:id",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("USERS:delete"),
    },
    deleteUser
  );

  // POST /api/users/:id/password - change password
  server.post(
    "/:id/password",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("USERS:edit"),
    },
    require("./change-password").changePassword
  );
}
