import { FastifyInstance } from "fastify";
import { getOrders } from "./list";
import { getOrder } from "./get";
import { createOrder } from "./create";
import { authenticateWithCookie } from "../../lib/auth";
import { requirePermission } from "../../lib/authorization";

export async function orderRoutes(server: FastifyInstance) {
  // GET /api/orders - List all orders with filters
  server.get(
    "/",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("ORDERS:MANAGE"),
    },
    getOrders
  );

  // POST /api/orders - Create new order
  server.post(
    "/",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission(["ORDERS:CREATE", "POS:ORDER"]),
    },
    createOrder
  );

  // GET /api/orders/:id - Get single order with items and payments
  server.get(
    "/:id",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("ORDERS:VIEW"),
    },
    getOrder
  );
}
