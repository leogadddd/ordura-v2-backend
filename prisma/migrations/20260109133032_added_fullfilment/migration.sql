-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('COOKING', 'ASSEMBLY', 'QUALITY_CHECK', 'PACKAGING', 'CUSTOM');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "fulfillmentType" "FulfillmentType",
ADD COLUMN     "requiresFulfillment" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Fulfillment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "FulfillmentType" NOT NULL,
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "estimatedCompletionAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fulfillment_orderId_idx" ON "Fulfillment"("orderId");

-- CreateIndex
CREATE INDEX "Fulfillment_status_idx" ON "Fulfillment"("status");

-- CreateIndex
CREATE INDEX "Fulfillment_type_idx" ON "Fulfillment"("type");

-- CreateIndex
CREATE INDEX "Fulfillment_assignedTo_idx" ON "Fulfillment"("assignedTo");

-- CreateIndex
CREATE INDEX "Fulfillment_createdAt_idx" ON "Fulfillment"("createdAt");

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
