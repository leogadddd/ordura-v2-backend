import { FastifyInstance } from "fastify";
import { createProduct } from "./create";
import { updateProduct } from "./update";
import { deleteProduct } from "./delete";
import { getProducts } from "./list";
import { getProduct } from "./get";
import { authenticateWithCookie } from "../../lib/auth";
import { requirePermission } from "../../lib/authorization";

export async function productRoutes(server: FastifyInstance) {
  // GET /api/products - List all products
  server.get(
    "/",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("PRODUCTS:VIEW"),
    },
    getProducts
  );

  // GET /api/products/:id - Get single product
  server.get(
    "/:id",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("PRODUCTS:VIEW"),
    },
    getProduct
  );

  // POST /api/products - Create new product
  server.post(
    "/",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("PRODUCTS:CREATE"),
    },
    createProduct
  );

  // PUT /api/products/:id - Update product
  server.put(
    "/:id",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("PRODUCTS:EDIT"),
    },
    updateProduct
  );

  // DELETE /api/products/:id - Delete product
  server.delete(
    "/:id",
    {
      onRequest: authenticateWithCookie(server),
      preHandler: requirePermission("PRODUCTS:delete"),
    },
    deleteProduct
  );
}
