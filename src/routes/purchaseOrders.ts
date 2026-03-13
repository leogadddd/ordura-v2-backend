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

interface ListPurchaseOrdersQuery {
  search?: string;
  status?: string;
  supplierId?: string;
}

const listPurchaseOrders: RouteHandlerMethod = async (request, reply) => {
  try {
    const { search, status, supplierId } =
      request.query as ListPurchaseOrdersQuery;

    const where: any = {};
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { supplier: { name: { contains: search, mode: "insensitive" } } },
        { id: { contains: search, mode: "insensitive" } },
      ];
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        _count: { select: { items: true, notes: true } },
      },
      orderBy: [{ orderedAt: "desc" }, { createdAt: "desc" }],
    });

    return sendSuccess(reply, orders);
  } catch (error: any) {
    console.error("listPurchaseOrders error", error);
    return sendError(reply, "Failed to list purchase orders", 500);
  }
};

const getPurchaseOrder: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { inventoryItem: { include: { supplier: true } } },
          orderBy: [{ createdAt: "asc" }],
        },
        notes: {
          include: { createdBy: true },
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });

    if (!order) return sendNotFound(reply, "Purchase order not found");

    return sendSuccess(reply, order);
  } catch (error: any) {
    console.error("getPurchaseOrder error", error);
    return sendError(reply, "Failed to retrieve purchase order", 500);
  }
};

interface CreatePurchaseOrderBody {
  supplierId: string;
  orderedAt?: string;
  expectedDeliveryAt?: string;
  initialNote?: string;
  items: Array<{ inventoryItemId: string; quantity: number }>;
}

const createPurchaseOrder: RouteHandlerMethod = async (request, reply) => {
  try {
    const rawBody = request.body as any;
    const data = sanitizeInput<CreatePurchaseOrderBody>(rawBody, {
      allowedFields: [
        "supplierId",
        "orderedAt",
        "expectedDeliveryAt",
        "initialNote",
        "items",
      ],
      trimStrings: true,
      removeEmpty: true,
    });

    const itemsRaw = rawBody?.items;
    const items: Array<{ inventoryItemId: string; quantity: number }> =
      Array.isArray(itemsRaw)
        ? itemsRaw
            .map((row: any) => ({
              inventoryItemId:
                typeof row?.inventoryItemId === "string"
                  ? row.inventoryItemId
                  : undefined,
              quantity:
                typeof row?.quantity === "number"
                  ? row.quantity
                  : typeof row?.quantity === "string"
                    ? parseInt(row.quantity, 10)
                    : undefined,
            }))
            .filter(
              (r: any) => r.inventoryItemId && typeof r.quantity === "number",
            )
        : [];

    if (!data.supplierId) {
      return sendValidationError(reply, {
        supplierId: ["Supplier is required"],
      });
    }

    if (items.length === 0) {
      return sendValidationError(reply, {
        items: ["At least one stock item is required"],
      });
    }

    for (const it of items) {
      if (!it.inventoryItemId) {
        return sendValidationError(reply, {
          items: ["All line items must include a stock item"],
        });
      }
      if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
        return sendValidationError(reply, {
          items: ["All line item quantities must be greater than zero"],
        });
      }
    }

    const userId = (request.user as any)?.id ?? (request.user as any)?.sub;
    if (!userId) return sendError(reply, "Unauthorized", 401);

    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
    });
    if (!supplier) return sendNotFound(reply, "Supplier not found");

    const orderedAt = data.orderedAt ? new Date(data.orderedAt) : new Date();
    if (Number.isNaN(orderedAt.getTime())) {
      return sendValidationError(reply, {
        orderedAt: ["Invalid orderedAt"],
      });
    }

    const expectedDeliveryAt = data.expectedDeliveryAt
      ? new Date(data.expectedDeliveryAt)
      : undefined;
    if (
      data.expectedDeliveryAt &&
      Number.isNaN(expectedDeliveryAt!.getTime())
    ) {
      return sendValidationError(reply, {
        expectedDeliveryAt: ["Invalid expectedDeliveryAt"],
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          supplierId: data.supplierId!,
          orderedAt,
          expectedDeliveryAt,
          createdById: userId,
        },
      });

      await tx.purchaseOrderItem.createMany({
        data: items.map((it) => ({
          purchaseOrderId: order.id,
          inventoryItemId: it.inventoryItemId,
          quantity: it.quantity,
        })),
        skipDuplicates: true,
      });

      if (data.initialNote) {
        await tx.purchaseOrderNote.create({
          data: {
            purchaseOrderId: order.id,
            note: data.initialNote,
            createdById: userId,
          },
        });
      }

      return tx.purchaseOrder.findUnique({
        where: { id: order.id },
        include: {
          supplier: true,
          items: {
            include: { inventoryItem: true },
            orderBy: [{ createdAt: "asc" }],
          },
          notes: {
            include: { createdBy: true },
            orderBy: [{ createdAt: "asc" }],
          },
        },
      });
    });

    if (!created)
      return sendError(reply, "Failed to create purchase order", 500);

    return sendSuccess(reply, created, "Purchase order created", 201);
  } catch (error: any) {
    console.error("createPurchaseOrder error", error, { body: request.body });
    return sendError(reply, "Failed to create purchase order", 500);
  }
};

interface AddNoteBody {
  note: string;
}

const addPurchaseOrderNote: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) return sendNotFound(reply, "Purchase order not found");

    const data = sanitizeInput<AddNoteBody>(request.body, {
      allowedFields: ["note"],
      trimStrings: true,
      removeEmpty: true,
    });

    if (!data.note) {
      return sendValidationError(reply, { note: ["Note is required"] });
    }

    const userId = (request.user as any)?.id ?? (request.user as any)?.sub;
    if (!userId) return sendError(reply, "Unauthorized", 401);

    const created = await prisma.purchaseOrderNote.create({
      data: {
        purchaseOrderId: id,
        note: data.note,
        createdById: userId,
      },
      include: { createdBy: true },
    });

    return sendSuccess(reply, created, "Note added", 201);
  } catch (error: any) {
    console.error("addPurchaseOrderNote error", error, {
      id: (request.params as any)?.id,
      body: request.body,
    });
    return sendError(reply, "Failed to add note", 500);
  }
};

const markDelivered: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const data = sanitizeInput<any>(request.body, {
      allowedFields: ["deliveredAt"],
      trimStrings: true,
      removeEmpty: true,
    });

    const deliveredAt = data.deliveredAt
      ? new Date(data.deliveredAt)
      : new Date();
    if (data.deliveredAt && Number.isNaN(deliveredAt.getTime())) {
      return sendValidationError(reply, {
        deliveredAt: ["Invalid deliveredAt"],
      });
    }

    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) return sendNotFound(reply, "Purchase order not found");

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: "DELIVERED" as any,
        deliveredAt,
      },
      include: {
        supplier: true,
        _count: { select: { items: true, notes: true } },
      },
    });

    return sendSuccess(reply, updated, "Purchase order marked as delivered");
  } catch (error: any) {
    console.error("markDelivered error", error, { params: request.params });
    return sendError(reply, "Failed to mark delivered", 500);
  }
};

const reschedule: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const data = sanitizeInput<any>(request.body, {
      allowedFields: ["expectedDeliveryAt"],
      trimStrings: true,
      removeEmpty: true,
    });

    if (!data.expectedDeliveryAt) {
      return sendValidationError(reply, {
        expectedDeliveryAt: ["Expected delivery date/time is required"],
      });
    }

    const expectedDeliveryAt = new Date(data.expectedDeliveryAt);
    if (Number.isNaN(expectedDeliveryAt.getTime())) {
      return sendValidationError(reply, {
        expectedDeliveryAt: ["Invalid expectedDeliveryAt"],
      });
    }

    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) return sendNotFound(reply, "Purchase order not found");

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: "RESCHEDULED" as any,
        expectedDeliveryAt,
      },
      include: {
        supplier: true,
        _count: { select: { items: true, notes: true } },
      },
    });

    return sendSuccess(reply, updated, "Purchase order rescheduled");
  } catch (error: any) {
    console.error("reschedule error", error, { params: request.params });
    return sendError(reply, "Failed to reschedule", 500);
  }
};

const cancel: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const data = sanitizeInput<any>(request.body, {
      allowedFields: ["reason"],
      trimStrings: true,
      removeEmpty: true,
    });

    if (!data.reason) {
      return sendValidationError(reply, {
        reason: ["Cancellation reason is required"],
      });
    }

    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) return sendNotFound(reply, "Purchase order not found");

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: "CANCELLED" as any,
        cancelledAt: new Date(),
        cancelReason: data.reason,
      },
      include: {
        supplier: true,
        _count: { select: { items: true, notes: true } },
      },
    });

    return sendSuccess(reply, updated, "Purchase order cancelled");
  } catch (error: any) {
    console.error("cancel error", error, { params: request.params });
    return sendError(reply, "Failed to cancel", 500);
  }
};

export async function purchaseOrderRoutes(server: FastifyInstance) {
  server.get(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:VIEW"),
    },
    listPurchaseOrders,
  );

  server.get(
    "/:id",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:VIEW"),
    },
    getPurchaseOrder,
  );

  server.post(
    "/",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:MANAGE"),
    },
    createPurchaseOrder,
  );

  server.post(
    "/:id/notes",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:MANAGE"),
    },
    addPurchaseOrderNote,
  );

  server.post(
    "/:id/mark-delivered",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:MANAGE"),
    },
    markDelivered,
  );

  server.post(
    "/:id/reschedule",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:MANAGE"),
    },
    reschedule,
  );

  server.post(
    "/:id/cancel",
    {
      onRequest: requireAuthCookie(server),
      preHandler: requirePermissions("INVENTORY:MANAGE"),
    },
    cancel,
  );
}
