import { FastifyInstance } from "fastify";
import { createProduct } from "./create";
import { updateProduct } from "./update";
import { deleteProduct } from "./delete";
import { getProducts } from "./list";
import { getProduct } from "./get";

export async function productRoutes(server: FastifyInstance) {
  // GET /api/products - List all products
  server.get("/", getProducts);

  // GET /api/products/:id - Get single product
  server.get("/:id", getProduct);

  // POST /api/products - Create new product
  server.post("/", createProduct);

  // PUT /api/products/:id - Update product
  server.put("/:id", updateProduct);

  // DELETE /api/products/:id - Delete product
  server.delete("/:id", deleteProduct);
}
