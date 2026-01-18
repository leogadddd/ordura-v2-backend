import { prisma } from "../lib/prisma";
import { createOrder } from "../routes/orders/create";

async function test() {
  const user = await prisma.commonUser.findFirst();
  if (!user) {
    console.error(
      "No user found to perform test-order creation. Run seed:users first."
    );
    process.exit(1);
  }

  const mockReq: any = {
    user: { sub: user.id },
    body: {
      customerName: "Test Customer",
      customerPhone: "09171234567",
      items: [
        { name: "Coffee", unitPrice: 120, quantity: 2 },
        { name: "Bread", unitPrice: 80, quantity: 1 },
      ],
      subtotal: 320,
      discountTotal: 0,
      taxTotal: 0,
      grandTotal: 320,
      paymentMethod: "CASH",
      amountReceived: 500,
      notes: "Test order",
    },
  };

  const mockReply: any = {
    statusCode: 200,
    body: null,
    code(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: any) {
      this.body = payload;
      return this;
    },
  };

  try {
    await (createOrder as any)(mockReq, mockReply);
    console.log("Create Order response:", mockReply.statusCode, mockReply.body);
    const createdOrderId = mockReply.body?.data?.id;
    if (!createdOrderId) {
      console.error("Failed to get created order id from response");
      process.exit(1);
    }

    const st = await prisma.salesTransaction.findUnique({
      where: { id: createdOrderId },
    });
    if (!st) {
      console.error("SalesTransaction was not created for the new order");
      process.exit(1);
    }
    console.log("SalesTransaction created:", st.id, st.transactionNumber);

    const payments = await prisma.payment.findMany({
      where: { orderId: createdOrderId },
    });
    console.log("Payments created:", payments.length);
    const linkedPayments = await prisma.payment.findMany({
      where: { salesTransactionId: createdOrderId },
    });
    console.log("Payments linked to SalesTransaction:", linkedPayments.length);

    process.exit(0);
  } catch (err: any) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

test();
