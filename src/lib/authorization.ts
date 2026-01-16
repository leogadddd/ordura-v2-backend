import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "./prisma";

// Simple in-memory cache for role -> permissions mapping. Later we can replace
// this with Redis or an LRU cache if needed.
const rolePermissionsCache = new Map<string, string[]>();

export function hasPermission(
  userPermissions: string[] | undefined,
  required: string
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  if (userPermissions.includes("*")) return true;
  if (userPermissions.includes(required)) return true;

  const [res, action] = required.split(":");
  if (userPermissions.includes(`${res}:*`)) return true;

  // action wildcard across resources: '*:manage'
  if (action && userPermissions.includes(`*:${action}`)) return true;

  // Simple suffix wildcard match - e.g. 'ORDERS:*' should match 'ORDERS:read:123'
  return userPermissions.some(
    (p) => p.endsWith("*") && required.startsWith(p.slice(0, -1))
  );
}

export async function getPermissionsForRole(roleId: string): Promise<string[]> {
  if (!roleId) return [];
  const cached = rolePermissionsCache.get(roleId);
  if (cached) return cached;

  const mappings = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
  const perms = mappings.map((m) => m.permission.name);
  rolePermissionsCache.set(roleId, perms);
  return perms;
}

export function invalidateRolePermissions(roleId: string) {
  rolePermissionsCache.delete(roleId);
}

export function requirePermission(permission: string) {
  return async (
    request: FastifyRequest & { user?: any },
    reply: FastifyReply
  ) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    // Prefer permissions attached to user (e.g., in JWT). Fallback to role lookup.
    let perms: string[] | undefined = user.permissions;
    if (!perms && user.roleId) {
      perms = await getPermissionsForRole(user.roleId);
    }

    if (!hasPermission(perms, permission)) {
      return reply.code(403).send({ error: "Forbidden" });
    }
  };
}

export default {
  hasPermission,
  getPermissionsForRole,
  invalidateRolePermissions,
  requirePermission,
};
