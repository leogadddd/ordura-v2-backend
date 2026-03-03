import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import {
  sendSuccess,
  sendConflict,
  sendError,
  sendValidationError,
} from "../../lib/response";
import { requireAuthCookie } from "../../lib/authentication";
import { sanitizeInput } from "../../util/sanitize";

interface UpdateProfileBody {
  firstName?: string;
  lastName?: string;
  email?: string;
}

function isValidEmail(email: string) {
  // intentionally simple; keep server-side validation lightweight
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function updateProfileRoute(server: FastifyInstance) {
  server.put<{ Body: UpdateProfileBody }>(
    "/update-profile",
    {
      onRequest: requireAuthCookie(server),
    },
    async (
      request: FastifyRequest<{ Body: UpdateProfileBody }>,
      reply: FastifyReply,
    ) => {
      try {
        const { sub } = request.user as any;

        const body = sanitizeInput<UpdateProfileBody>(request.body, {
          allowedFields: ["firstName", "lastName", "email"],
          trimStrings: true,
          removeEmpty: true,
        });

        if (!body.firstName && !body.lastName && !body.email) {
          return sendValidationError(reply, {
            _errors: ["Provide at least one field to update."],
          });
        }

        if (body.email && !isValidEmail(body.email)) {
          return sendValidationError(reply, {
            email: ["Invalid email address."],
          });
        }

        const existing = await prisma.commonUser.findUnique({
          where: { id: sub },
          select: { id: true, email: true },
        });

        if (!existing) {
          return sendError(reply, "User not found", 404);
        }

        if (body.email && body.email !== existing.email) {
          const emailInUse = await prisma.commonUser.findFirst({
            where: { email: body.email, NOT: { id: sub } },
            select: { id: true },
          });
          if (emailInUse) {
            return sendConflict(reply, "Email already in use");
          }
        }

        const updated = await prisma.commonUser.update({
          where: { id: sub },
          data: {
            ...(body.firstName !== undefined
              ? { firstName: body.firstName }
              : {}),
            ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
            ...(body.email !== undefined ? { email: body.email } : {}),
          },
          include: {
            roleDetails: {
              select: { id: true, name: true },
            },
          },
        });

        const effectivePermissions = await (
          await import("../../services/permissions/getPermissionsById")
        ).getPermissionsByUserId(updated.id);

        const safeUser = {
          id: updated.id,
          email: updated.email,
          username: updated.username,
          firstName: updated.firstName,
          lastName: updated.lastName,
          role: updated.roleDetails
            ? { id: updated.roleDetails.id, name: updated.roleDetails.name }
            : null,
          permissions: effectivePermissions,
        };

        return sendSuccess(reply, safeUser, "Profile updated");
      } catch (error) {
        console.error("Update profile error:", error, {
          userId: (request.user as any)?.sub,
        });
        return sendError(reply, "Internal server error", 500);
      }
    },
  );
}
