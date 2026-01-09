/*
  Warnings:

  - You are about to drop the column `type` on the `Fulfillment` table. All the data in the column will be lost.
  - You are about to drop the column `fulfillmentType` on the `Product` table. All the data in the column will be lost.
  - Added the required column `fulfillmentTypeId` to the `Fulfillment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Fulfillment_type_idx";

-- AlterTable
ALTER TABLE "Fulfillment" DROP COLUMN "type",
ADD COLUMN     "fulfillmentTypeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "fulfillmentType",
ADD COLUMN     "fulfillmentTypeId" TEXT;

-- DropEnum
DROP TYPE "FulfillmentType";

-- CreateTable
CREATE TABLE "FulfillmentType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentType_code_key" ON "FulfillmentType"("code");

-- CreateIndex
CREATE INDEX "FulfillmentType_isActive_idx" ON "FulfillmentType"("isActive");

-- CreateIndex
CREATE INDEX "FulfillmentType_sortOrder_idx" ON "FulfillmentType"("sortOrder");

-- CreateIndex
CREATE INDEX "Fulfillment_fulfillmentTypeId_idx" ON "Fulfillment"("fulfillmentTypeId");

-- CreateIndex
CREATE INDEX "Product_fulfillmentTypeId_idx" ON "Product"("fulfillmentTypeId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_fulfillmentTypeId_fkey" FOREIGN KEY ("fulfillmentTypeId") REFERENCES "FulfillmentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_fulfillmentTypeId_fkey" FOREIGN KEY ("fulfillmentTypeId") REFERENCES "FulfillmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
