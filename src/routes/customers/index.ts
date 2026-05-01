import { FastifyInstance } from "fastify";
import { requireAuthCookie } from "../../lib/authentication";
import { requirePermissions } from "../../lib/authorization";
import { listCustomers } from "./list";
import { getCustomer } from "./get";
import { createCustomer } from "./create";
import { updateCustomer } from "./update";
import { deactivateCustomer } from "./deactivate";

export async function customerRoutes(server: FastifyInstance) {
  // GET /api/customers - list
  server.get(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("CUSTOMERS:VIEW"),
    },
    listCustomers,
  );

  // GET /api/customers/:id - get one
  server.get(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("CUSTOMERS:VIEW"),
    },
    getCustomer,
  );

  // POST /api/customers - create
  server.post(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("CUSTOMERS:CREATE"),
    },
    createCustomer,
  );

  // PUT /api/customers/:id - update
  server.put(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("CUSTOMERS:EDIT"),
    },
    updateCustomer,
  );

  // DELETE /api/customers/:id - deactivate
  server.delete(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("CUSTOMERS:DELETE"),
    },
    deactivateCustomer,
  );
}
