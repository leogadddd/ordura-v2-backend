import { prisma } from "../../lib/prisma";

export interface ProductIngredientInput {
  inventoryItemId: string;
  quantity: number;
}

export function normalizeProductIngredients(
  rawIngredients: unknown,
): {
  ingredients: ProductIngredientInput[];
  errors?: Record<string, string[]>;
} {
  if (rawIngredients === undefined) return { ingredients: [] };

  if (!Array.isArray(rawIngredients)) {
    return {
      ingredients: [],
      errors: { ingredients: ["Ingredients must be a list"] },
    };
  }

  const ingredients: ProductIngredientInput[] = [];
  const seen = new Set<string>();

  for (const [index, row] of rawIngredients.entries()) {
    const ingredient = row as any;
    const inventoryItemId =
      typeof ingredient?.inventoryItemId === "string"
        ? ingredient.inventoryItemId.trim()
        : "";
    const quantity =
      typeof ingredient?.quantity === "number"
        ? ingredient.quantity
        : typeof ingredient?.quantity === "string"
          ? parseInt(ingredient.quantity, 10)
          : NaN;

    if (!inventoryItemId) {
      return {
        ingredients: [],
        errors: {
          ingredients: [`Ingredient row ${index + 1} is missing an item`],
        },
      };
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        ingredients: [],
        errors: {
          ingredients: [
            `Ingredient row ${index + 1} must have a positive whole quantity`,
          ],
        },
      };
    }

    if (seen.has(inventoryItemId)) {
      return {
        ingredients: [],
        errors: { ingredients: ["Duplicate ingredients are not allowed"] },
      };
    }

    seen.add(inventoryItemId);
    ingredients.push({ inventoryItemId, quantity });
  }

  return { ingredients };
}

export async function validateInventoryItemsExist(
  ingredients: ProductIngredientInput[],
): Promise<Record<string, string[]> | undefined> {
  if (ingredients.length === 0) return undefined;

  const ids = ingredients.map((ingredient) => ingredient.inventoryItemId);
  const count = await prisma.inventoryItem.count({
    where: { id: { in: ids } },
  });

  if (count !== ids.length) {
    return { ingredients: ["One or more ingredients no longer exist"] };
  }

  return undefined;
}

export function productIngredientInclude() {
  return {
    ingredients: {
      include: {
        inventoryItem: true,
      },
      orderBy: [{ createdAt: "asc" as const }],
    },
  };
}
