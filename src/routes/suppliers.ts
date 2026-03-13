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
  deliveryLeadTimeDays?: number;
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
      include: {
        tags: { orderBy: { label: "asc" } },
        _count: { select: { contacts: true } },
      },
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
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        tags: { orderBy: { label: "asc" } },
        contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      },
    });

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
    const rawBody = request.body as any;
    const data = sanitizeInput<SupplierBody>(rawBody, {
      allowedFields: [
        "name",
        "contactPerson",
        "email",
        "phone",
        "address",
        "deliveryLeadTimeDays",
        "notes",
        "isActive",
      ],
      trimStrings: true,
      removeEmpty: true,
      parseIntegers: ["deliveryLeadTimeDays"],
      parseNumbers: ["deliveryLeadTimeDays"],
      parseBooleans: ["isActive"],
    });

    const tags: string[] | undefined = Array.isArray(rawBody?.tags)
      ? rawBody.tags
          .filter((t: any) => typeof t === "string")
          .map((t: string) => t.trim())
          .filter(Boolean)
      : undefined;

    if (!data.name) {
      return sendValidationError(reply, { name: ["Name is required"] });
    }

    const supplier = await prisma.$transaction(async (tx) => {
      const created = await tx.supplier.create({
        data: {
          name: data.name,
          contactPerson: data.contactPerson,
          email: data.email,
          phone: data.phone,
          address: data.address,
          deliveryLeadTimeDays: data.deliveryLeadTimeDays,
          notes: data.notes,
          isActive: data.isActive ?? true,
        },
      });

      if (tags && tags.length > 0) {
        await tx.supplierTag.createMany({
          data: tags.map((label) => ({ supplierId: created.id, label })),
          skipDuplicates: true,
        });
      }

      return tx.supplier.findUnique({
        where: { id: created.id },
        include: {
          tags: { orderBy: { label: "asc" } },
          _count: { select: { contacts: true } },
        },
      });
    });

    if (!supplier) {
      return sendError(reply, "Failed to create supplier", 500);
    }

    return sendSuccess(reply, supplier, "Supplier created", 201);
  } catch (error: any) {
    console.error("createSupplier error", error, { body: request.body });
    return sendError(reply, "Failed to create supplier", 500);
  }
};

const updateSupplier: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const rawBody = request.body as any;
    const data = sanitizeInput<SupplierBody>(rawBody, {
      allowedFields: [
        "name",
        "contactPerson",
        "email",
        "phone",
        "address",
        "deliveryLeadTimeDays",
        "notes",
        "isActive",
      ],
      trimStrings: true,
      removeEmpty: true,
      parseIntegers: ["deliveryLeadTimeDays"],
      parseNumbers: ["deliveryLeadTimeDays"],
      parseBooleans: ["isActive"],
    });

    const tags: string[] | undefined = Array.isArray(rawBody?.tags)
      ? rawBody.tags
          .filter((t: any) => typeof t === "string")
          .map((t: string) => t.trim())
          .filter(Boolean)
      : undefined;

    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
    });
    if (!existingSupplier) {
      return sendNotFound(reply, "Supplier not found");
    }

    if (data.name !== undefined && !data.name) {
      return sendValidationError(reply, { name: ["Name is required"] });
    }

    const supplier = await prisma.$transaction(async (tx) => {
      await tx.supplier.update({
        where: { id },
        data,
      });

      if (tags) {
        await tx.supplierTag.deleteMany({ where: { supplierId: id } });
        if (tags.length > 0) {
          await tx.supplierTag.createMany({
            data: tags.map((label) => ({ supplierId: id, label })),
            skipDuplicates: true,
          });
        }
      }

      return tx.supplier.findUnique({
        where: { id },
        include: {
          tags: { orderBy: { label: "asc" } },
          _count: { select: { contacts: true } },
        },
      });
    });

    if (!supplier) {
      return sendError(reply, "Failed to update supplier", 500);
    }

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

  // supplier contacts
  server.get(
    "/:id/contacts",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:VIEW"),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const supplier = await prisma.supplier.findUnique({ where: { id } });
        if (!supplier) return sendNotFound(reply, "Supplier not found");

        const contacts = await prisma.supplierContact.findMany({
          where: { supplierId: id },
          orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
        });
        return sendSuccess(reply, contacts);
      } catch (error: any) {
        console.error("listSupplierContacts error", error);
        return sendError(reply, "Failed to list contacts", 500);
      }
    },
  );

  server.post(
    "/:id/contacts",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:MANAGE"),
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const supplier = await prisma.supplier.findUnique({ where: { id } });
        if (!supplier) return sendNotFound(reply, "Supplier not found");

        const data = sanitizeInput<any>(request.body, {
          allowedFields: [
            "name",
            "role",
            "email",
            "phone",
            "notes",
            "isPrimary",
          ],
          trimStrings: true,
          removeEmpty: true,
          parseBooleans: ["isPrimary"],
        });

        if (!data.name) {
          return sendValidationError(reply, { name: ["Name is required"] });
        }

        const created = await prisma.$transaction(async (tx) => {
          if (data.isPrimary === true) {
            await tx.supplierContact.updateMany({
              where: { supplierId: id, isPrimary: true },
              data: { isPrimary: false },
            });
          }

          return tx.supplierContact.create({
            data: {
              supplierId: id,
              name: data.name,
              role: data.role,
              email: data.email,
              phone: data.phone,
              notes: data.notes,
              isPrimary: data.isPrimary ?? false,
            },
          });
        });

        return sendSuccess(reply, created, "Contact created", 201);
      } catch (error: any) {
        console.error("createSupplierContact error", error, {
          id: (request.params as any)?.id,
          body: request.body,
        });
        return sendError(reply, "Failed to create contact", 500);
      }
    },
  );

  server.put(
    "/:id/contacts/:contactId",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:MANAGE"),
    },
    async (request, reply) => {
      try {
        const { id, contactId } = request.params as {
          id: string;
          contactId: string;
        };

        const existing = await prisma.supplierContact.findUnique({
          where: { id: contactId },
        });
        if (!existing || existing.supplierId !== id) {
          return sendNotFound(reply, "Contact not found");
        }

        const data = sanitizeInput<any>(request.body, {
          allowedFields: [
            "name",
            "role",
            "email",
            "phone",
            "notes",
            "isPrimary",
          ],
          trimStrings: true,
          removeEmpty: true,
          parseBooleans: ["isPrimary"],
        });

        if (data.name !== undefined && !data.name) {
          return sendValidationError(reply, { name: ["Name is required"] });
        }

        const updated = await prisma.$transaction(async (tx) => {
          if (data.isPrimary === true) {
            await tx.supplierContact.updateMany({
              where: { supplierId: id, isPrimary: true },
              data: { isPrimary: false },
            });
          }

          return tx.supplierContact.update({
            where: { id: contactId },
            data,
          });
        });

        return sendSuccess(reply, updated, "Contact updated");
      } catch (error: any) {
        console.error("updateSupplierContact error", error, {
          params: request.params,
          body: request.body,
        });
        return sendError(reply, "Failed to update contact", 500);
      }
    },
  );

  server.delete(
    "/:id/contacts/:contactId",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("PRODUCTS:MANAGE"),
    },
    async (request, reply) => {
      try {
        const { id, contactId } = request.params as {
          id: string;
          contactId: string;
        };

        const existing = await prisma.supplierContact.findUnique({
          where: { id: contactId },
        });
        if (!existing || existing.supplierId !== id) {
          return sendNotFound(reply, "Contact not found");
        }

        await prisma.supplierContact.delete({ where: { id: contactId } });
        return sendSuccess(reply, existing, "Contact deleted");
      } catch (error: any) {
        console.error("deleteSupplierContact error", error, {
          params: request.params,
        });
        return sendError(reply, "Failed to delete contact", 500);
      }
    },
  );
}
