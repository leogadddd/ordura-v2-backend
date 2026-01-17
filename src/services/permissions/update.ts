import { prisma } from "../../lib/prisma";

export interface UpdatePermissionInput {
  name?: string;
  description?: string | null;
}

export async function updatePermission(
  id: string,
  data: UpdatePermissionInput
) {
  const existing = await prisma.permission.findUnique({ where: { id } });
  if (!existing) return null;

  if (data.name && data.name !== existing.name) {
    const conflict = await prisma.permission.findUnique({
      where: { name: data.name },
    });
    if (conflict) throw new Error("Permission name already exists");
  }

  return prisma.permission.update({ where: { id }, data: { ...data } });
}
