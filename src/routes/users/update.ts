import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import {
  sendSuccess,
  sendNotFound,
  sendConflict,
  sendError,
  sendValidationError,
} from "../../lib/response";
import { sanitizeInput } from "../../util/sanitize";

interface UpdateUserParams {
  id: string;
}

interface UpdateUserBody {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  isActive?: boolean;
  // Optional per-user permission overrides
  permissions?: { name: string; isAllowed: boolean }[];
}

export const updateUser: RouteHandlerMethod = async (request, reply) => {
  try {
    const { id } = request.params as UpdateUserParams;
    const body = sanitizeInput<UpdateUserBody>(request.body, {
      allowedFields: [
        "email",
        "username",
        "firstName",
        "lastName",
        "roleId",
        "isActive",
        "permissions",
      ],
      trimStrings: true,
      removeEmpty: true,
      parseBooleans: ["isActive"],
    });

    const existing = await prisma.commonUser.findUnique({ where: { id } });
    if (!existing) return sendNotFound(reply, "User not found");

    // Disallow password updates via this endpoint. Use the change-password endpoint instead.
    if ((request.body as any).password) {
      return sendValidationError(reply, {
        password: ["Use the change password endpoint to update passwords."],
      });
    }

    // If changing email or username, ensure uniqueness
    if (body.email || body.username) {
      const conflict = await prisma.commonUser.findFirst({
        where: {
          OR: [
            body.email ? { email: body.email } : undefined,
            body.username ? { username: body.username } : undefined,
          ].filter(Boolean) as any,
          AND: { id: { not: id } },
        },
      });
      if (conflict)
        return sendConflict(reply, "Email or username already in use");
    }

    // Only allow specific updatable scalar fields to be passed to Prisma.
    const allowedFields = [
      "email",
      "username",
      "firstName",
      "lastName",
      "roleId",
      "isActive",
    ];

    const data: any = {};
    for (const f of allowedFields) {
      if ((body as any)[f] !== undefined) {
        // allow explicit null for roleId to unset a role
        if (f === "roleId" && (body as any)[f] === "") {
          data.roleId = null;
        } else {
          data[f] = (body as any)[f];
        }
      }
    }

    const updated = await prisma.commonUser.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        roleId: true,
        isActive: true,
        roleDetails: { select: { id: true, name: true } },
      },
    });

    // If per-user permission overrides were provided, apply them now.
    if (Array.isArray((body as any).permissions)) {
      const incoming = (body as any).permissions as {
        name: string;
        isAllowed: boolean;
      }[];
      const names = incoming.map((p) => p.name);
      const perms = await prisma.permission.findMany({
        where: { name: { in: names } },
      });
      const foundNames = new Set(perms.map((p) => p.name));
      const missing = names.filter((n) => !foundNames.has(n));
      if (missing.length > 0) {
        return sendValidationError(reply, {
          permissions: [`Unknown permission(s): ${missing.join(", ")}`],
        });
      }

      const permissionIdByName = new Map(perms.map((p) => [p.name, p.id]));

      // Delete any existing mappings for the provided permissions, then insert the new ones
      const permissionIds = perms.map((p) => p.id);
      await prisma.$transaction([
        (prisma as any).userPermission.deleteMany({
          where: { userId: id, permissionId: { in: permissionIds } },
        }),
        (prisma as any).userPermission.createMany({
          data: incoming.map((p) => ({
            userId: id,
            permissionId: permissionIdByName.get(p.name)!,
            isAllowed: p.isAllowed,
          })),
          skipDuplicates: true,
        }),
      ]);
    }

    return sendSuccess(reply, { user: updated }, "User updated successfully");
  } catch (error: any) {
    console.error("Update user error:", error, {
      params: request.params,
      body: request.body,
      user: request.user,
    });
    return sendError(reply, "Failed to update user", 500);
  }
};
