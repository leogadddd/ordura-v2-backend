-- CreateEnum
CREATE TYPE "CustomerGender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('UNKNOWN', 'MILD', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "CustomerEventType" AS ENUM ('ORDER_CREATED', 'ORDER_COMPLETED', 'ORDER_CANCELLED', 'PAYMENT_RECEIVED', 'PAYMENT_VOIDED', 'REFUND_ISSUED', 'NOTE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerId" TEXT;

-- AlterTable
ALTER TABLE "SalesTransactions" ADD COLUMN     "customerId" TEXT;

-- CreateTable
CREATE TABLE "Customers" (
    "id" TEXT NOT NULL,
    "customerNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "middleName" TEXT,
    "suffix" TEXT,
    "gender" "CustomerGender",
    "dateOfBirth" TIMESTAMP(3),
    "occupation" TEXT,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "alternatePhone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerEmergencyContacts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerEmergencyContacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFoodAllergies" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "severity" "AllergySeverity" NOT NULL DEFAULT 'UNKNOWN',
    "reaction" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFoodAllergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerTags" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerMetrics" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "firstTransactionAt" TIMESTAMP(3),
    "lastTransactionAt" TIMESTAMP(3),
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "salesTransactionsCount" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrdersCount" INTEGER NOT NULL DEFAULT 0,
    "refundsCount" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avgOrderValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerEvents" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "CustomerEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "notes" TEXT,
    "orderId" TEXT,
    "salesTransactionId" TEXT,
    "paymentId" TEXT,
    "createdById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerEvents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customers_customerNumber_key" ON "Customers"("customerNumber");

-- CreateIndex
CREATE INDEX "Customers_displayName_idx" ON "Customers"("displayName");

-- CreateIndex
CREATE INDEX "Customers_email_idx" ON "Customers"("email");

-- CreateIndex
CREATE INDEX "Customers_phone_idx" ON "Customers"("phone");

-- CreateIndex
CREATE INDEX "Customers_isActive_idx" ON "Customers"("isActive");

-- CreateIndex
CREATE INDEX "CustomerEmergencyContacts_customerId_idx" ON "CustomerEmergencyContacts"("customerId");

-- CreateIndex
CREATE INDEX "CustomerEmergencyContacts_name_idx" ON "CustomerEmergencyContacts"("name");

-- CreateIndex
CREATE INDEX "CustomerEmergencyContacts_isPrimary_idx" ON "CustomerEmergencyContacts"("isPrimary");

-- CreateIndex
CREATE INDEX "CustomerFoodAllergies_customerId_idx" ON "CustomerFoodAllergies"("customerId");

-- CreateIndex
CREATE INDEX "CustomerFoodAllergies_allergen_idx" ON "CustomerFoodAllergies"("allergen");

-- CreateIndex
CREATE INDEX "CustomerFoodAllergies_severity_idx" ON "CustomerFoodAllergies"("severity");

-- CreateIndex
CREATE INDEX "CustomerFoodAllergies_isActive_idx" ON "CustomerFoodAllergies"("isActive");

-- CreateIndex
CREATE INDEX "CustomerTags_customerId_idx" ON "CustomerTags"("customerId");

-- CreateIndex
CREATE INDEX "CustomerTags_label_idx" ON "CustomerTags"("label");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTags_customerId_label_key" ON "CustomerTags"("customerId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerMetrics_customerId_key" ON "CustomerMetrics"("customerId");

-- CreateIndex
CREATE INDEX "CustomerMetrics_lastTransactionAt_idx" ON "CustomerMetrics"("lastTransactionAt");

-- CreateIndex
CREATE INDEX "CustomerEvents_customerId_idx" ON "CustomerEvents"("customerId");

-- CreateIndex
CREATE INDEX "CustomerEvents_customerId_occurredAt_idx" ON "CustomerEvents"("customerId", "occurredAt");

-- CreateIndex
CREATE INDEX "CustomerEvents_type_idx" ON "CustomerEvents"("type");

-- CreateIndex
CREATE INDEX "CustomerEvents_orderId_idx" ON "CustomerEvents"("orderId");

-- CreateIndex
CREATE INDEX "CustomerEvents_salesTransactionId_idx" ON "CustomerEvents"("salesTransactionId");

-- CreateIndex
CREATE INDEX "CustomerEvents_paymentId_idx" ON "CustomerEvents"("paymentId");

-- CreateIndex
CREATE INDEX "CustomerEvents_createdById_idx" ON "CustomerEvents"("createdById");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "SalesTransactions_customerId_idx" ON "SalesTransactions"("customerId");

-- AddForeignKey
ALTER TABLE "CustomerEmergencyContacts" ADD CONSTRAINT "CustomerEmergencyContacts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFoodAllergies" ADD CONSTRAINT "CustomerFoodAllergies_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTags" ADD CONSTRAINT "CustomerTags_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMetrics" ADD CONSTRAINT "CustomerMetrics_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEvents" ADD CONSTRAINT "CustomerEvents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEvents" ADD CONSTRAINT "CustomerEvents_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEvents" ADD CONSTRAINT "CustomerEvents_salesTransactionId_fkey" FOREIGN KEY ("salesTransactionId") REFERENCES "SalesTransactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEvents" ADD CONSTRAINT "CustomerEvents_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEvents" ADD CONSTRAINT "CustomerEvents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "CommonUsers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransactions" ADD CONSTRAINT "SalesTransactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
