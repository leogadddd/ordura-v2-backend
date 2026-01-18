-- CreateTable
CREATE TABLE "SalesTransactions" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "type" "OrderType" NOT NULL DEFAULT 'SALE',
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "taxMode" "TaxMode" NOT NULL DEFAULT 'EXCLUSIVE',
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "orderDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "serviceFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(12,2) NOT NULL,
    "paidTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "changeDue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "SalesTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionItems" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "productId" TEXT,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2),
    "quantity" DECIMAL(12,3) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,4),
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesTransactions_transactionNumber_key" ON "SalesTransactions"("transactionNumber");

-- CreateIndex
CREATE INDEX "SalesTransactions_status_idx" ON "SalesTransactions"("status");

-- CreateIndex
CREATE INDEX "SalesTransactions_employeeId_idx" ON "SalesTransactions"("employeeId");

-- CreateIndex
CREATE INDEX "SalesTransactions_createdAt_idx" ON "SalesTransactions"("createdAt");

-- CreateIndex
CREATE INDEX "TransactionItems_transactionId_idx" ON "TransactionItems"("transactionId");

-- AlterTable: Payment - add salesTransactionId
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "salesTransactionId" TEXT;
CREATE INDEX IF NOT EXISTS "Payment_salesTransactionId_idx" ON "Payment"("salesTransactionId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_salesTransactionId_fkey" FOREIGN KEY ("salesTransactionId") REFERENCES "SalesTransactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Fulfillment - add salesTransactionId
ALTER TABLE "Fulfillment" ADD COLUMN IF NOT EXISTS "salesTransactionId" TEXT;
CREATE INDEX IF NOT EXISTS "Fulfillment_salesTransactionId_idx" ON "Fulfillment"("salesTransactionId");
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_salesTransactionId_fkey" FOREIGN KEY ("salesTransactionId") REFERENCES "SalesTransactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
