import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import {
  sendSuccess,
  sendValidationError,
  sendError,
} from "../../lib/response";
import { sanitizeInput } from "../../util/sanitize";

// CRUD for Location

interface LocationBody {
  name: string;
  address?: string;
}

export const createLocation: RouteHandlerMethod = async (request, reply) => {
  try {
    const { name, address } = sanitizeInput<LocationBody>(request.body, {
      allowedFields: ["name", "address"],
      trimStrings: true,
      removeEmpty: true,
    });

    if (!name) {
      return sendValidationError(reply, { fields: ["name"] });
    }

    const location = await prisma.location.create({
      data: { name, address },
    });

    return sendSuccess(reply, location, "Location created", 201);
  } catch (error: any) {
    console.error("createLocation error", error, { body: request.body });
    return sendError(reply, "Failed to create location", 500);
  }
};

export const listLocations: RouteHandlerMethod = async (request, reply) => {
  try {
    const locations = await prisma.location.findMany({});
    return sendSuccess(reply, locations);
  } catch (error: any) {
    console.error("listLocations error", error);
    return sendError(reply, "Failed to list locations", 500);
  }
};

export const updateLocation: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const { name, address } = sanitizeInput<LocationBody>(request.body, {
      allowedFields: ["name", "address"],
      trimStrings: true,
      removeEmpty: true,
    });

    const location = await prisma.location.update({
      where: { id },
      data: { name, address },
    });
    return sendSuccess(reply, location, "Location updated");
  } catch (error: any) {
    console.error("updateLocation error", error);
    return sendError(reply, "Failed to update location", 500);
  }
};

export const deleteLocation: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    await prisma.location.delete({ where: { id } });
    return sendSuccess(reply, null, "Location deleted");
  } catch (error: any) {
    console.error("deleteLocation error", error);
    return sendError(reply, "Failed to delete location", 500);
  }
};
