-- CreateTable
CREATE TABLE "ProductIngredient" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductIngredient_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Product" DROP COLUMN IF EXISTS "reorderPoint";

-- Drop legacy product-stock tables. Ingredient stock now lives in
-- InventoryItem / InventoryLevel / InventoryLevelAdjustment.
DROP TABLE IF EXISTS "InventoryAdjustment";
DROP TABLE IF EXISTS "Stock";

-- CreateIndex
CREATE INDEX "ProductIngredient_productId_idx" ON "ProductIngredient"("productId");

-- CreateIndex
CREATE INDEX "ProductIngredient_inventoryItemId_idx" ON "ProductIngredient"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductIngredient_productId_inventoryItemId_key" ON "ProductIngredient"("productId", "inventoryItemId");

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
