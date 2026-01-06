import { prisma } from "./prisma";

/**
 * Generate a unique SKU for a product
 * Format: CATEGORY-TIMESTAMP-RANDOM
 * Example: BEV-20260104-A3F7
 */
export async function generateSKU(category: string): Promise<string> {
  const categoryPrefix = category
    .substring(0, 3)
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  const sku = `${categoryPrefix}-${timestamp}-${random}`;

  // Ensure uniqueness
  const existing = await prisma.product.findUnique({
    where: { sku },
  });

  // If SKU exists (very unlikely), recursively generate a new one
  if (existing) {
    return generateSKU(category);
  }

  return sku;
}

/**
 * Generate a formatted ID with prefix and padded number
 * Format: PREFIX + 6-digit number (e.g., P000001)
 */
export function generateId(prefix: string, number: number): string {
  return `${prefix}${number.toString().padStart(6, "0")}`;
}
