import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
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

    // Generate order number (e.g., ORD-20260108-001)
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const count = await prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(new Date().toDateString()),
          lt: new Date(new Date().toDateString() + " 23:59:59"),
        },
      },
    });
    const orderNumber = `ORD-${date}-${String(count + 1).padStart(3, "0")}`;

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

    // Create order with items and payment
    const order = await prisma.order.create({
      data: {
        orderNumber,
        type: "SALE",
        status: "COMPLETED",
        taxMode: "EXCLUSIVE",
        currency: "USD",
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

    return sendSuccess(reply, order, "Order created successfully", 201);
  } catch (error: any) {
    console.error("Create order error:", error, {
      body: request.body,
      user: request.user,
    });
    return sendError(reply, "Failed to create order", 500);
  }
};
