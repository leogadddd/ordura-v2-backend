import { prisma } from "../../lib/prisma";

export async function deleteManyPermissions(ids: string[]) {
  if (!Array.isArray(ids) || ids.length === 0) return { deleted: 0 };
  const res = await prisma.permission.deleteMany({
    where: { id: { in: ids } },
  });
  return { deleted: res.count };
}
