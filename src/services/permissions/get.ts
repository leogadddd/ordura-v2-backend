import { prisma } from "../../lib/prisma";

export async function getPermission(id: string) {
  return prisma.permission.findUnique({ where: { id } });
}
