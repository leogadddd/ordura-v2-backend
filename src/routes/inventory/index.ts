import { FastifyInstance } from "fastify";
import { listStocks } from "./list";
import { getStock } from "./get";
import { adjustStock } from "./adjust";
import {
  createLocation,
  listLocations,
  updateLocation,
  deleteLocation,
} from "./locations";
import { requireAuthCookie } from "../../lib/authentication";
import { requirePermissions } from "../../lib/authorization";

export async function inventoryRoutes(server: FastifyInstance) {
  // stocks
  server.get(
    "/stocks",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:VIEW"),
    },
    listStocks,
  );

  server.get(
    "/stocks/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:VIEW"),
    },
    getStock,
  );

  server.post(
    "/adjust",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:ADJUST"),
    },
    adjustStock,
  );

  // locations
  server.get(
    "/locations",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:VIEW"),
    },
    listLocations,
  );

  server.post(
    "/locations",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:MANAGE"),
    },
    createLocation,
  );

  server.put(
    "/locations/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:MANAGE"),
    },
    updateLocation,
  );

  server.delete(
    "/locations/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:MANAGE"),
    },
    deleteLocation,
  );
}
