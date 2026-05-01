import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import {
  sendSuccess,
  sendNotFound,
  sendValidationError,
  sendError,
} from "../../lib/response";
import { sanitizeInput } from "../../util/sanitize";
import {
  normalizeProductIngredients,
  productIngredientInclude,
  validateInventoryItemsExist,
} from "./ingredients";

interface UpdateProductBody {
  name?: string;
  category?: string;
  description?: string;
  notes?: string;
  cost?: number;
  sellingPrice?: number;
  status?: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
  isDraft?: boolean;
  requiresFulfillment?: boolean;
  fulfillmentTypeId?: string | null;
  ingredients?: unknown;
}

interface UpdateProductParams {
  id: string;
}

export const updateProduct: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as UpdateProductParams;
    const rawBody = request.body as any;
    const updateData = sanitizeInput<UpdateProductBody>(rawBody, {
      allowedFields: [
        "name",
        "category",
        "description",
        "notes",
        "cost",
        "sellingPrice",
        "status",
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

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return sendNotFound(reply, "Product not found");
    }

    // Validate prices if provided
    if (
      (updateData.cost !== undefined && updateData.cost < 0) ||
      (updateData.sellingPrice !== undefined && updateData.sellingPrice < 0)
    ) {
      return sendValidationError(reply, {
        price: ["Cost and selling price must be positive numbers"],
      });
    }

    // Normalize fulfillment fields
    if (updateData.requiresFulfillment === false) {
      updateData.fulfillmentTypeId = null;
    }

    const shouldUpdateIngredients = rawBody?.ingredients !== undefined;
    const normalizedIngredients = normalizeProductIngredients(
      rawBody?.ingredients,
    );
    if (shouldUpdateIngredients && normalizedIngredients.errors) {
      return sendValidationError(reply, normalizedIngredients.errors);
    }

    if (shouldUpdateIngredients) {
      const ingredientErrors = await validateInventoryItemsExist(
        normalizedIngredients.ingredients,
      );
      if (ingredientErrors) {
        return sendValidationError(reply, ingredientErrors);
      }
    }

    delete (updateData as any).ingredients;

    // Update product
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: updateData,
        include: productIngredientInclude(),
      });

      if (shouldUpdateIngredients) {
        await tx.productIngredient.deleteMany({ where: { productId: id } });

        if (normalizedIngredients.ingredients.length > 0) {
          await tx.productIngredient.createMany({
            data: normalizedIngredients.ingredients.map((ingredient) => ({
              productId: id,
              inventoryItemId: ingredient.inventoryItemId,
              quantity: ingredient.quantity,
            })),
          });
        }

        return tx.product.findUnique({
          where: { id },
          include: productIngredientInclude(),
        });
      }

      return updated;
    });

    return sendSuccess(reply, product, "Product updated successfully");
  } catch (error: any) {
    console.error("Update product error:", error, {
      id: (request.params as any)?.id,
      body: request.body,
      user: request.user,
    });
    return sendError(reply, "Failed to update product", 500);
  }
};
