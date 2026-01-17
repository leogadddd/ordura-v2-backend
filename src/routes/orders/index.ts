import { FastifyInstance } from "fastify";
import { getOrders } from "./list";
import { getOrder } from "./get";
import { createOrder } from "./create";
import { requireAuthCookie } from "../../lib/authentication";
import { requirePermissions } from "../../lib/authorization";

export async function orderRoutes(server: FastifyInstance) {
  // GET /api/orders - List all orders with filters
  server.get(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("ORDERS:MANAGE"),
    },
    getOrders
  );

  // POST /api/orders - Create new order
  server.post(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions(["ORDERS:CREATE", "POS:ORDER"]),
    },
    createOrder
  );

  // GET /api/orders/:id - Get single order with items and payments
  server.get(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("ORDERS:VIEW"),
    },
    getOrder
  );
}
