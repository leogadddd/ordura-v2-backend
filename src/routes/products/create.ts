import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { generateSKU, generateId } from "../../util/id-generation";
import {
  sendSuccess,
  sendValidationError,
  sendError,
} from "../../lib/response";
import { sanitizeInput } from "../../util/sanitize";
import {
  normalizeProductIngredients,
  productIngredientInclude,
  validateInventoryItemsExist,
} from "./ingredients";

interface CreateProductBody {
  name: string;
  category: string;
  description?: string;
  notes?: string;
  cost: number;
  sellingPrice: number;
  isDraft?: boolean;
  requiresFulfillment?: boolean;
  fulfillmentTypeId?: string;
  ingredients?: unknown;
}

export const createProduct: RouteHandlerMethod = async (request, reply) => {
  try {
    const rawBody = request.body as any;
    const {
      name,
      category,
      description,
      notes,
      cost,
      sellingPrice,
      isDraft = false,
      requiresFulfillment = false,
      fulfillmentTypeId,
    } = sanitizeInput<CreateProductBody>(rawBody, {
      allowedFields: [
        "name",
        "category",
        "description",
        "notes",
        "cost",
        "sellingPrice",
        "isDraft",
        "requiresFulfillment",
        "fulfillmentTypeId",
        "ingredients",
      ],
      trimStrings: true,
      removeEmpty: true,
      parseNumbers: ["cost", "sellingPrice"],
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

    const normalizedIngredients = normalizeProductIngredients(
      rawBody?.ingredients,
    );
    if (normalizedIngredients.errors) {
      return sendValidationError(reply, normalizedIngredients.errors);
    }

    const ingredientErrors = await validateInventoryItemsExist(
      normalizedIngredients.ingredients,
    );
    if (ingredientErrors) {
      return sendValidationError(reply, ingredientErrors);
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
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          id,
          sku,
          name,
          category,
          description,
          notes,
          cost,
          sellingPrice,
          status: "ACTIVE",
          isDraft,
          requiresFulfillment,
          fulfillmentTypeId: requiresFulfillment ? fulfillmentTypeId : null,
          ingredients:
            normalizedIngredients.ingredients.length > 0
              ? {
                  create: normalizedIngredients.ingredients.map(
                    (ingredient) => ({
                      inventoryItemId: ingredient.inventoryItemId,
                      quantity: ingredient.quantity,
                    }),
                  ),
                }
              : undefined,
        },
        include: productIngredientInclude(),
      });

      return created;
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
