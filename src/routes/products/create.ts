import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { generateSKU, generateId } from "../../util/id-generation";
import {
  sendSuccess,
  sendValidationError,
  sendError,
} from "../../lib/response";
import { sanitizeInput } from "../../util/sanitize";

interface CreateProductBody {
  name: string;
  category: string;
  description?: string;
  notes?: string;
  reorderPoint?: number;
  cost: number;
  sellingPrice: number;
  isDraft?: boolean;
  requiresFulfillment?: boolean;
  fulfillmentTypeId?: string;
}

export const createProduct: RouteHandlerMethod = async (request, reply) => {
  try {
    const {
      name,
      category,
      description,
      notes,
      reorderPoint,
      cost,
      sellingPrice,
      isDraft = false,
      requiresFulfillment = false,
      fulfillmentTypeId,
    } = sanitizeInput<CreateProductBody>(request.body, {
      allowedFields: [
        "name",
        "category",
        "description",
        "notes",
        "reorderPoint",
        "cost",
        "sellingPrice",
        "isDraft",
        "requiresFulfillment",
        "fulfillmentTypeId",
      ],
      trimStrings: true,
      removeEmpty: true,
      parseNumbers: ["reorderPoint", "cost", "sellingPrice"],
      parseBooleans: ["isDraft", "requiresFulfillment"],
    });

    // Validate required fields
    if (
      !name ||
      !category ||
      cost === undefined ||
      sellingPrice === undefined
    ) {
      return sendValidationError(reply, {
        fields: ["name, category, cost, sellingPrice"],
      });
    }

    // Validate prices
    if (cost < 0 || sellingPrice < 0) {
      return sendValidationError(reply, {
        price: ["Cost and selling price must be positive numbers"],
      });
    }

    if (reorderPoint !== undefined && reorderPoint < 0) {
      return sendValidationError(reply, {
        reorderPoint: ["Reorder point must be a non-negative number"],
      });
    }

    // Generate unique SKU
    const sku = await generateSKU(category);

    // Generate sequential ID
    const lastProduct = await prisma.product.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });

    let nextNumber = 1;
    if (lastProduct) {
      // Extract the numeric part from the last ID (e.g., "P000005" -> 5)
      const lastNumber = parseInt(lastProduct.id.substring(1), 10);
      nextNumber = lastNumber + 1;
    }

    const id = generateId("P", nextNumber);

    // Create product
    const product = await prisma.product.create({
      data: {
        id,
        sku,
        name,
        category,
        description,
        notes,
        reorderPoint,
        cost,
        sellingPrice,
        status: "ACTIVE",
        isDraft,
        requiresFulfillment,
        fulfillmentTypeId: requiresFulfillment ? fulfillmentTypeId : null,
      },
    });

    return sendSuccess(reply, product, "Product created successfully", 201);
  } catch (error: any) {
    console.error("Create product error:", error, {
      body: request.body,
      user: request.user,
    });
    return sendError(reply, "Failed to create product", 500);
  }
};
