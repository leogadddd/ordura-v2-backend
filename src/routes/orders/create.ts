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
  discountTotal?: number;
  taxTotal?: number;
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

    if (body.amountReceived < body.grandTotal) {
      return sendError(
        reply,
        "Amount received is less than the grand total",
        400
      );
    }

    // Base date string used for order number (e.g., ORD-20260108-001)
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "");

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

    const changeDue = body.amountReceived - body.grandTotal;

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
            subtotal: body.subtotal,
            discountTotal: body.discountTotal || 0,
            taxTotal: body.taxTotal || 0,
            grandTotal: body.grandTotal,
            paidTotal: body.amountReceived,
            changeDue,
            dueAmount: 0, // Fully paid
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
                status: "PAID",
                amount: body.amountReceived,
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
