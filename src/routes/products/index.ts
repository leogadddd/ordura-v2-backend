import { FastifyInstance } from "fastify";
import { createProduct } from "./create";
import { updateProduct } from "./update";
import { deleteProduct } from "./delete";
import { getProducts } from "./list";
import { getProduct } from "./get";
import { requireAuthCookie } from "../../lib/authentication";
import { requirePermissions } from "../../lib/authorization";

export async function productRoutes(server: FastifyInstance) {
  // GET /api/products - List all products
  server.get(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:VIEW"),
    },
    getProducts
  );

  // GET /api/products/:id - Get single product
  server.get(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:VIEW"),
    },
    getProduct
  );

  // POST /api/products - Create new product
  server.post(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:CREATE"),
    },
    createProduct
  );

  // PUT /api/products/:id - Update product
  server.put(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:EDIT"),
    },
    updateProduct
  );

  // DELETE /api/products/:id - Delete product
  server.delete(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:delete"),
    },
    deleteProduct
  );
}
