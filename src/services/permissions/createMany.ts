import { prisma } from "../../lib/prisma";

export interface CreateManyPermissionInput {
  name: string;
  description?: string;
}

export async function createManyPermissions(rows: CreateManyPermissionInput[]) {
  const data = (rows || [])
    .map((r) => ({
      name: String(r.name || "").trim(),
      description: r.description,
    }))
    .filter((r) => r.name);

  if (data.length === 0) return [];

  await prisma.permission.createMany({ data, skipDuplicates: true });
  return prisma.permission.findMany({
    where: { name: { in: data.map((d) => d.name) } },
  });
}
