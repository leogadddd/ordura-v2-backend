import { FastifyInstance, FastifyPluginCallback } from "fastify";
import { fulfillmentTypeRoutes } from "./fulfillment-types";

export const optionsRoutes: FastifyPluginCallback = (
  fastify: FastifyInstance,
  _opts,
  done
) => {
  fastify.register(fulfillmentTypeRoutes, { prefix: "/fulfillment-types" });
  done();
};

export default optionsRoutes;
