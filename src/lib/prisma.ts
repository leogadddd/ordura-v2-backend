import { PrismaClient } from "../../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: ["query", "info", "warn", "error"],
});

// Prevent deletion of protected roles at application level (if Prisma middleware is supported)
const pAny = prisma as any;
if (typeof pAny.$use === "function") {
  pAny.$use(async (params: any, next: any) => {
    // Only act on Role delete operations
    if (
      params.model === "Role" &&
      (params.action === "delete" || params.action === "deleteMany")
    ) {
      try {
        if (params.action === "delete") {
          const where = params.args?.where;
          const role = await prisma.role.findUnique({ where });
          if (role && (role.isProtected || role.name === "Administrator")) {
            throw new Error("Cannot delete protected role");
          }
        } else if (params.action === "deleteMany") {
          const where = params.args?.where ?? {};
          const roles = await prisma.role.findMany({ where });
          if (roles.some((r) => r.isProtected || r.name === "Administrator")) {
            throw new Error("Cannot delete protected role(s)");
          }
        }
      } catch (err) {
        // Re-throw to abort the operation
        throw err;
      }
    }

    return next(params);
  });
} else {
  console.warn(
    "Prisma client does not support $use middleware in this environment; relying on route guards and DB trigger to protect roles."
  );
}
