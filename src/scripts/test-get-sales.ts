import { prisma } from "../lib/prisma";
import { getSalesTransaction } from "../routes/transactions/sales/get";

async function test() {
  const tx = await prisma.salesTransaction.findFirst();
  if (!tx) {
    console.error("No sales transaction found to test");
    process.exit(1);
  }

  const mockReq: any = { params: { id: tx.id }, user: { sub: "test" } };
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
    await (getSalesTransaction as any)(mockReq, mockReply);
    console.log(
      "Get SalesTransaction response:",
      mockReply.statusCode,
      mockReply.body?.message
    );
    process.exit(0);
  } catch (err: any) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

test();
