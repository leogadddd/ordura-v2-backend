import { prisma } from "../lib/prisma";

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

/**
 * Generate a per-day order number in the form ORD-YYYYMMDD-NNN where NNN
 * is a daily incrementing counter. This uses an `order_counters` table with
 * INSERT ... ON CONFLICT DO UPDATE to atomically increment and return the
 * next value without complex logic.
 */
export async function generateOrderNumber(dateArg?: Date): Promise<string> {
  const date = (dateArg || new Date())
    .toISOString()
    .split("T")[0]
    .replace(/-/g, "");

  // Ensure the counters table exists (safe to run repeatedly)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS order_counters (
      date TEXT PRIMARY KEY,
      last INT NOT NULL
    );
  `);

  // Atomically insert or increment the counter for the date and return it
  // Use the current max order number for the date when initializing the row
  // so we don't generate values that already exist. The query finds the
  // numeric suffix from existing orderNumber values (ORD-YYYYMMDD-NNN).
  const result: any = await prisma.$queryRaw`
    WITH maxv AS (
      SELECT COALESCE(MAX((regexp_replace("orderNumber", '.*-(\\\d+)$', '\\1'))::int), 0) as max_seq
      FROM "Order"
      WHERE "orderNumber" LIKE ${`ORD-${date}-%`}
    )
    INSERT INTO order_counters(date, last)
    VALUES(${date}, (SELECT max_seq + 1 FROM maxv))
    ON CONFLICT (date)
    DO UPDATE SET last = order_counters.last + 1
    RETURNING last;
  `;

  const seqVal = result?.[0]?.last ?? 1;

  console.debug(`generateOrderNumber: date=${date} seq=${seqVal}`);

  return `ORD-${date}-${String(seqVal).padStart(3, "0")}`;
}
