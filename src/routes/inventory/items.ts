import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import {
  sendConflict,
  sendError,
  sendNotFound,
  sendSuccess,
  sendValidationError,
} from "../../lib/response";
import { sanitizeInput } from "../../util/sanitize";

interface ListItemsQuery {
  search?: string;
}

export const listInventoryItems: RouteHandlerMethod = async (
  request,
  reply,
) => {
  try {
    const { search } = request.query as ListItemsQuery;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: { supplier: true },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    });

    const totals = await prisma.inventoryLevel.groupBy({
      by: ["inventoryItemId"],
      _sum: { quantity: true },
      where: {
        inventoryItemId: { in: items.map((i) => i.id) },
      },
    });

    const totalByItemId = new Map<string, number>();
    for (const row of totals) {
      totalByItemId.set(row.inventoryItemId, row._sum.quantity ?? 0);
    }

    const data = items.map((i) => {
      const totalQuantity = totalByItemId.get(i.id) ?? 0;
      const isLowStock =
        i.shouldAlert &&
        typeof i.lowThreshold === "number" &&
        i.lowThreshold >= 0 &&
        totalQuantity <= i.lowThreshold;
      const isOutOfStock = totalQuantity === 0;
      return {
        ...i,
        totalQuantity,
        isLowStock,
        isOutOfStock,
      };
    });

    return sendSuccess(reply, data);
  } catch (error: any) {
    console.error("listInventoryItems error", error);
    return sendError(reply, "Failed to list inventory items", 500);
  }
};

export const getInventoryItem: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: { supplier: true },
    });

    if (!item) return sendNotFound(reply, "Inventory item not found");

    const levels = await prisma.inventoryLevel.findMany({
      where: { inventoryItemId: id },
      include: { location: true },
      orderBy: [{ location: { name: "asc" } }],
    });

    const totalQuantity = levels.reduce((acc, l) => acc + (l.quantity ?? 0), 0);

    return sendSuccess(reply, {
      ...item,
      totalQuantity,
      levels,
    });
  } catch (error: any) {
    console.error("getInventoryItem error", error);
    return sendError(reply, "Failed to retrieve inventory item", 500);
  }
};

interface CreateInventoryItemBody {
  name: string;
  description?: string;
  measurementUnit?: string;
  lowThreshold?: number;
  shouldAlert?: boolean;
  supplierId?: string;

  initialLocationId?: string;
  initialQuantity?: number;
  initialReason?: string;
}

export const createInventoryItem: RouteHandlerMethod = async (
  request,
  reply,
) => {
  try {
    const body = request.body as any;

    const data = sanitizeInput<CreateInventoryItemBody>(body, {
      allowedFields: [
        "name",
        "description",
        "measurementUnit",
        "lowThreshold",
        "shouldAlert",
        "supplierId",
        "initialLocationId",
        "initialQuantity",
        "initialReason",
      ],
      trimStrings: true,
      removeEmpty: true,
      parseIntegers: ["lowThreshold", "initialQuantity"],
      parseNumbers: ["lowThreshold", "initialQuantity"],
      parseBooleans: ["shouldAlert"],
    });

    if (!data.name) {
      return sendValidationError(reply, { name: ["Name is required"] });
    }

    if (
      data.lowThreshold !== undefined &&
      data.lowThreshold !== null &&
      data.lowThreshold < 0
    ) {
      return sendValidationError(reply, {
        lowThreshold: ["Low threshold cannot be negative"],
      });
    }

    const initialQuantity = data.initialQuantity ?? 0;
    if (initialQuantity < 0) {
      return sendValidationError(reply, {
        initialQuantity: ["Initial quantity cannot be negative"],
      });
    }

    const userId = (request.user as any)?.id ?? (request.user as any)?.sub;
    if (!userId) return sendError(reply, "Unauthorized", 401);

    if (data.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: data.supplierId },
      });
      if (!supplier) return sendNotFound(reply, "Supplier not found");
    }

    const existing = await prisma.inventoryItem.findFirst({
      where: { name: { equals: data.name, mode: "insensitive" } },
    });
    if (existing) {
      return sendConflict(
        reply,
        "Inventory item with this name already exists",
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          name: data.name!,
          description: data.description,
          measurementUnit: (data.measurementUnit as any) ?? undefined,
          lowThreshold: data.lowThreshold,
          shouldAlert: data.shouldAlert ?? true,
          supplierId: data.supplierId,
        },
        include: { supplier: true },
      });

      if (data.initialLocationId) {
        const location = await tx.location.findUnique({
          where: { id: data.initialLocationId },
        });
        if (!location) throw new Error("Location not found");

        const level = await tx.inventoryLevel.create({
          data: {
            inventoryItemId: item.id,
            locationId: data.initialLocationId,
            quantity: initialQuantity,
          },
        });

        if (initialQuantity !== 0) {
          await tx.inventoryLevelAdjustment.create({
            data: {
              inventoryLevelId: level.id,
              quantity: initialQuantity,
              reason: data.initialReason || "Initial stock",
              createdById: userId,
            },
          });
        }
      }

      return item;
    });

    return sendSuccess(reply, created, "Inventory item created", 201);
  } catch (error: any) {
    if (String(error?.message || "").includes("Location not found")) {
      return sendNotFound(reply, "Location not found");
    }
    console.error("createInventoryItem error", error, { body: request.body });
    return sendError(reply, "Failed to create inventory item", 500);
  }
};

interface UpdateInventoryItemBody {
  name?: string;
  description?: string;
  measurementUnit?: string;
  lowThreshold?: number;
  shouldAlert?: boolean;
  supplierId?: string | null;
}

export const updateInventoryItem: RouteHandlerMethod = async (
  request,
  reply,
) => {
  try {
    const { id } = request.params as { id: string };

    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) return sendNotFound(reply, "Inventory item not found");

    const data = sanitizeInput<UpdateInventoryItemBody>(request.body, {
      allowedFields: [
        "name",
        "description",
        "measurementUnit",
        "lowThreshold",
        "shouldAlert",
        "supplierId",
      ],
      trimStrings: true,
      removeEmpty: false,
      parseIntegers: ["lowThreshold"],
      parseNumbers: ["lowThreshold"],
      parseBooleans: ["shouldAlert"],
    });

    if (data.name !== undefined && !String(data.name).trim()) {
      return sendValidationError(reply, { name: ["Name is required"] });
    }

    if (
      data.lowThreshold !== undefined &&
      data.lowThreshold !== null &&
      data.lowThreshold < 0
    ) {
      return sendValidationError(reply, {
        lowThreshold: ["Low threshold cannot be negative"],
      });
    }

    if (data.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: String(data.supplierId) },
      });
      if (!supplier) return sendNotFound(reply, "Supplier not found");
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: data.name !== undefined ? String(data.name).trim() : undefined,
        description:
          data.description !== undefined
            ? (data.description as any)
            : undefined,
        measurementUnit:
          data.measurementUnit !== undefined
            ? ((data.measurementUnit as any) ?? undefined)
            : undefined,
        lowThreshold:
          data.lowThreshold !== undefined
            ? (data.lowThreshold as any)
            : undefined,
        shouldAlert:
          data.shouldAlert !== undefined
            ? (data.shouldAlert as any)
            : undefined,
        supplierId: data.supplierId === null ? null : (data.supplierId as any),
      },
      include: { supplier: true },
    });

    return sendSuccess(reply, updated, "Inventory item updated");
  } catch (error: any) {
    console.error("updateInventoryItem error", error, {
      id: (request.params as any)?.id,
      body: request.body,
    });
    return sendError(reply, "Failed to update inventory item", 500);
  }
};

export const deleteInventoryItem: RouteHandlerMethod = async (
  request,
  reply,
) => {
  try {
    const { id } = request.params as { id: string };

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
      include: { supplier: true },
    });

    if (!existing) return sendNotFound(reply, "Inventory item not found");

    await prisma.inventoryItem.delete({ where: { id } });

    return sendSuccess(reply, existing, "Inventory item deleted");
  } catch (error: any) {
    console.error("deleteInventoryItem error", error, {
      id: (request.params as any)?.id,
    });
    return sendError(reply, "Failed to delete inventory item", 500);
  }
};

interface AdjustInventoryBody {
  inventoryItemId: string;
  locationId: string;
  quantity: number;
  reason: string;
}

export const adjustInventoryLevel: RouteHandlerMethod = async (
  request,
  reply,
) => {
  try {
    const data = sanitizeInput<AdjustInventoryBody>(request.body, {
      allowedFields: ["inventoryItemId", "locationId", "quantity", "reason"],
      trimStrings: true,
      removeEmpty: true,
      parseIntegers: ["quantity"],
      parseNumbers: ["quantity"],
    });

    if (!data.inventoryItemId || !data.locationId) {
      return sendValidationError(reply, {
        fields: ["inventoryItemId", "locationId"],
      });
    }

    if (typeof data.quantity !== "number" || Number.isNaN(data.quantity)) {
      return sendValidationError(reply, {
        quantity: ["Quantity is required"],
      });
    }

    if (data.quantity === 0) {
      return sendValidationError(reply, {
        quantity: ["Quantity cannot be zero"],
      });
    }

    if (!data.reason) {
      return sendValidationError(reply, {
        reason: ["Reason is required"],
      });
    }

    const userId = (request.user as any)?.id ?? (request.user as any)?.sub;
    if (!userId) return sendError(reply, "Unauthorized", 401);

    const [item, location] = await Promise.all([
      prisma.inventoryItem.findUnique({ where: { id: data.inventoryItemId } }),
      prisma.location.findUnique({ where: { id: data.locationId } }),
    ]);

    if (!item) return sendNotFound(reply, "Inventory item not found");
    if (!location) return sendNotFound(reply, "Location not found");

    const result = await prisma.$transaction(async (tx) => {
      let level = await tx.inventoryLevel.findUnique({
        where: {
          inventoryItemId_locationId: {
            inventoryItemId: data.inventoryItemId!,
            locationId: data.locationId!,
          },
        },
      });

      if (!level) {
        level = await tx.inventoryLevel.create({
          data: {
            inventoryItemId: data.inventoryItemId!,
            locationId: data.locationId!,
            quantity: 0,
          },
        });
      }

      const newQty = level.quantity + (data.quantity as number);
      if (newQty < 0) {
        // For now, prevent negative quantities (can be relaxed later)
        throw new Error("Insufficient stock");
      }

      const adj = await tx.inventoryLevelAdjustment.create({
        data: {
          inventoryLevelId: level.id,
          quantity: data.quantity as number,
          reason: data.reason!,
          createdById: userId,
        },
      });

      const updated = await tx.inventoryLevel.update({
        where: { id: level.id },
        data: { quantity: newQty },
        include: { location: true },
      });

      return { adjustment: adj, level: updated };
    });

    return sendSuccess(reply, result, "Inventory adjusted");
  } catch (error: any) {
    if (String(error?.message || "").includes("Insufficient stock")) {
      return sendValidationError(reply, {
        quantity: ["Adjustment would make quantity negative"],
      });
    }
    console.error("adjustInventoryLevel error", error, { body: request.body });
    return sendError(reply, "Failed to adjust inventory", 500);
  }
};

export const listInventoryLevels: RouteHandlerMethod = async (
  request,
  reply,
) => {
  try {
    const { id } = request.params as { id: string };

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) return sendNotFound(reply, "Inventory item not found");

    const levels = await prisma.inventoryLevel.findMany({
      where: { inventoryItemId: id },
      include: { location: true },
      orderBy: [{ location: { name: "asc" } }],
    });

    return sendSuccess(reply, levels);
  } catch (error: any) {
    console.error("listInventoryLevels error", error);
    return sendError(reply, "Failed to list inventory levels", 500);
  }
};
