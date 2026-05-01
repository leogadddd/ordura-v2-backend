import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import { authRoutes } from "./routes/auth";
import { productRoutes } from "./routes/products";
import { orderRoutes } from "./routes/orders";
import { salesTransactionRoutes } from "./routes/transactions/sales";
import { optionsRoutes } from "./routes/options";
import { rolesRoutes } from "./routes/roles";
import { userRoutes } from "./routes/users";
import { permissionsRoutes } from "./routes/permissions";
import { seedRoles } from "./scripts/seed-roles";
// import { posRoutes } from "./routes/pos";
import { inventoryRoutes } from "./routes/inventory";
// import { reportsRoutes } from "./routes/reports";
// import { syncRoutes } from "./routes/sync";
import { supplierRoutes } from "./routes/suppliers";
import { customerRoutes } from "./routes/customers";

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// Register plugins
server.register(cors, {
  origin: ["http://localhost:1420", "http://localhost:5173"],
  credentials: true,
});

server.register(cookie);

server.register(jwt, {
  secret:
    process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production",
});

// Health check
server.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Register routes
server.register(authRoutes, { prefix: "/api/auth" });
server.register(productRoutes, { prefix: "/api/products" });
server.register(orderRoutes, { prefix: "/api/orders" });
server.register(salesTransactionRoutes, { prefix: "/api/transactions/sales" });
server.register(optionsRoutes, { prefix: "/api/options" });
server.register(rolesRoutes, { prefix: "/api/roles" });
server.register(userRoutes, { prefix: "/api/users" });
server.register(permissionsRoutes, { prefix: "/api/permissions" });
// server.register(posRoutes, { prefix: "/api/pos" });
server.register(inventoryRoutes, { prefix: "/api/inventory" });
// server.register(reportsRoutes, { prefix: "/api/reports" });
// server.register(syncRoutes, { prefix: "/api/sync" });
server.register(supplierRoutes, { prefix: "/api/suppliers" });
server.register(customerRoutes, { prefix: "/api/customers" });

// Start server
const start = async () => {
  try {
    // Ensure essential roles exist on startup (do NOT auto-create admin user)
    await seedRoles();

    const port = parseInt(process.env.PORT || "3000");
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Server running on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
