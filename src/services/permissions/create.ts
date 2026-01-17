import { prisma } from "../../lib/prisma";

export interface CreatePermissionInput {
  name: string;
  description?: string;
}

export async function createPermission(input: CreatePermissionInput) {
  const name = String(input.name || "").trim();
  if (!name) throw new Error("Permission name is required");

  const existing = await prisma.permission.findUnique({ where: { name } });
  if (existing) throw new Error("Permission already exists");

  return prisma.permission.create({
    data: { name, description: input.description },
  });
}
