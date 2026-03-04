-- Create Location table
CREATE TABLE "Location" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "Location_name_idx" ON "Location" (name);

-- Create Stock table
CREATE TABLE "Stock" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" TEXT NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  "locationId" TEXT NOT NULL REFERENCES "Location"(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX "Stock_productId_locationId_key" ON "Stock" ("productId","locationId");
CREATE INDEX "Stock_productId_idx" ON "Stock" ("productId");
CREATE INDEX "Stock_locationId_idx" ON "Stock" ("locationId");

-- Create InventoryAdjustment table
CREATE TABLE "InventoryAdjustment" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "stockId" TEXT NOT NULL REFERENCES "Stock"(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  "createdById" TEXT NOT NULL REFERENCES "CommonUsers"(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "InventoryAdjustment_stockId_idx" ON "InventoryAdjustment" ("stockId");
CREATE INDEX "InventoryAdjustment_createdById_idx" ON "InventoryAdjustment" ("createdById");
