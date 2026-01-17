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

export async function getUserPermissionMappings(userId: string) {
  if (!userId) return { allowed: [], denied: [] };
  const mappings = await (prisma as any).userPermission.findMany({
    where: { userId },
    include: { permission: true },
  });
  const allowed: string[] = [];
  const denied: string[] = [];
  for (const m of mappings) {
    if (m.isAllowed) allowed.push(m.permission.name);
    else denied.push(m.permission.name);
  }
  return { allowed, denied };
}

/**
 * Compute the effective allowed permissions for a user by starting with role
 * permissions and applying per-user allow/deny overrides.
 */
export async function getEffectivePermissionsForUser(
  userId: string,
  roleId?: string
): Promise<string[]> {
  const base = roleId ? await getPermissionsForRole(roleId) : [];
  const { allowed, denied } = await getUserPermissionMappings(userId);

  const set = new Set<string>(base);
  // Apply explicit allows
  for (const p of allowed) set.add(p);
  // Apply explicit denies
  for (const p of denied) set.delete(p);
  return Array.from(set);
}

export function invalidateRolePermissions(roleId: string) {
  rolePermissionsCache.delete(roleId);
}

// allow permission or array of permissions
export function requirePermission(permission: string | string[]) {
  return async (
    request: FastifyRequest & { user?: any },
    reply: FastifyReply
  ) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    // Prefer permissions attached to user (e.g., from JWT or session). If not
    // present, compute the effective set from role + user overrides.
    // Prefer permissions attached to user (from JWT/session). These are
    // generated with `getEffectivePermissionsForUser` at sign time, so trust
    // them when present. Otherwise compute the effective set from role + overrides.
    let perms: string[] | undefined = user.permissions;
    if (!perms) {
      perms = await getEffectivePermissionsForUser(user.id, user.roleId);
    }

    if (Array.isArray(permission)) {
      // If an array is provided, allow if *any* permission in the array
      // is satisfied (logical OR). This lets callers provide multiple
      // acceptable permissions (e.g., ['ORDERS:CREATE', 'POS:ORDER']).
      for (const perm of permission) {
        if (hasPermission(perms, perm)) {
          return;
        }
      }
      return reply.code(403).send({ error: "Forbidden" });
    }

    if (!hasPermission(perms, permission)) {
      return reply.code(403).send({ error: "Forbidden" });
    }
  };
}

export default {
  hasPermission,
  getPermissionsForRole,
  getUserPermissionMappings,
  getEffectivePermissionsForUser,
  invalidateRolePermissions,
  requirePermission,
};
