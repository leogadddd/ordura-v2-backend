import { prisma } from "../lib/prisma";

async function verify() {
  console.log("🔍 Verifying Orders → SalesTransaction migration");

  const [ordersCount, salesCount] = await Promise.all([
    prisma.order.count(),
    prisma.salesTransaction.count(),
  ]);

  const [ordersSum, salesSum] = await Promise.all([
    prisma.order.aggregate({ _sum: { grandTotal: true } }),
    prisma.salesTransaction.aggregate({ _sum: { grandTotal: true } }),
  ]);

  console.log(
    `Orders count: ${ordersCount}, SalesTransactions count: ${salesCount}`
  );
  console.log(
    `Orders grandTotal sum: ${ordersSum._sum.grandTotal}, Sales grandTotal sum: ${salesSum._sum.grandTotal}`
  );

  const paymentsLinked = await prisma.payment.count({
    where: { NOT: { salesTransactionId: null } },
  });
  console.log(`Payments linked to SalesTransaction: ${paymentsLinked}`);

  process.exit(0);
}

verify().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});
