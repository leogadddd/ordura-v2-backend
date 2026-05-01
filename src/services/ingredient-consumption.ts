type OrderItemForIngredientConsumption = {
  productId?: string | null;
  quantity: number;
  name?: string;
};

type IngredientDemand = {
  inventoryItemId: string;
  ingredientName: string;
  measurementUnit: string;
  requiredQuantity: number;
};

export class IngredientConsumptionError extends Error {
  errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>) {
    super("Insufficient ingredients");
    this.name = "IngredientConsumptionError";
    this.errors = errors;
  }
}

function formatUnit(unit: string) {
  switch (unit) {
    case "ML":
      return "ml";
    case "L":
      return "L";
    case "OZ":
      return "oz";
    case "G":
      return "g";
    case "KG":
      return "kg";
    default:
      return "pc";
  }
}

async function getIngredientDemand(
  tx: any,
  orderItems: OrderItemForIngredientConsumption[],
): Promise<IngredientDemand[]> {
  const productQuantities = new Map<string, number>();

  for (const item of orderItems) {
    if (!item.productId) continue;
    productQuantities.set(
      item.productId,
      (productQuantities.get(item.productId) ?? 0) + item.quantity,
    );
  }

  const productIds = Array.from(productQuantities.keys());
  if (productIds.length === 0) return [];

  const recipes = await tx.productIngredient.findMany({
    where: { productId: { in: productIds } },
    include: {
      inventoryItem: true,
    },
  });

  const demandByIngredient = new Map<string, IngredientDemand>();

  for (const recipe of recipes) {
    const soldQuantity = productQuantities.get(recipe.productId) ?? 0;
    const requiredQuantity = recipe.quantity * soldQuantity;
    if (requiredQuantity <= 0) continue;

    const existing = demandByIngredient.get(recipe.inventoryItemId);
    if (existing) {
      existing.requiredQuantity += requiredQuantity;
    } else {
      demandByIngredient.set(recipe.inventoryItemId, {
        inventoryItemId: recipe.inventoryItemId,
        ingredientName: recipe.inventoryItem.name,
        measurementUnit: recipe.inventoryItem.measurementUnit,
        requiredQuantity,
      });
    }
  }

  return Array.from(demandByIngredient.values());
}

export async function consumeIngredientsForOrder(
  tx: any,
  orderItems: OrderItemForIngredientConsumption[],
  userId: string,
  reason: string,
) {
  const demands = await getIngredientDemand(tx, orderItems);
  if (demands.length === 0) return;

  const levels = await tx.inventoryLevel.findMany({
    where: {
      inventoryItemId: {
        in: demands.map((demand) => demand.inventoryItemId),
      },
      quantity: { gt: 0 },
    },
    orderBy: [{ quantity: "desc" }],
  });

  const levelsByIngredient = new Map<string, typeof levels>();
  for (const level of levels) {
    const existing = levelsByIngredient.get(level.inventoryItemId) ?? [];
    existing.push(level);
    levelsByIngredient.set(level.inventoryItemId, existing);
  }

  const errors: string[] = [];
  for (const demand of demands) {
    const available = (levelsByIngredient.get(demand.inventoryItemId) ?? [])
      .map((level: any) => level.quantity)
      .reduce((sum: number, quantity: number) => sum + quantity, 0);

    if (available < demand.requiredQuantity) {
      errors.push(
        `${demand.ingredientName}: need ${demand.requiredQuantity} ${formatUnit(
          demand.measurementUnit,
        )}, available ${available}`,
      );
    }
  }

  if (errors.length > 0) {
    throw new IngredientConsumptionError({ ingredients: errors });
  }

  for (const demand of demands) {
    let remaining = demand.requiredQuantity;
    const ingredientLevels = levelsByIngredient.get(demand.inventoryItemId) ?? [];

    for (const level of ingredientLevels) {
      if (remaining <= 0) break;

      const consumedQuantity = Math.min(level.quantity, remaining);
      remaining -= consumedQuantity;

      await tx.inventoryLevelAdjustment.create({
        data: {
          inventoryLevelId: level.id,
          quantity: -consumedQuantity,
          reason,
          createdById: userId,
        },
      });

      await tx.inventoryLevel.update({
        where: { id: level.id },
        data: { quantity: level.quantity - consumedQuantity },
      });
    }
  }
}
