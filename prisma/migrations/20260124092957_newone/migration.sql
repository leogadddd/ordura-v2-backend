-- AddForeignKey
ALTER TABLE "SalesTransactions" ADD CONSTRAINT "SalesTransactions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CommonUsers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionItems" ADD CONSTRAINT "TransactionItems_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "SalesTransactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
