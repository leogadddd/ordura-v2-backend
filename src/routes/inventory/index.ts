import { FastifyInstance } from "fastify";
import { listStocks } from "./list";
import { getStock } from "./get";
import { adjustStock } from "./adjust";
import { getInventorySummary } from "./summary";
import { createStock, deleteStock } from "./stocks";
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
  // inventory items (standalone stock items)
  server.get(
    "/items",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:VIEW"),
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
    "/stocks",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:MANAGE"),
    },
    createStock,
  );

  server.delete(
    "/stocks/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:MANAGE"),
    },
    deleteStock,
  );

  server.post(
    "/adjust",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:ADJUST"),
    },
    adjustStock,
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
