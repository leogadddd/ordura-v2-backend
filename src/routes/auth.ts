import { FastifyInstance } from "fastify";
import { registerRoute } from "./auth/register";
import { loginRoute } from "./auth/login";
import { refreshRoute } from "./auth/refresh";
import { logoutRoute } from "./auth/logout";
import { meRoute } from "./auth/me";

export async function authRoutes(server: FastifyInstance) {
  await registerRoute(server);
  await loginRoute(server);
  await refreshRoute(server);
  await logoutRoute(server);
  await meRoute(server);
}
