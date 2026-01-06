import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import { authRoutes } from "./routes/auth";
import { productRoutes } from "./routes/products";
// import { posRoutes } from "./routes/pos";
// import { inventoryRoutes } from "./routes/inventory";
// import { reportsRoutes } from "./routes/reports";
// import { syncRoutes } from "./routes/sync";

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
// server.register(posRoutes, { prefix: "/api/pos" });
// server.register(inventoryRoutes, { prefix: "/api/inventory" });
// server.register(reportsRoutes, { prefix: "/api/reports" });
// server.register(syncRoutes, { prefix: "/api/sync" });

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3000");
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Server running on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
