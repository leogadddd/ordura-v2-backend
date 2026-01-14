import { FastifyInstance, FastifyPluginCallback } from "fastify";
import { fulfillmentTypeRoutes } from "./fulfillment-types";
import { rolesRoute } from "./roles";

export const optionsRoutes: FastifyPluginCallback = (
  fastify: FastifyInstance,
  _opts,
  done
) => {
  fastify.register(fulfillmentTypeRoutes, { prefix: "/fulfillment-types" });
  fastify.register(rolesRoute, { prefix: "/roles" });
  done();
};

export default optionsRoutes;
