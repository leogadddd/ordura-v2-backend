import { FastifyInstance } from "fastify";
import { getSalesTransactions } from "./list";
import { getSalesTransaction } from "./get";
import { requireAuthCookie } from "../../../lib/authentication";
import { requirePermissions } from "../../../lib/authorization";

export async function salesTransactionRoutes(server: FastifyInstance) {
  server.get(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("ORDERS:MANAGE"),
    },
    getSalesTransactions
  );

  server.get(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("ORDERS:VIEW"),
    },
    getSalesTransaction
  );
}
