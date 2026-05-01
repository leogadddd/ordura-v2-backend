import { FastifyInstance } from "fastify";
import { getInventorySummary } from "./summary";
import {
  adjustInventoryLevel,
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItem,
  listInventoryItems,
  listInventoryLevels,
  updateInventoryItem,
} from "./items";
import {
  createLocation,
  listLocations,
  updateLocation,
  deleteLocation,
} from "./locations";
import { requireAuthCookie } from "../../lib/authentication";
import { requirePermissions } from "../../lib/authorization";

export async function inventoryRoutes(server: FastifyInstance) {
  // ingredient items
  server.get(
    "/items",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions(["INVENTORY:VIEW", "PRODUCTS:VIEW"]),
    },
    listInventoryItems,
  );

  server.get(
    "/items/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:VIEW"),
    },
    getInventoryItem,
  );

  server.get(
    "/items/:id/levels",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:VIEW"),
    },
    listInventoryLevels,
  );

  server.post(
    "/items",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:MANAGE"),
    },
    createInventoryItem,
  );

  server.put(
    "/items/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:MANAGE"),
    },
    updateInventoryItem,
  );

  server.delete(
    "/items/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:MANAGE"),
    },
    deleteInventoryItem,
  );

  server.post(
    "/items/adjust",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:ADJUST"),
    },
    adjustInventoryLevel,
  );

  server.get(
    "/summary",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:VIEW"),
    },
    getInventorySummary,
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
