import { prisma } from "../lib/prisma";

async function migrateOrdersToSales() {
  console.log("🔁 Starting Orders → SalesTransaction migration...");

  const orders = await prisma.order.findMany({ include: { items: true } });
  console.log(`  → Found ${orders.length} orders to migrate`);

  let migrated = 0;
  for (const order of orders) {
    // skip if already migrated
    const exists = await prisma.salesTransaction.findUnique({
      where: { id: order.id },
    });
    if (exists) {
      console.log(`  → Skipping already-migrated order ${order.id}`);
      continue;
    }

    // create sales transaction (preserve id)
    await prisma.salesTransaction.create({
      data: {
        id: order.id,
        transactionNumber: order.orderNumber,
        type: order.type,
        status: order.status,
        taxMode: order.taxMode,
        currency: order.currency,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        subtotal: order.subtotal as any,
        orderDiscount: order.orderDiscount as any,
        discountTotal: order.discountTotal as any,
        serviceFee: order.serviceFee as any,
        deliveryFee: order.deliveryFee as any,
        taxTotal: order.taxTotal as any,
        grandTotal: order.grandTotal as any,
        paidTotal: order.paidTotal as any,
        changeDue: order.changeDue as any,
        dueAmount: order.dueAmount as any,
        notes: order.notes,
        employeeId: order.employeeId,
        createdAt: order.createdAt,
        closedAt: order.closedAt,
      },
    });

    // migrate items
    for (const item of order.items) {
      await prisma.transactionItem.create({
        data: {
          id: item.id,
          transactionId: order.id,
          lineNo: item.lineNo,
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          category: item.category,
          unitPrice: item.unitPrice as any,
          unitCost: item.unitCost as any,
          quantity: item.quantity as any,
          discount: item.discount as any,
          taxRate: item.taxRate as any,
          taxAmount: item.taxAmount as any,
          lineTotal: item.lineTotal as any,
          notes: item.notes,
          createdAt: item.createdAt,
        },
      });
    }

    // attach payments and fulfillments by updating FK to new salesTransactionId
    await prisma.payment.updateMany({
      where: { orderId: order.id },
      data: { salesTransactionId: order.id },
    });
    await prisma.fulfillment.updateMany({
      where: { orderId: order.id },
      data: { salesTransactionId: order.id },
    });

    migrated += 1;
    if (migrated % 50 === 0)
      console.log(`  → Migrated ${migrated} orders so far...`);
  }

  console.log(`🔁 Migration finished. Total migrated: ${migrated}`);
}

migrateOrdersToSales()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
