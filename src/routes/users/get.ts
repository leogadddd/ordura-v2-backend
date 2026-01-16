import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendNotFound, sendError } from "../../lib/response";

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

    if (!user) return sendNotFound(reply, "User not found");

    return sendSuccess(reply, { user }, "User retrieved successfully");
  } catch (error: any) {
    console.error("Get user error:", error, {
      params: request.params,
      user: request.user,
    });
    return sendError(reply, "Failed to fetch user", 500);
  }
};
