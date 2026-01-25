import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { generateOrderNumber } from "../../util/id-generation";
import { sendSuccess, sendError } from "../../lib/response";

interface CreateOrderBody {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: {
    productId?: string;
    sku?: string;
    name: string;
    category?: string;
    unitPrice: number;
    quantity: number;
    discount?: number;
    taxRate?: number;
  }[];
  subtotal: number;
  orderDiscount?: number;
  discountTotal?: number;
  taxTotal?: number;
  serviceFee?: number;
  deliveryFee?: number;
  grandTotal: number;
  paymentMethod: string;
  amountReceived: number;
  notes?: string;
}

export const createOrder: RouteHandlerMethod = async (request, reply) => {
  try {
    const userId = (request.user as any)?.sub;
    if (!userId) {
      return sendError(reply, "Unauthorized", 401);
    }

    const body = request.body as CreateOrderBody;

    // Validate required fields
    if (!body.items || body.items.length === 0) {
      return sendError(reply, "Order must contain at least one item", 400);
    }

    // Recalculate totals; if payment method is NONE, do not apply tax
    const subtotal = body.subtotal;
    const orderDiscount = (body as any).orderDiscount || 0;
    const serviceFee = body.serviceFee || 0;
    const deliveryFee = body.deliveryFee || 0;

    const discountedSubtotal = subtotal - orderDiscount;

    const isNoPayment = (body.paymentMethod || "").toUpperCase() === "NONE" || (body.grandTotal <= 0);

    // Tax should be computed on subtotal after discounts plus applicable fees
    const taxableBase = Math.max(0, discountedSubtotal + serviceFee + deliveryFee);
    const computedTaxTotal = isNoPayment ? 0 : (body.taxTotal ?? taxableBase * 0.12);
    const computedGrandTotal = taxableBase + computedTaxTotal;

    if (!isNoPayment && body.amountReceived < computedGrandTotal) {
      return sendError(
        reply,
        "Amount received is less than the grand total",
        400
      );
    }

    // Calculate totals from items
    const itemsData = body.items.map((item, index) => ({
      lineNo: index + 1,
      productId: item.productId || null,
      sku: item.sku || null,
      name: item.name,
      category: item.category || null,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      discount: item.discount || 0,
      taxRate: item.taxRate || null,
      taxAmount: item.taxRate
        ? item.unitPrice * item.quantity * item.taxRate
        : 0,
      lineTotal: item.unitPrice * item.quantity - (item.discount || 0),
    }));

    const changeDue = isNoPayment ? 0 : (body.amountReceived - computedGrandTotal);

    // Determine payment status
    const paymentStatus = isNoPayment ? "NO_PAYMENT_NEEDED" : body.amountReceived >= computedGrandTotal ? "PAID" : "PENDING";

    // Base date string used for order number (e.g., ORD-20260108-001)
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
    // Use the simple util to generate a per-day order number atomically.
    // Keep a small retry in case of unlikely P2002 (defensive), but generation
    // is atomic via `order_counters` so collisions should not happen.
    const createMaxAttempts = 3;
    let order: any = null;
    for (let attempt = 1; attempt <= createMaxAttempts; attempt++) {
      const orderNumber = await generateOrderNumber();
      console.debug(
        `Attempt ${attempt}: creating order with orderNumber=${orderNumber}`
      );

      try {
        order = await prisma.order.create({
          data: {
            orderNumber,
            type: "SALE",
            status: "COMPLETED",
            taxMode: "EXCLUSIVE",
            currency: "PHP",
            customerName: body.customerName || null,
            customerPhone: body.customerPhone || null,
            customerEmail: body.customerEmail || null,
            subtotal: subtotal,
            orderDiscount: orderDiscount,
            discountTotal: body.discountTotal || 0,
            serviceFee: serviceFee,
            deliveryFee: deliveryFee,
            taxTotal: computedTaxTotal,
            grandTotal: computedGrandTotal,
            paidTotal: isNoPayment ? 0 : body.amountReceived,
            changeDue,
            dueAmount: Math.max(0, computedGrandTotal - (isNoPayment ? 0 : body.amountReceived)),
            notes: body.notes || null,
            employeeId: userId,
            closedAt: new Date(),
            items: {
              createMany: {
                data: itemsData,
              },
            },
            payments: {
              create: {
                method: body.paymentMethod as any,
                status: paymentStatus as any,
                amount: isNoPayment ? 0 : body.amountReceived,
                currency: "USD",
                receivedAt: new Date(),
              },
            },
          },
          include: {
            employee: {
              select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            items: true,
            payments: true,
          },
        });

        // Also create a SalesTransaction record for the new order to support the
        // new domain model. We keep the legacy Order row for compatibility.
        try {
          await prisma.salesTransaction.create({
            data: {
              id: order.id,
              transactionNumber: order.orderNumber,
              type: order.type as any,
              status: order.status as any,
              taxMode: order.taxMode as any,
              currency: order.currency,
              customerName: order.customerName || null,
              customerPhone: order.customerPhone || null,
              customerEmail: order.customerEmail || null,
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
              notes: order.notes || null,
              employeeId: order.employeeId,
              createdAt: order.createdAt,
              closedAt: order.closedAt,
              items: {
                createMany: {
                  data: order.items.map((it: any) => ({
                    id: it.id,
                    lineNo: it.lineNo,
                    productId: it.productId,
                    sku: it.sku,
                    name: it.name,
                    category: it.category,
                    unitPrice: it.unitPrice,
                    unitCost: it.unitCost,
                    quantity: it.quantity,
                    discount: it.discount,
                    taxRate: it.taxRate,
                    taxAmount: it.taxAmount,
                    lineTotal: it.lineTotal,
                    notes: it.notes,
                    createdAt: it.createdAt,
                  })),
                },
              },
            },
          });

          // Link existing payments and fulfillments to the new SalesTransaction
          await prisma.payment.updateMany({
            where: { orderId: order.id },
            data: { salesTransactionId: order.id },
          });
          await prisma.fulfillment.updateMany({
            where: { orderId: order.id },
            data: { salesTransactionId: order.id },
          });
        } catch (e) {
          // Don't fail the entire order create flow if the SalesTransaction write fails;
          // log and proceed — we'll have a migration/retry path.
          console.error(
            "Failed to create SalesTransaction for order",
            order.id,
            e
          );
        }

        break; // success
      } catch (err: any) {
        if (err?.code === "P2002" && err?.meta?.modelName === "Order") {
          console.warn(
            `Order create attempt ${attempt} failed with P2002 for orderNumber=${orderNumber}, retrying...`
          );
          if (attempt === createMaxAttempts) throw err;
          await new Promise((res) => setTimeout(res, 30 * attempt));
          continue;
        }
        throw err;
      }
    }

    return sendSuccess(reply, order, "Order created successfully", 201);
  } catch (error: any) {
    console.error("Create order error:", error, {
      body: request.body,
      user: request.user,
    });
    return sendError(reply, "Failed to create order", 500);
  }
};
