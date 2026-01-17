import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendNotFound, sendError } from "../../lib/response";
import {
  getPermissionsForRole,
  getUserPermissionMappings,
  getEffectivePermissionsForUser,
  hasPermission,
} from "../../lib/authorization";

interface GetUserParams {
  id: string;
}

export const getUser: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as GetUserParams;

    const user = await prisma.commonUser.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        roleDetails: { select: { id: true, name: true } },
      },
    });

    // Fetch per-user overrides separately
    const userPerms = await (prisma as any).userPermission.findMany({
      where: { userId: id },
      select: { permission: { select: { name: true } }, isAllowed: true },
    });

    if (!user) return sendNotFound(reply, "User not found");

    // Normalize user permissions into a nicer shape for the client
    const perms = (userPerms || []).map((p: any) => ({
      name: p.permission.name,
      isAllowed: p.isAllowed,
    }));

    // Role-level permissions for the target user
    const rolePermissions = user?.roleId
      ? await getPermissionsForRole(user.roleId)
      : [];

    // Effective permissions for the target user (role + overrides)
    const effective = await getEffectivePermissionsForUser(id, user?.roleId);

    // Determine viewer permissions (from JWT if available, otherwise compute)
    let viewerPerms: string[] | undefined = undefined;
    try {
      const viewer = request.user as any;
      viewerPerms = viewer?.permissions;
      if (!viewerPerms) {
        // compute from DB if not present on JWT/session
        viewerPerms = await getEffectivePermissionsForUser(
          viewer?.sub,
          viewer?.roleId
        );
      }
    } catch {
      viewerPerms = [];
    }

    // Decide whether the current viewer can edit this user or edit roles
    const canEdit =
      (request.user as any)?.sub === id ||
      hasPermission(viewerPerms, "USERS:edit");
    const canEditRole = hasPermission(viewerPerms, "ROLES:edit");

    const out = {
      ...user,
      permissions: perms,
      rolePermissions,
      effectivePermissions: effective,
      canEdit,
      canEditRole,
    };

    return sendSuccess(reply, { user: out }, "User retrieved successfully");
  } catch (error: any) {
    console.error("Get user error:", error, {
      params: request.params,
      user: request.user,
    });
    return sendError(reply, "Failed to fetch user", 500);
  }
};
