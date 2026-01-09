import { FastifyInstance } from "fastify";
import { createProduct } from "./create";
import { updateProduct } from "./update";
import { deleteProduct } from "./delete";
import { getProducts } from "./list";
import { getProduct } from "./get";
import { authenticateWithCookie } from "../../lib/auth";

export async function productRoutes(server: FastifyInstance) {
  // GET /api/products - List all products
  server.get("/", { onRequest: authenticateWithCookie(server) }, getProducts);

  // GET /api/products/:id - Get single product
  server.get("/:id", { onRequest: authenticateWithCookie(server) }, getProduct);

  // POST /api/products - Create new product
  server.post(
    "/",
    { onRequest: authenticateWithCookie(server) },
    createProduct
  );

  // PUT /api/products/:id - Update product
  server.put(
    "/:id",
    { onRequest: authenticateWithCookie(server) },
    updateProduct
  );

  // DELETE /api/products/:id - Delete product
  server.delete(
    "/:id",
    { onRequest: authenticateWithCookie(server) },
    deleteProduct
  );
}
