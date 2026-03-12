import { FastifyInstance, RouteHandlerMethod } from "fastify";
import { prisma } from "../lib/prisma";
import { requireAuthCookie } from "../lib/authentication";
import { requirePermissions } from "../lib/authorization";
import {
  sendError,
  sendNotFound,
  sendSuccess,
  sendValidationError,
} from "../lib/response";
import { sanitizeInput } from "../util/sanitize";

interface SupplierBody {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

interface SupplierListQuery {
  search?: string;
  isActive?: string;
}

const listSuppliers: RouteHandlerMethod = async (request, reply) => {
  try {
    const { search, isActive } = request.query as SupplierListQuery;

    const where: any = {};

    if (typeof isActive === "string") {
      where.isActive = isActive === "true";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    });

    return sendSuccess(reply, suppliers);
  } catch (error: any) {
    console.error("listSuppliers error", error);
    return sendError(reply, "Failed to list suppliers", 500);
  }
};

const getSupplier: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const supplier = await prisma.supplier.findUnique({ where: { id } });

    if (!supplier) {
      return sendNotFound(reply, "Supplier not found");
    }

    return sendSuccess(reply, supplier);
  } catch (error: any) {
    console.error("getSupplier error", error);
    return sendError(reply, "Failed to retrieve supplier", 500);
  }
};

const createSupplier: RouteHandlerMethod = async (request, reply) => {
  try {
    const data = sanitizeInput<SupplierBody>(request.body, {
      allowedFields: [
        "name",
        "contactPerson",
        "email",
        "phone",
        "address",
        "notes",
        "isActive",
      ],
      trimStrings: true,
      removeEmpty: true,
      parseBooleans: ["isActive"],
    });

    if (!data.name) {
      return sendValidationError(reply, { name: ["Name is required"] });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        notes: data.notes,
        isActive: data.isActive ?? true,
      },
    });

    return sendSuccess(reply, supplier, "Supplier created", 201);
  } catch (error: any) {
    console.error("createSupplier error", error, { body: request.body });
    return sendError(reply, "Failed to create supplier", 500);
  }
};

const updateSupplier: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const data = sanitizeInput<SupplierBody>(request.body, {
      allowedFields: [
        "name",
        "contactPerson",
        "email",
        "phone",
        "address",
        "notes",
        "isActive",
      ],
      trimStrings: true,
      removeEmpty: true,
      parseBooleans: ["isActive"],
    });

    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
    });
    if (!existingSupplier) {
      return sendNotFound(reply, "Supplier not found");
    }

    if (data.name !== undefined && !data.name) {
      return sendValidationError(reply, { name: ["Name is required"] });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data,
    });

    return sendSuccess(reply, supplier, "Supplier updated");
  } catch (error: any) {
    console.error("updateSupplier error", error, {
      id: (request.params as any)?.id,
      body: request.body,
    });
    return sendError(reply, "Failed to update supplier", 500);
  }
};

const deleteSupplier: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
    });
    if (!existingSupplier) {
      return sendNotFound(reply, "Supplier not found");
    }

    await prisma.supplier.delete({ where: { id } });

    return sendSuccess(
      reply,
      existingSupplier,
      "Supplier deleted successfully",
    );
  } catch (error: any) {
    console.error("deleteSupplier error", error, {
      id: (request.params as any)?.id,
    });
    return sendError(reply, "Failed to delete supplier", 500);
  }
};

export async function supplierRoutes(server: FastifyInstance) {
  server.get(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:VIEW"),
    },
    listSuppliers,
  );

  server.get(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:VIEW"),
    },
    getSupplier,
  );

  server.post(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:MANAGE"),
    },
    createSupplier,
  );

  server.put(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:MANAGE"),
    },
    updateSupplier,
  );

  server.delete(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:MANAGE"),
    },
    deleteSupplier,
  );
}
