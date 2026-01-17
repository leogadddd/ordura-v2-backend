import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";
import {
  getPermissionsForRole,
  getEffectivePermissionsForUser,
  hasPermission,
} from "../../lib/authorization";

interface ListUsersQuery {
  page?: string;
  limit?: string;
  roleId?: string;
  isActive?: string;
  search?: string;
}

export const getUsers: RouteHandlerMethod = async (request, reply) => {
  try {
    const {
      page = "1",
      limit = "50",
      roleId,
      isActive,
      search,
    } = request.query as ListUsersQuery;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (roleId) where.roleId = roleId;
    if (isActive === "true") where.isActive = true;
    if (isActive === "false") where.isActive = false;

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.commonUser.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
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
      }),
      prisma.commonUser.count({ where }),
    ]);

    // Determine viewer permissions (from JWT if present, else compute)
    let viewerPerms: string[] | undefined = undefined;
    try {
      const viewer = request.user as any;
      viewerPerms = viewer?.permissions;
      if (!viewerPerms) {
        viewerPerms = await getEffectivePermissionsForUser(
          viewer?.sub,
          viewer?.roleId
        );
      }
    } catch {
      viewerPerms = [];
    }

    // Fetch role permissions for all roles present in this page (uses internal cache)
    const roleIds = Array.from(
      new Set(users.map((u) => u.roleId).filter((v): v is string => Boolean(v)))
    );
    const rolePermMap: Record<string, string[]> = {};
    await Promise.all(
      roleIds.map(async (rid) => {
        rolePermMap[rid] = await getPermissionsForRole(rid);
      })
    );

    // Attach extra info per user (rolePermissions, canEdit, canEditRole)
    const enhanced = users.map((u) => {
      const rolePerms = u.roleId ? rolePermMap[u.roleId] || [] : [];
      const canEdit =
        (request.user as any)?.sub === u.id ||
        hasPermission(viewerPerms, "USERS:edit");
      const canEditRole = hasPermission(viewerPerms, "ROLES:edit");
      return { ...u, rolePermissions: rolePerms, canEdit, canEditRole };
    });

    return sendSuccess(
      reply,
      {
        items: enhanced,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      "Users retrieved successfully"
    );
  } catch (error: any) {
    console.error("List users error:", error, {
      query: request.query,
      user: request.user,
    });
    return sendError(reply, "Failed to fetch users", 500);
  }
};
