import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { generateSKU, generateId } from "../../lib/utils";
import {
  sendSuccess,
  sendValidationError,
  sendError,
} from "../../lib/response";

interface CreateProductBody {
  name: string;
  category: string;
  description?: string;
  notes?: string;
  cost: number;
  sellingPrice: number;
  isDraft?: boolean;
}

export const createProduct: RouteHandlerMethod = async (request, reply) => {
  try {
    const {
      name,
      category,
      description,
      notes,
      cost,
      sellingPrice,
      isDraft = false,
    } = request.body as CreateProductBody;

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
        cost,
        sellingPrice,
        status: "ACTIVE",
        isDraft,
      },
    });

    return sendSuccess(reply, product, "Product created successfully", 201);
  } catch (error: any) {
    request.log.error(error);
    return sendError(reply, "Failed to create product", 500);
  }
};
